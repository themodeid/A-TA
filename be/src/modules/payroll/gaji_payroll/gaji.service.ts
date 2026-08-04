import { pool } from "../../../config/database";

export const executePayrollProcess = async (periodeId: number) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Cek Status Periode (Wajib 'Disetujui') & Lock Row
    const periodeQuery = `
      SELECT status FROM tb_periode 
      WHERE id_periode = $1 AND deleted_at IS NULL 
      FOR UPDATE;
    `;
    const periodeRes = await client.query(periodeQuery, [periodeId]);
    const currentStatus = periodeRes.rows[0]?.status;

    if (!currentStatus) {
      throw new Error(`Periode dengan ID ${periodeId} tidak ditemukan.`);
    }

    if (currentStatus !== "Disetujui") {
      throw new Error(
        `Gagal Memproses Gaji: Status periode saat ini '${currentStatus}'. Hanya periode berstatus 'Disetujui' yang dapat diproses.`,
      );
    }

    // 2. Ambil seluruh Pegawai Aktif beserta Jabatan & Golongan
    const pegawaiQuery = `
      SELECT 
        p.id_pegawai,
        p.nama_dan_tanggal_lahir,
        p.gaji_pokok_dasar,
        j.nama_jabatan,
        COALESCE(j.tunjangan_jabatan_struktural, 0) AS tunj_struktural,
        g.nama_golongan
      FROM tb_pegawai p
      LEFT JOIN tb_jabatan j ON p.id_jabatan = j.id_jabatan
      LEFT JOIN tb_golongan g ON p.id_golongan = g.id_golongan
      WHERE p.deleted_at IS NULL;
    `;
    const pegawaiRes = await client.query(pegawaiQuery);
    const daftarPegawai = pegawaiRes.rows;

    if (daftarPegawai.length === 0) {
      throw new Error("Tidak ada data pegawai aktif untuk diproses.");
    }

    // Clean up rekap lama untuk periode ini (jika ada re-run)
    await client.query(
      `DELETE FROM tb_rekap_gaji_detail WHERE id_rekap IN (SELECT id_rekap FROM tb_rekap_gaji WHERE id_periode = $1)`,
      [periodeId],
    );
    await client.query(`DELETE FROM tb_rekap_gaji WHERE id_periode = $1`, [
      periodeId,
    ]);

    // 3. Looping Kalkulasi & Snapshot per Pegawai
    for (const emp of daftarPegawai) {
      const gajiPokok = parseFloat(emp.gaji_pokok_dasar) || 0;
      const tunjStruktural = parseFloat(emp.tunj_struktural) || 0;

      // A. Ambil Tunjangan Header & Detail Variabel
      const tunjHeaderQuery = `
        SELECT id_tunjangan_bulanan, honor_bulan FROM tb_tunjangan_bulanan 
        WHERE id_periode = $1 AND id_pegawai = $2;
      `;
      const tunjHeaderRes = await client.query(tunjHeaderQuery, [
        periodeId,
        emp.id_pegawai,
      ]);
      const tunjHeader = tunjHeaderRes.rows[0];
      const honorBulan = parseFloat(tunjHeader?.honor_bulan || 0);

      let tunjDetails: any[] = [];
      if (tunjHeader) {
        const tunjDetailQuery = `
          SELECT t.nama_tunjangan, t.formula_type AS kode_kondisi, td.nilai_terhitung
          FROM tb_tunjangan_bulanan_detail td
          JOIN tb_tunjangan t ON td.id_tunjangan = t.id_tunjangan
          WHERE td.id_periode = $1 AND td.id_pegawai = $2;
        `;
        const tunjDetailRes = await client.query(tunjDetailQuery, [
          periodeId,
          emp.id_pegawai,
        ]);
        tunjDetails = tunjDetailRes.rows;
      }

      // Hitung Total Tunjangan
      let totalTunjanganVar = tunjDetails.reduce(
        (sum, item) => sum + parseFloat(item.nilai_terhitung || 0),
        0,
      );
      const totalBruto =
        gajiPokok + tunjStruktural + totalTunjanganVar + honorBulan;

      // B. Ambil Potongan Header & Detail
      const potHeaderQuery = `
        SELECT id_potongan_bulanan FROM tb_potongan_bulanan 
        WHERE id_periode = $1 AND id_pegawai = $2;
      `;
      const potHeaderRes = await client.query(potHeaderQuery, [
        periodeId,
        emp.id_pegawai,
      ]);
      const potHeader = potHeaderRes.rows[0];

      let potDetails: any[] = [];
      if (potHeader) {
        const potDetailQuery = `
          SELECT m.nama_potongan, m.kode_potongan, pd.nilai_potongan
          FROM tb_potongan_bulanan_detail pd
          JOIN tb_master_potongan m ON pd.id_master_potongan = m.id_master_potongan
          WHERE pd.id_periode = $1 AND pd.id_pegawai = $2;
        `;
        const potDetailRes = await client.query(potDetailQuery, [
          periodeId,
          emp.id_pegawai,
        ]);
        potDetails = potDetailRes.rows;
      }

      const totalPotongan = potDetails.reduce(
        (sum, item) => sum + parseFloat(item.nilai_potongan || 0),
        0,
      );

      // C. Hitung Netto
      const totalPenerimaanClean = totalBruto - totalPotongan;

      // D. Insert Header Rekap Gaji (Snapshot Principal)
      const insertRekapQuery = `
        INSERT INTO tb_rekap_gaji (
          id_periode, id_pegawai, jabatan_snapshot, pangkat_golongan_snapshot,
          gaji_pokok_snapshot, total_penghasilan_bruto, total_potongan, total_penerimaan_clean
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id_rekap;
      `;
      const rekapRes = await client.query(insertRekapQuery, [
        periodeId,
        emp.id_pegawai,
        emp.nama_jabatan || "-",
        emp.nama_golongan || "-",
        gajiPokok,
        totalBruto,
        totalPotongan,
        totalPenerimaanClean,
      ]);
      const idRekap = rekapRes.rows[0].id_rekap;

      // E. Insert Breakdown Detail (Snapshot Components)
      if (tunjStruktural > 0) {
        await client.query(
          `INSERT INTO tb_rekap_gaji_detail (id_rekap, jenis_komponen, nama_komponen_snapshot, nilai_snapshot, kode_kondisi_snapshot)
           VALUES ($1, 'TUNJANGAN', $2, $3, 'TUNJ_STRUKTURAL')`,
          [idRekap, `Tunjangan Struktural ${emp.nama_jabatan}`, tunjStruktural],
        );
      }

      for (const t of tunjDetails) {
        await client.query(
          `INSERT INTO tb_rekap_gaji_detail (id_rekap, jenis_komponen, nama_komponen_snapshot, nilai_snapshot, kode_kondisi_snapshot)
           VALUES ($1, 'TUNJANGAN', $2, $3, $4)`,
          [
            idRekap,
            t.nama_tunjangan,
            t.nilai_terhitung,
            t.kode_kondisi || "UMUM",
          ],
        );
      }

      if (honorBulan > 0) {
        await client.query(
          `INSERT INTO tb_rekap_gaji_detail (id_rekap, jenis_komponen, nama_komponen_snapshot, nilai_snapshot, kode_kondisi_snapshot)
           VALUES ($1, 'TUNJANGAN', 'Honor Tambahan Bulan Ini', $2, 'HONOR_BULANAN_MANUAL')`,
          [idRekap, honorBulan],
        );
      }

      for (const p of potDetails) {
        await client.query(
          `INSERT INTO tb_rekap_gaji_detail (id_rekap, jenis_komponen, nama_komponen_snapshot, nilai_snapshot, kode_kondisi_snapshot)
           VALUES ($1, 'POTONGAN', $2, $3, $4)`,
          [idRekap, p.nama_potongan, p.nilai_potongan, p.kode_potongan],
        );
      }
    }

    // 4. Update Status Periode menjadi 'Selesai'
    const updatePeriodeQuery = `
      UPDATE tb_periode 
      SET status = 'Selesai' 
      WHERE id_periode = $1 
      RETURNING *;
    `;
    const updatedPeriodeRes = await client.query(updatePeriodeQuery, [
      periodeId,
    ]);

    await client.query("COMMIT");
    return updatedPeriodeRes.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error pada executePayrollProcess:", error);
    throw error;
  } finally {
    client.release();
  }
};
