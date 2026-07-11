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

    const result = await client.query(
      `SELECT fungsi_buka_periode_baru($1, $2, $3);`,
      [bulan_gaji, new Date(tanggal_awal), new Date(tanggal_akhir)],
    );

    const newPeriodeId = result.rows[0]?.fungsi_buka_periode_baru;

    if (!newPeriodeId) {
      throw new Error("Gagal membuka periode baru melalui Database Function");
    }

    return await getPeriodeById(newPeriodeId);
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
  // Validasi keberadaan data
  await getPeriodeById(id);

  const client = await pool.connect();
  try {
    const fields: string[] = [];
    const values: any[] = [];
    let placeholderCounter = 1;

    if (data.bulan_gaji) {
      fields.push(`bulan_gaji = $${placeholderCounter++}`);
      values.push(data.bulan_gaji);
    }
    if (data.tanggal_awal) {
      fields.push(`tanggal_awal = $${placeholderCounter++}`);
      values.push(new Date(data.tanggal_awal));
    }
    if (data.tanggal_akhir) {
      fields.push(`tanggal_akhir = $${placeholderCounter++}`);
      values.push(new Date(data.tanggal_akhir));
    }
    if (data.status) {
      fields.push(`status = $${placeholderCounter++}`);
      values.push(data.status);
    }

    // Selalu perbarui timestamp updated_at jika ada field lain yang berubah
    if (fields.length > 0) {
      fields.push(`updated_at = $${placeholderCounter++}`);
      values.push(new Date());
    } else {
      throw new Error("Tidak ada data baru yang dikirim untuk di-update");
    }

    values.push(id);
    const query = `
      UPDATE tb_periode 
      SET ${fields.join(", ")} 
      WHERE id_periode = $${placeholderCounter}
      RETURNING *;
    `;

    const result = await client.query(query, values);
    return result.rows[0];
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
