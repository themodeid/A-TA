import { pool } from "../../config/database";

// Interface untuk standarisasi struktur data tunjangan bulanan
export interface TunjanganBulananInput {
  id_periode: number;
  id_pegawai: number;
  tunjangan_kesra: number;
  tunjangan_supervisi: number;
  tunjangan_wali_kelas: number;
  tunjangan_piket: number;
  tunjangan_jurbeng: number;
  honor_bulan: number;
  tunjangan_khusus: number;
  total_jam_lebih: number;
  tunj_kel_gabungan: number;
  tunjjab_25_pp1985: number;
  sb_dana_chuk_2_pp85: number;
  sb_dana_chuk_8_pp85: number;
  tunjangan_perbaikan_penghasilan: number;
}

/**
 * 1. Get data tunjangan semua pegawai pada periode tertentu
 */
export const getTunjanganByPeriode = async (id_periode: number) => {
  const client = await pool.connect();
  try {
    const query = `
      SELECT t.*, p.nama_dan_tanggal_lahir 
      FROM tb_tunjangan_bulanan t
      JOIN tb_pegawai p ON t.id_pegawai = p.id_pegawai
      WHERE t.id_periode = $1 AND p.deleted_at IS NULL
      ORDER BY p.id_pegawai ASC
    `;
    const result = await client.query(query, [id_periode]);
    return result.rows;
  } finally {
    client.release();
  }
};

/**
 * 2. Upsert (Insert atau Update) Tunjangan Bulanan Pegawai
 */
export const upsertTunjanganBulanan = async (data: TunjanganBulananInput) => {
  const client = await pool.connect();
  try {
    const query = `
      INSERT INTO tb_tunjangan_bulanan (
        id_periode, id_pegawai, tunjangan_kesra, tunjangan_supervisi, 
        tunjangan_wali_kelas, tunjangan_piket, tunjangan_jurbeng, honor_bulan, 
        tunjangan_khusus, total_jam_lebih, tunj_kel_gabungan, tunjjab_25_pp1985, 
        sb_dana_chuk_2_pp85, sb_dana_chuk_8_pp85, tunjangan_perbaikan_penghasilan
      ) 
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
      )
      ON CONFLICT (id_periode, id_pegawai) 
      DO UPDATE SET 
        tunjangan_kesra = EXCLUDED.tunjangan_kesra,
        tunjangan_supervisi = EXCLUDED.tunjangan_supervisi,
        tunjangan_wali_kelas = EXCLUDED.tunjangan_wali_kelas,
        tunjangan_piket = EXCLUDED.tunjangan_piket,
        tunjangan_jurbeng = EXCLUDED.tunjangan_jurbeng,
        honor_bulan = EXCLUDED.honor_bulan,
        tunjangan_khusus = EXCLUDED.tunjangan_khusus,
        total_jam_lebih = EXCLUDED.total_jam_lebih,
        tunj_kel_gabungan = EXCLUDED.tunj_kel_gabungan,
        tunjjab_25_pp1985 = EXCLUDED.tunjjab_25_pp1985,
        sb_dana_chuk_2_pp85 = EXCLUDED.sb_dana_chuk_2_pp85,
        sb_dana_chuk_8_pp85 = EXCLUDED.sb_dana_chuk_8_pp85,
        tunjangan_perbaikan_penghasilan = EXCLUDED.tunjangan_perbaikan_penghasilan
      RETURNING *
    `;

    const values = [
      data.id_periode,
      data.id_pegawai,
      data.tunjangan_kesra,
      data.tunjangan_supervisi,
      data.tunjangan_wali_kelas,
      data.tunjangan_piket,
      data.tunjangan_jurbeng,
      data.honor_bulan,
      data.tunjangan_khusus,
      data.total_jam_lebih,
      data.tunj_kel_gabungan,
      data.tunjjab_25_pp1985,
      data.sb_dana_chuk_2_pp85,
      data.sb_dana_chuk_8_pp85,
      data.tunjangan_perbaikan_penghasilan,
    ];

    const result = await client.query(query, values);
    return result.rows[0];
  } finally {
    client.release();
  }
};

/**
 * 3. Get detail tunjangan bulanan berdasarkan ID transaksi utama (Proteksi Soft Delete Pegawai)
 */
export const getTunjanganById = async (id_tunjangan_bulanan: number) => {
  const client = await pool.connect();
  try {
    const query = `
      SELECT t.* 
      FROM tb_tunjangan_bulanan t
      JOIN tb_pegawai p ON t.id_pegawai = p.id_pegawai
      WHERE t.id_tunjangan_bulanan = $1 AND p.deleted_at IS NULL
    `;
    const result = await client.query(query, [id_tunjangan_bulanan]);
    return result.rows[0] || null;
  } finally {
    client.release();
  }
};

/**
 * 4. Update Parsial Tunjangan Bulanan (Optimasi COALESCE - 1x Query)
 */
export const updateTunjanganBulanan = async (
  id_tunjangan_bulanan: number,
  data: Partial<TunjanganBulananInput>,
) => {
  const client = await pool.connect();
  try {
    // Query dioptimasi penuh menggunakan COALESCE langsung ke database tanpa fetch data awal
    const query = `
      UPDATE tb_tunjangan_bulanan t
      SET 
        tunjangan_kesra = COALESCE($1, t.tunjangan_kesra), 
        tunjangan_supervisi = COALESCE($2, t.tunjangan_supervisi), 
        tunjangan_wali_kelas = COALESCE($3, t.tunjangan_wali_kelas), 
        tunjangan_piket = COALESCE($4, t.tunjangan_piket), 
        tunjangan_jurbeng = COALESCE($5, t.tunjangan_jurbeng), 
        honor_bulan = COALESCE($6, t.honor_bulan), 
        tunjangan_khusus = COALESCE($7, t.tunjangan_khusus), 
        total_jam_lebih = COALESCE($8, t.total_jam_lebih), 
        tunj_kel_gabungan = COALESCE($9, t.tunj_kel_gabungan), 
        tunjjab_25_pp1985 = COALESCE($10, t.tunjjab_25_pp1985), 
        sb_dana_chuk_2_pp85 = COALESCE($11, t.sb_dana_chuk_2_pp85), 
        sb_dana_chuk_8_pp85 = COALESCE($12, t.sb_dana_chuk_8_pp85), 
        tunjangan_perbaikan_penghasilan = COALESCE($13, t.tunjangan_perbaikan_penghasilan)
      FROM tb_pegawai p
      WHERE t.id_pegawai = p.id_pegawai 
        AND t.id_tunjangan_bulanan = $14 
        AND p.deleted_at IS NULL
      RETURNING t.*
    `;

    const values = [
      data.tunjangan_kesra ?? null,
      data.tunjangan_supervisi ?? null,
      data.tunjangan_wali_kelas ?? null,
      data.tunjangan_piket ?? null,
      data.tunjangan_jurbeng ?? null,
      data.honor_bulan ?? null,
      data.tunjangan_khusus ?? null,
      data.total_jam_lebih ?? null,
      data.tunj_kel_gabungan ?? null,
      data.tunjjab_25_pp1985 ?? null,
      data.sb_dana_chuk_2_pp85 ?? null,
      data.sb_dana_chuk_8_pp85 ?? null,
      data.tunjangan_perbaikan_penghasilan ?? null,
      id_tunjangan_bulanan,
    ];

    const result = await client.query(query, values);
    return result.rows[0] || null;
  } finally {
    client.release();
  }
};

/**
 * 5. Get data tunjangan spesifik untuk 1 pegawai di periode tertentu (Proteksi Soft Delete Pegawai)
 */
export const getTunjanganPegawaiByPeriode = async (
  id_pegawai: number,
  id_periode: number,
) => {
  const client = await pool.connect();
  try {
    const query = `
      SELECT t.* 
      FROM tb_tunjangan_bulanan t
      JOIN tb_pegawai p ON t.id_pegawai = p.id_pegawai
      WHERE t.id_pegawai = $1 AND t.id_periode = $2 AND p.deleted_at IS NULL
    `;
    const result = await client.query(query, [id_pegawai, id_periode]);
    return result.rows[0] || null;
  } finally {
    client.release();
  }
};
