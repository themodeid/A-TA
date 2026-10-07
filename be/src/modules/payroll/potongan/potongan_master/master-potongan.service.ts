import { pool } from "../../../../config/database";

export interface MasterPotonganInput {
  nama_potongan: string;
  kode_potongan: string;
  nilai?: number;
  jenis_potongan?: "NOMINAL" | "PERSEN" | string;
  sifat_potongan?: "BULANAN" | "KONDISIONAL" | string;
  formula_type?: string | null;
  keterangan?: string | null;
}

/**
 * Mengambil semua data master potongan yang belum dihapus (Soft Delete)
 */
export const getAllMasterPotongan = async () => {
  const query = `
    SELECT 
      id_master_potongan,
      nama_potongan,
      kode_potongan,
      nilai,
      jenis_potongan,
      sifat_potongan,
      formula_type,
      keterangan
    FROM tb_master_potongan
    WHERE deleted_at IS NULL
    ORDER BY id_master_potongan ASC;
  `;
  const result = await pool.query(query);
  return result.rows;
};

/**
 * Mengambil detail 1 master potongan berdasarkan ID
 */
export const getMasterPotonganById = async (id: number) => {
  const query = `
    SELECT * FROM tb_master_potongan 
    WHERE id_master_potongan = $1 AND deleted_at IS NULL;
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

/**
 * Menambahkan data master potongan baru
 */
export const createMasterPotongan = async (data: MasterPotonganInput) => {
  const {
    nama_potongan,
    kode_potongan,
    nilai = 0,
    jenis_potongan = "NOMINAL",
    sifat_potongan = "BULANAN",
    formula_type = null,
    keterangan = null,
  } = data;

  const query = `
    INSERT INTO tb_master_potongan (
      nama_potongan, 
      kode_potongan, 
      nilai, 
      jenis_potongan, 
      sifat_potongan, 
      formula_type, 
      keterangan
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *;
  `;

  const values = [
    nama_potongan,
    kode_potongan,
    nilai,
    jenis_potongan,
    sifat_potongan,
    formula_type,
    keterangan,
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

/**
 * Mengubah data master potongan
 */
export const updateMasterPotongan = async (
  id: number,
  data: Partial<MasterPotonganInput>,
) => {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  // Dinamis query builder berdasarkan field yang dikirim
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) {
      fields.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  });

  if (fields.length === 0) return null;

  values.push(id);
  const query = `
    UPDATE tb_master_potongan 
    SET ${fields.join(", ")}
    WHERE id_master_potongan = $${paramIndex} AND deleted_at IS NULL
    RETURNING *;
  `;

  const result = await pool.query(query, values);
  return result.rows[0] || null;
};

/**
 * Soft delete master potongan (Set column deleted_at)
 */
export const deleteMasterPotongan = async (id: number) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Soft delete master potongan
    const updateMaster = await client.query(
      `UPDATE tb_master_potongan 
       SET deleted_at = NOW() 
       WHERE id_master_potongan = $1 AND deleted_at IS NULL
       RETURNING id_master_potongan;`,
      [id],
    );

    if (updateMaster.rows.length === 0) {
      await client.query("ROLLBACK");
      return false;
    }

    // 2. Cascade Purge: Bersihkan baris detail di periode aktif yang belum dikunci
    await client.query(
      `DELETE FROM tb_potongan_bulanan_detail 
       WHERE id_master_potongan = $1 
         AND id_periode IN (
           SELECT id_periode FROM tb_periode 
           WHERE status NOT IN ('Dikunci', 'Selesai', 'Diproses Gaji')
         );`,
    );

    // 3. Recalculate: Sinkronisasi ulang header total_potongan_terhitung untuk periode aktif
    await client.query(
      `UPDATE tb_potongan_bulanan pb
       SET total_potongan_terhitung = COALESCE(
         (SELECT SUM(pbd.nilai_potongan) 
          FROM tb_potongan_bulanan_detail pbd 
          WHERE pbd.id_periode = pb.id_periode AND pbd.id_pegawai = pb.id_pegawai),
         0.00
       )
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
