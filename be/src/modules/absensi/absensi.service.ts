import { pool } from "../../config/database";

// 2. Mengambil summary absensi pegawai terpilih (Menyesuaikan kolom nama_dan_tanggal_lahir)
export const getAbsensiByPeriode = async (idPeriode: number) => {
  const query = `
    SELECT
      asum.id_absensi_summary,
      p.id_pegawai,
      p.nama_dan_tanggal_lahir,
      j.nama_jabatan,
      g.nama_golongan,
      prd.id_periode,
      prd.bulan_gaji,
      COALESCE(asum.total_hadir_ops_wfo, 0) AS total_hadir_ops_wfo,
      COALESCE(asum.total_hadir_ops_wfh, 0) AS total_hadir_ops_wfh,
      COALESCE(asum.total_izin, 0) AS total_izin,
      COALESCE(asum.total_sakit, 0) AS total_sakit,
      COALESCE(asum.total_alpha, 0) AS total_alpha
    FROM tb_pegawai p
    JOIN tb_periode prd ON prd.id_periode = $1
    LEFT JOIN tb_jabatan j ON p.id_jabatan = j.id_jabatan
    LEFT JOIN tb_golongan g ON p.id_golongan = g.id_golongan
    LEFT JOIN tb_absensi_summary asum 
      ON asum.id_pegawai = p.id_pegawai AND asum.id_periode = prd.id_periode
    WHERE p.deleted_at IS NULL
    ORDER BY p.nama_dan_tanggal_lahir ASC;
  `;

  const result = await pool.query(query, [idPeriode]);
  return result.rows;
};

export const getAllPeriodeTersedia = async () => {
  // Hanya mengambil kolom identitas periode saja, diurutkan dari periode terbaru
  const query = `
    SELECT 
      id_periode, 
      bulan_gaji, 
      status
    FROM tb_periode
    ORDER BY id_periode DESC;
  `;

  const result = await pool.query(query);
  return result.rows;
};

export const getPeriodeById = async (idPeriode: number) => {
  const query = `SELECT id_periode, bulan_gaji, status FROM tb_periode WHERE id_periode = $1;`;
  const result = await pool.query(query, [idPeriode]);
  return result.rows[0] || null;
};

// 3. Ambil Detail Rekap Absensi (Pembersihan kolom gaib id_upload & Penyesuaian nama)
export const getAbsensiById = async (id: number) => {
  const query = `
    SELECT
      asum.id_absensi_summary,
      asum.id_pegawai,
      p.nama_dan_tanggal_lahir, -- Diubah dari p.nama_lengkap
      j.nama_jabatan,
      g.nama_golongan,
      asum.id_periode,
      prd.bulan_gaji,
      prd.status AS status_periode,
      asum.total_hadir_ops_wfo, -- Kolom asum.id_upload dihapus karena tidak ada di DDL
      asum.total_hadir_ops_wfh,
      asum.total_izin,
      asum.total_sakit,
      asum.total_alpha
    FROM tb_absensi_summary asum
    LEFT JOIN tb_pegawai p ON asum.id_pegawai = p.id_pegawai
    LEFT JOIN tb_jabatan j ON p.id_jabatan = j.id_jabatan
    LEFT JOIN tb_golongan g ON p.id_golongan = g.id_golongan
    LEFT JOIN tb_periode prd ON asum.id_periode = prd.id_periode
    WHERE asum.id_absensi_summary = $1 AND p.deleted_at IS NULL;
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

export const createAbsensiBulk = async (
  idPeriode: number,
  dataAbsenList: any[],
) => {
  // 1. Filter data yang valid
  const validDataList = dataAbsenList.filter(
    (data) => data && data.id_pegawai && !isNaN(Number(data.id_pegawai)),
  );

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 2. Ambil jumlah hari maksimal periode ini
    const periodeResult = await client.query(
      `SELECT (tanggal_akhir - tanggal_awal + 1) AS jumlah_hari 
       FROM tb_periode WHERE id_periode = $1`,
      [idPeriode],
    );
    const jumlahHariPeriode = periodeResult.rows[0]?.jumlah_hari;

    if (!jumlahHariPeriode) {
      throw new Error(
        `Periode ID ${idPeriode} tidak ditemukan atau tanggal periode belum diset.`,
      );
    }

    // 3. Validasi tiap pegawai: total tidak boleh melebihi jumlah hari periode
    for (const data of validDataList) {
      const total =
        Number(data.total_hadir_ops_wfo || 0) +
        Number(data.total_hadir_ops_wfh || 0) +
        Number(data.total_izin || 0) +
        Number(data.total_sakit || 0) +
        Number(data.total_alpha || 0);

      if (total > jumlahHariPeriode) {
        throw new Error(
          `Pegawai ID ${data.id_pegawai}: total hari (${total}) melebihi jumlah hari periode (${jumlahHariPeriode}).`,
        );
      }
    }

    // 4. Exec Upsert Bulk jika ada data valid
    if (validDataList.length > 0) {
      const values: any[] = [];
      const valuePlaceholders = validDataList
        .map((data, index) => {
          const offset = index * 7;

          values.push(
            idPeriode,
            Number(data.id_pegawai),
            Number(data.total_hadir_ops_wfo || 0),
            Number(data.total_hadir_ops_wfh || 0),
            Number(data.total_izin || 0),
            Number(data.total_sakit || 0),
            Number(data.total_alpha || 0),
          );

          return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})`;
        })
        .join(", ");

      const insertQuery = `
        INSERT INTO tb_absensi_summary (
          id_periode, id_pegawai, total_hadir_ops_wfo, 
          total_hadir_ops_wfh, total_izin, total_sakit, total_alpha
        ) VALUES ${valuePlaceholders}
        ON CONFLICT (id_periode, id_pegawai) DO UPDATE SET
          total_hadir_ops_wfo = EXCLUDED.total_hadir_ops_wfo,
          total_hadir_ops_wfh = EXCLUDED.total_hadir_ops_wfh,
          total_izin = EXCLUDED.total_izin,
          total_sakit = EXCLUDED.total_sakit,
          total_alpha = EXCLUDED.total_alpha
        RETURNING *;
      `;

      await client.query(insertQuery, values);
    }

    // 5. Ambil data gabungan terbaru beserta info periode
    const selectQuery = `
      SELECT 
        asum.*,
        prd.bulan_gaji AS nama_periode,
        prd.bulan_gaji AS bulan_tahun
      FROM tb_absensi_summary asum
      LEFT JOIN tb_periode prd ON asum.id_periode = prd.id_periode
      WHERE asum.id_periode = $1;
    `;

    const result = await client.query(selectQuery, [idPeriode]);

    await client.query("COMMIT");
    return result.rows;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

// 1b. Single Create Absensi (Jika ada pegawai susulan yang baru masuk tengah bulan)
export const createAbsensiSingle = async (data: any) => {
  const query = `
    INSERT INTO tb_absensi_summary (
      id_periode, id_pegawai, total_hadir_ops_wfo, 
      total_hadir_ops_wfh, total_izin, total_sakit, total_alpha
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (id_periode, id_pegawai) DO NOTHING
    RETURNING *;
  `;
  const result = await pool.query(query, [
    Number(data.id_periode),
    Number(data.id_pegawai),
    Number(data.total_hadir_ops_wfo || 0),
    Number(data.total_hadir_ops_wfh || 0),
    Number(data.total_izin || 0),
    Number(data.total_sakit || 0),
    Number(data.total_alpha || 0),
  ]);

  return result.rows[0] || null;
};

// 4. Update Angka Rekap Absensi + Otomatis Sinkronisasi Tunjangan Harian (WFO)
export const updateAbsensi = async (id: number, data: any) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Langkah A: Update data summary absensinya dulu
    const updateQuery = `
      UPDATE tb_absensi_summary SET 
        total_hadir_ops_wfo = COALESCE($2, total_hadir_ops_wfo),
        total_hadir_ops_wfh = COALESCE($3, total_hadir_ops_wfh),
        total_izin = COALESCE($4, total_izin),
        total_sakit = COALESCE($5, total_sakit),
        total_alpha = COALESCE($6, total_alpha)
      WHERE id_absensi_summary = $1
      RETURNING *;
    `;
    const { rows } = await client.query(updateQuery, [
      id,
      data.total_hadir_ops_wfo !== undefined
        ? Number(data.total_hadir_ops_wfo)
        : null,
      data.total_hadir_ops_wfh !== undefined
        ? Number(data.total_hadir_ops_wfh)
        : null,
      data.total_izin !== undefined ? Number(data.total_izin) : null,
      data.total_sakit !== undefined ? Number(data.total_sakit) : null,
      data.total_alpha !== undefined ? Number(data.total_alpha) : null,
    ]);

    const updatedAbsensi = rows[0];
    if (!updatedAbsensi) {
      await client.query("ROLLBACK");
      return null;
    }

    // Langkah B: Jika total_hadir_ops_wfo berubah, hitung ulang detail tunjangan transport (TRN_WFO) secara vertikal
    if (data.total_hadir_ops_wfo !== undefined) {
      const syncTunjanganQuery = `
        UPDATE tb_tunjangan_bulanan_detail td
        SET nilai_terhitung = $1 * t.nilai
        FROM tb_tunjangan t
        WHERE td.id_periode = $2 
          AND td.id_pegawai = $3 
          AND td.id_tunjangan = t.id_tunjangan 
          AND t.kode_kondisi = 'TRN_WFO';
      `;
      await client.query(syncTunjanganQuery, [
        Number(updatedAbsensi.total_hadir_ops_wfo),
        updatedAbsensi.id_periode,
        updatedAbsensi.id_pegawai,
      ]);
    }

    await client.query("COMMIT");
    return updatedAbsensi;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

// 5. Hapus Data Rekap Absensi
// Delete SEMUA absensi dalam 1 periode (Hard Delete)
export const deleteAbsensiByPeriode = async (idPeriode: number) => {
  const query = `
    DELETE FROM tb_absensi_summary 
    WHERE id_periode = $1
    RETURNING *;
  `;
  const result = await pool.query(query, [idPeriode]);
  return result.rows; // Mengembalikan array semua data yang berhasil terhapus
};
