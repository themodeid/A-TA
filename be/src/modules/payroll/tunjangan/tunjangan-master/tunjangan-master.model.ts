import { pool } from "../../../../config/database";

export interface CreateTunjanganMasterInput {
  nama_tunjangan: string;
  nilai?: number;
  jenis_tunjangan?: string;
  sifat_tunjangan?: string;
  keterangan?: string;
  kode_kondisi: string;
  formula_type?: string;
}

/**
 * Get semua data master tunjangan aktif (tidak terkena soft delete)
 */
export const getAllTunjanganMaster = async () => {
  const client = await pool.connect();
  try {
    const query = `
      SELECT 
        id_tunjangan, 
        nama_tunjangan, 
        nilai, 
        jenis_tunjangan, 
        sifat_tunjangan, 
        keterangan, 
        kode_kondisi, 
        formula_type
      FROM tb_tunjangan
      WHERE deleted_at IS NULL
      ORDER BY id_tunjangan ASC
    `;
    const res = await client.query(query);
    return res.rows;
  } finally {
    client.release();
  }
};

/**
 * Get detail 1 master tunjangan by ID
 */
export const getTunjanganMasterById = async (id: number) => {
  const client = await pool.connect();
  try {
    const res = await client.query(
      `SELECT * FROM tb_tunjangan WHERE id_tunjangan = $1 AND deleted_at IS NULL`,
      [id],
    );
    return res.rows[0] || null;
  } finally {
    client.release();
  }
};

/**
 * Tambah master tunjangan baru
 */
export const createTunjanganMaster = async (
  data: CreateTunjanganMasterInput,
) => {
  const client = await pool.connect();
  try {
    const query = `
      INSERT INTO tb_tunjangan (
        nama_tunjangan, nilai, jenis_tunjangan, sifat_tunjangan, keterangan, kode_kondisi, formula_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const values = [
      data.nama_tunjangan,
      data.nilai ?? 0,
      data.jenis_tunjangan ?? "NOMINAL",
      data.sifat_tunjangan ?? "BULANAN",
      data.keterangan ?? null,
      data.kode_kondisi ?? "UMUM",
      data.formula_type ?? null,
    ];
    const res = await client.query(query, values);
    return res.rows[0];
  } finally {
    client.release();
  }
};

/**
 * Update master tunjangan
 */
export const updateTunjanganMaster = async (
  id: number,
  data: Partial<CreateTunjanganMasterInput>,
) => {
  const client = await pool.connect();
  try {
    const query = `
      UPDATE tb_tunjangan SET
        nama_tunjangan = COALESCE($1, nama_tunjangan),
        nilai = COALESCE($2, nilai),
        jenis_tunjangan = COALESCE($3, jenis_tunjangan),
        sifat_tunjangan = COALESCE($4, sifat_tunjangan),
        keterangan = COALESCE($5, keterangan),
        kode_kondisi = COALESCE($6, kode_kondisi),
        formula_type = COALESCE($7, formula_type)
      WHERE id_tunjangan = $8 AND deleted_at IS NULL
      RETURNING *
    `;
    const values = [
      data.nama_tunjangan ?? null,
      data.nilai ?? null,
      data.jenis_tunjangan ?? null,
      data.sifat_tunjangan ?? null,
      data.keterangan ?? null,
      data.kode_kondisi ?? null,
      data.formula_type ?? null,
      id,
    ];
    const res = await client.query(query, values);
    return res.rows[0];
  } finally {
    client.release();
  }
};

/**
 * Soft delete master tunjangan
 */
export const softDeleteTunjanganMaster = async (id: number) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Soft delete master tunjangan
    const res = await client.query(
      `UPDATE tb_tunjangan SET deleted_at = NOW() WHERE id_tunjangan = $1 AND deleted_at IS NULL RETURNING id_tunjangan;`,
      [id],
    );

    if (res.rows.length === 0) {
      await client.query("ROLLBACK");
      return false;
    }

    // 2. Cascade Purge: Bersihkan baris detail di periode aktif yang belum dikunci
    await client.query(
      `DELETE FROM tb_tunjangan_bulanan_detail
       WHERE id_tunjangan = $1
         AND id_periode IN (
           SELECT id_periode FROM tb_periode 
           WHERE status NOT IN ('Dikunci', 'Selesai', 'Diproses Gaji')
         );`,
    );

    // 3. Recalculate: Sinkronisasi ulang header total_tunjangan_terhitung untuk periode aktif
    await client.query(
      `UPDATE tb_tunjangan_bulanan tb
       SET total_tunjangan_terhitung = ROUND(COALESCE(tb.honor_bulan, 0.00) + COALESCE((
         SELECT SUM(nilai_terhitung)
         FROM tb_tunjangan_bulanan_detail tbd
         WHERE tbd.id_periode = tb.id_periode AND tbd.id_pegawai = tb.id_pegawai
       ), 0.00), 0)
       WHERE id_periode IN (
         SELECT id_periode FROM tb_periode 
         WHERE status NOT IN ('Dikunci', 'Selesai', 'Diproses Gaji')
       );`,
    );

    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
