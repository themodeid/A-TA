import { pool } from "../../../config/database";

export const executePayrollProcess = async (periodeId: number) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Lock Row & Cek Status
    const periodeRes = await client.query(
      `SELECT status FROM tb_periode WHERE id_periode = $1 AND deleted_at IS NULL FOR UPDATE;`,
      [periodeId],
    );
    const currentStatus = periodeRes.rows[0]?.status;

    if (!currentStatus)
      throw new Error(`Periode dengan ID ${periodeId} tidak ditemukan.`);
    if (currentStatus !== "Disetujui") {
      throw new Error(
        `Gagal Memproses Gaji: Status periode saat ini '${currentStatus}'. Wajib 'Disetujui'.`,
      );
    }

    // 2. Ambil Rekap Data Pegawai + Tunjangan + Potongan secara Aggregated
    const mainQuery = `
      SELECT 
        p.id_pegawai,
        p.nama_dan_tanggal_lahir,
        COALESCE(p.gaji_pokok_dasar, 0) AS gaji_pokok_dasar,
        j.nama_jabatan,
        COALESCE(j.tunjangan_jabatan_struktural, 0) AS tunj_struktural,
        g.nama_golongan,
        COALESCE(tb.honor_bulan, 0) AS honor_bulan,
        (
          SELECT COALESCE(json_agg(json_build_object(
            'nama', t.nama_tunjangan,
            'kode', t.formula_type,
            'nilai', td.nilai_terhitung
          )), '[]'::json)
          FROM tb_tunjangan_bulanan_detail td
          JOIN tb_tunjangan t ON td.id_tunjangan = t.id_tunjangan
          WHERE td.id_periode = $1 AND td.id_pegawai = p.id_pegawai
        ) AS list_tunjangan,
        (
          SELECT COALESCE(json_agg(json_build_object(
            'nama', m.nama_potongan,
            'kode', m.kode_potongan,
            'nilai', pd.nilai_potongan
          )), '[]'::json)
          FROM tb_potongan_bulanan_detail pd
          JOIN tb_master_potongan m ON pd.id_master_potongan = m.id_master_potongan
          WHERE pd.id_periode = $1 AND pd.id_pegawai = p.id_pegawai
        ) AS list_potongan
      FROM tb_pegawai p
      LEFT JOIN tb_jabatan j ON p.id_jabatan = j.id_jabatan
      LEFT JOIN tb_golongan g ON p.id_golongan = g.id_golongan
      LEFT JOIN tb_tunjangan_bulanan tb ON tb.id_periode = $1 AND tb.id_pegawai = p.id_pegawai
      WHERE p.deleted_at IS NULL;
    `;

    const { rows: daftarPegawai } = await client.query(mainQuery, [periodeId]);
    if (daftarPegawai.length === 0)
      throw new Error("Tidak ada data pegawai aktif.");

    // Clean up data rekap lama jika re-run
    await client.query(
      `DELETE FROM tb_rekap_gaji_detail WHERE id_rekap IN (SELECT id_rekap FROM tb_rekap_gaji WHERE id_periode = $1)`,
      [periodeId],
    );
    await client.query(`DELETE FROM tb_rekap_gaji WHERE id_periode = $1`, [
      periodeId,
    ]);

    // 3. Process Calculation & Insert
    for (const emp of daftarPegawai) {
      const gajiPokok = parseFloat(emp.gaji_pokok_dasar);
      const tunjStruktural = parseFloat(emp.tunj_struktural);
      const honorBulan = parseFloat(emp.honor_bulan);

      const tunjDetails = emp.list_tunjangan || [];
      const potDetails = emp.list_potongan || [];

      const totalTunjanganVar = tunjDetails.reduce(
        (sum: number, item: any) => sum + parseFloat(item.nilai || 0),
        0,
      );
      const totalBruto =
        gajiPokok + tunjStruktural + totalTunjanganVar + honorBulan;

      const totalPotongan = potDetails.reduce(
        (sum: number, item: any) => sum + parseFloat(item.nilai || 0),
        0,
      );
      const totalPenerimaanClean = totalBruto - totalPotongan;

      // Insert Header
      const rekapRes = await client.query(
        `INSERT INTO tb_rekap_gaji (
          id_periode, id_pegawai, jabatan_snapshot, pangkat_golongan_snapshot,
          gaji_pokok_snapshot, total_penghasilan_bruto, total_potongan, total_penerimaan_clean
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id_rekap;`,
        [
          periodeId,
          emp.id_pegawai,
          emp.nama_jabatan || "-",
          emp.nama_golongan || "-",
          gajiPokok,
          totalBruto,
          totalPotongan,
          totalPenerimaanClean,
        ],
      );
      const idRekap = rekapRes.rows[0].id_rekap;

      // Insert Details
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
          [idRekap, t.nama, t.nilai, t.kode || "UMUM"],
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
          [idRekap, p.nama, p.nilai, p.kode],
        );
      }
    }

    // 4. Set Status Periode 'Selesai'
    const updatedPeriodeRes = await client.query(
      `UPDATE tb_periode SET status = 'Selesai' WHERE id_periode = $1 RETURNING *;`,
      [periodeId],
    );

    await client.query("COMMIT");
    return updatedPeriodeRes.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
