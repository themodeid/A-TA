import { pool } from "../../config/database";

export interface CreatePeriodeDTO {
  bulan_gaji: string;
  tanggal_awal: Date | string;
  tanggal_akhir: Date | string;
}

// CREATE: Membuka periode baru memanfaatkan Stored Function DB
export const createPeriode = async (data: CreatePeriodeDTO) => {
  const client = await pool.connect();
  try {
    const { bulan_gaji, tanggal_awal, tanggal_akhir } = data;

    // Jalankan query dengan memanggil fungsi database yang sudah kita buat
    // Jalankan query dengan memanggil fungsi database dengan skema yang jelas
    const result = await client.query(
      `SELECT public.fungsi_buka_periode_baru($1::varchar, $2::date, $3::date) AS id_periode;`,
      [bulan_gaji, tanggal_awal, tanggal_akhir],
    );

    const newPeriodeId = result.rows[0]?.id_periode;

    if (!newPeriodeId) {
      throw new Error("Gagal membuka periode baru melalui Database Function");
    }

    // Ambil data lengkap periode yang baru dibuat untuk dikembalikan ke controller
    return await getPeriodeById(newPeriodeId);
  } catch (error) {
    // Tambahin logging sedikit biar kalau database-nya nolak (misal karena overlap tanggal),
    // lo bisa tau error asli dari PostgreSQL-nya apa.
    console.error("Error di createPeriode Service:", error);
    throw error;
  } finally {
    client.release();
  }
};

// READ: Mengambil semua periode yang aktif
export const getAllPeriode = async () => {
  const client = await pool.connect();
  try {
    const query = `
      SELECT * FROM tb_periode 
      WHERE deleted_at IS NULL 
      ORDER BY tanggal_awal DESC;
    `;
    const result = await client.query(query);
    return result.rows;
  } finally {
    client.release();
  }
};

// READ: Mengambil detail satu periode berdasarkan ID
export const getPeriodeById = async (id: number) => {
  const client = await pool.connect();
  try {
    const query = `
      SELECT * FROM tb_periode 
      WHERE id_periode = $1 AND deleted_at IS NULL;
    `;
    const result = await client.query(query, [id]);
    const periode = result.rows[0];

    if (!periode) {
      throw new Error(
        `Periode dengan ID ${id} tidak ditemukan atau telah dihapus`,
      );
    }
    return periode;
  } finally {
    client.release();
  }
};

// UPDATE: Mengubah data dasar periode dinamis
export const updatePeriode = async (
  id: number,
  data: Partial<CreatePeriodeDTO> & { status?: string },
) => {
  // 1. Validasi keberadaan data (Pastikan id_periode ini memang ada)
  await getPeriodeById(id);

  const client = await pool.connect();
  try {
    const fields: string[] = [];
    const values: any[] = [];
    let placeholderCounter = 1;

    if (data.bulan_gaji) {
      fields.push(`bulan_gaji = $${placeholderCounter++}::varchar`);
      values.push(data.bulan_gaji);
    }
    if (data.tanggal_awal) {
      // Kirim string mentah 'YYYY-MM-DD', lalu cast ke ::date di Postgres
      fields.push(`tanggal_awal = $${placeholderCounter++}::date`);
      values.push(data.tanggal_awal);
    }
    if (data.tanggal_akhir) {
      // Kirim string mentah 'YYYY-MM-DD', lalu cast ke ::date di Postgres
      fields.push(`tanggal_akhir = $${placeholderCounter++}::date`);
      values.push(data.tanggal_akhir);
    }
    if (data.status) {
      fields.push(`status = $${placeholderCounter++}::varchar`);
      values.push(data.status);
    }

    // Cek apakah ada field yang mau di-update
    if (fields.length === 0) {
      throw new Error("Tidak ada data baru yang dikirim untuk di-update");
    }

    // Masukkan id ke paling akhir array parameter untuk WHERE clause
    values.push(id);
    const query = `
      UPDATE tb_periode 
      SET ${fields.join(", ")} 
      WHERE id_periode = $${placeholderCounter}
      RETURNING *;
    `;

    const result = await client.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error("Error di updatePeriode Service:", error);
    throw error;
  } finally {
    client.release();
  }
};

// DELETE: Menggunakan Soft-Delete
export const deletePeriode = async (id: number) => {
  await getPeriodeById(id);

  const client = await pool.connect();
  try {
    const query = `
      UPDATE tb_periode 
      SET deleted_at = $1 
      WHERE id_periode = $2
      RETURNING *;
    `;

    const result = await client.query(query, [new Date(), id]);
    return result.rows[0];
  } finally {
    client.release();
  }
};
