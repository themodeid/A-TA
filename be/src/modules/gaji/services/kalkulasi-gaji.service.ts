import { pool } from "../../../config/database";

export const kalkulasiPeriode = async (idPeriode: number): Promise<void> => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Validasi Status Periode
    const { rows: periodeCheck } = await client.query(
      `SELECT status FROM tb_periode WHERE id_periode = $1 AND deleted_at IS NULL`,
      [idPeriode],
    );

    if (periodeCheck.length === 0) throw new Error("Periode tidak ditemukan.");
    if (["Selesai", "Approved"].includes(periodeCheck[0].status)) {
      throw new Error("Gagal kalkulasi! Periode ini sudah dikunci.");
    }

    // 2. Ambil Parameter Master untuk Tunjangan Persentase
    const { rows: masterTunjangan } = await client.query(
      `SELECT kode_kondisi, nilai FROM tb_tunjangan WHERE deleted_at IS NULL`,
    );
    const pctIstri = parseFloat(
      masterTunjangan.find((t) => t.kode_kondisi === "TUNJ_ISTRI")?.nilai ||
        "0.10",
    );
    const pctAnak = parseFloat(
      masterTunjangan.find((t) => t.kode_kondisi === "TUNJ_ANAK")?.nilai ||
        "0.02",
    );
    const tarifWfo = parseFloat(
      masterTunjangan.find((t) => t.kode_kondisi === "TRN_WFO")?.nilai ||
        "30000.00",
    );

    // 3. Ambil Data Utama Pegawai & Absensi
    const dataPegawaiQuery = `
      SELECT 
        p.id_pegawai, p.status_perkawinan, p.jumlah_anak, p.gaji_pokok_dasar,
        j.nama_jabatan, j.tunjangan_jabatan_struktural, g.nama_golongan,
        COALESCE(abs.total_hadir_ops_wfo, 0) as total_hadir_ops_wfo,
        COALESCE(tb.honor_bulan, 0) as honor_bulan_lembur
      FROM tb_pegawai p
      JOIN tb_jabatan j ON p.id_jabatan = j.id_jabatan
      JOIN tb_golongan g ON p.id_golongan = g.id_golongan
      LEFT JOIN tb_absensi_summary abs ON p.id_pegawai = abs.id_pegawai AND abs.id_periode = $1
      LEFT JOIN tb_tunjangan_bulanan tb ON p.id_pegawai = tb.id_pegawai AND tb.id_periode = $1
      WHERE p.deleted_at IS NULL
    `;
    const { rows: daftarPegawai } = await client.query(dataPegawaiQuery, [
      idPeriode,
    ]);

    for (const pegawai of daftarPegawai) {
      const idPegawai = pegawai.id_pegawai;
      const gapok = parseFloat(pegawai.gaji_pokok_dasar);
      const tunjStruktural = parseFloat(pegawai.tunjangan_jabatan_struktural);

      // --- KALKULASI TUNJANGAN (VERTIKAL) ---
      const tIstri = pegawai.status_perkawinan === "K" ? gapok * pctIstri : 0;
      const tAnak = gapok * pctAnak * Math.min(pegawai.jumlah_anak, 3);
      const tTransport = parseInt(pegawai.total_hadir_ops_wfo) * tarifWfo;
      const tLembur = parseFloat(pegawai.honor_bulan_lembur);

      const totalBruto =
        gapok + tunjStruktural + tIstri + tAnak + tTransport + tLembur;

      // Update nilai dinamis ke tabel transaksi detail sebelum snapshot dibuat
      await client.query(
        `UPDATE tb_tunjangan_bulanan_detail SET nilai_terhitung = CASE 
          WHEN id_tunjangan = (SELECT id_tunjangan FROM tb_tunjangan WHERE kode_kondisi = 'TRN_WFO') THEN $3
          WHEN id_tunjangan = (SELECT id_tunjangan FROM tb_tunjangan WHERE kode_kondisi = 'TUNJ_ISTRI') THEN $4
          WHEN id_tunjangan = (SELECT id_tunjangan FROM tb_tunjangan WHERE kode_kondisi = 'TUNJ_ANAK') THEN $5
          ELSE nilai_terhitung
        END WHERE id_periode = $1 AND id_pegawai = $2`,
        [idPeriode, idPegawai, tTransport, tIstri, tAnak],
      );

      // --- KALKULASI POTONGAN (VERTIKAL) ---
      const { rows: potRows } = await client.query(
        `SELECT SUM(nilai_potongan) as total FROM tb_potongan_bulanan_detail WHERE id_periode = $1 AND id_pegawai = $2`,
        [idPeriode, idPegawai],
      );
      const totalPotongan = parseFloat(potRows[0].total || "0");
      const penerimaanBersih = totalBruto - totalPotongan;

      // Update Header Transaksi Potongan
      await client.query(
        `UPDATE tb_potongan_bulanan SET total_potongan_terhitung = $3 WHERE id_periode = $1 AND id_pegawai = $2`,
        [idPeriode, idPegawai, totalPotongan],
      );

      // --- 4. UPSERT MASTER REKAP GAJI ---
      const { rows: rekapRows } = await client.query(
        `
        INSERT INTO tb_rekap_gaji (
          id_periode, id_pegawai, jabatan_snapshot, pangkat_golongan_snapshot, 
          gaji_pokok_snapshot, total_penghasilan_bruto, total_potongan, total_penerimaan_clean
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id_periode, id_pegawai) DO UPDATE SET
          jabatan_snapshot = EXCLUDED.jabatan_snapshot,
          pangkat_golongan_snapshot = EXCLUDED.pangkat_golongan_snapshot,
          gaji_pokok_snapshot = EXCLUDED.gaji_pokok_snapshot,
          total_penghasilan_bruto = EXCLUDED.total_penghasilan_bruto,
          total_potongan = EXCLUDED.total_potongan,
          total_penerimaan_clean = EXCLUDED.total_penerimaan_clean
        RETURNING id_rekap`,
        [
          idPeriode,
          idPegawai,
          pegawai.nama_jabatan,
          pegawai.nama_golongan,
          gapok,
          totalBruto,
          totalPotongan,
          penerimaanBersih,
        ],
      );

      const idRekap = rekapRows[0].id_rekap;

      // Bersihkan snapshot detail lama untuk mencegah duplikasi data
      await client.query(
        `DELETE FROM tb_rekap_gaji_detail WHERE id_rekap = $1`,
        [idRekap],
      );

      // --- 5. SNAPSHOT DETAIL (Memindahkan Data Transaksi Ke Histori) ---

      // A. Masukkan Tunjangan Struktural Jabatan
      if (tunjStruktural > 0) {
        await client.query(
          `INSERT INTO tb_rekap_gaji_detail (id_rekap, jenis_komponen, nama_komponen_snapshot, nilai_snapshot, kode_kondisi_snapshot)
           VALUES ($1, 'TUNJANGAN', 'Tunjangan Struktural Jabatan', $2, 'TUNJ_STRUKTURAL')`,
          [idRekap, tunjStruktural],
        );
      }

      // B. Pindahkan Semua Detail Tunjangan Terhitung dari Transaksi Bulanan
      await client.query(
        `
        INSERT INTO tb_rekap_gaji_detail (id_rekap, jenis_komponen, nama_komponen_snapshot, nilai_snapshot, kode_kondisi_snapshot)
        SELECT $1, 'TUNJANGAN', t.nama_tunjangan, td.nilai_terhitung, t.kode_kondisi
        FROM tb_tunjangan_bulanan_detail td
        JOIN tb_tunjangan t ON td.id_tunjangan = t.id_tunjangan
        WHERE td.id_periode = $2 AND td.id_pegawai = $3 AND td.nilai_terhitung > 0
      `,
        [idRekap, idPeriode, idPegawai],
      );

      // C. Pindahkan Semua Detail Potongan Terhitung
      await client.query(
        `
        INSERT INTO tb_rekap_gaji_detail (id_rekap, jenis_komponen, nama_komponen_snapshot, nilai_snapshot, kode_kondisi_snapshot)
        SELECT $1, 'POTONGAN', m.nama_potongan, pd.nilai_potongan, m.kode_potongan
        FROM tb_potongan_bulanan_detail pd
        JOIN tb_master_potongan m ON pd.id_master_potongan = m.id_master_potongan
        WHERE pd.id_periode = $2 AND pd.id_pegawai = $3 AND pd.nilai_potongan > 0
      `,
        [idRekap, idPeriode, idPegawai],
      );
    }

    // Ubah status periode menjadi Menunggu Approval
    await client.query(
      `UPDATE tb_periode SET status = 'Menunggu Approval' WHERE id_periode = $1`,
      [idPeriode],
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
