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
 * Menggunakan ON CONFLICT berdasarkan constraint UNIQUE (id_periode, id_pegawai)
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
 * 3. Get detail tunjangan bulanan berdasarkan ID transaksi utama
 */
export const getTunjanganById = async (id_tunjangan_bulanan: number) => {
  const client = await pool.connect();
  try {
    const query = `SELECT * FROM tb_tunjangan_bulanan WHERE id_tunjangan_bulanan = $1`;
    const result = await client.query(query, [id_tunjangan_bulanan]);
    return result.rows[0] || null;
  } finally {
    client.release();
  }
};

/**
 * 4. Update Parsial Tunjangan Bulanan (Berdasarkan ID transaksi)
 */
export const updateTunjanganBulanan = async (
  id_tunjangan_bulanan: number,
  data: Partial<TunjanganBulananInput>,
) => {
  const client = await pool.connect();
  try {
    // Ambil data eksisting sebagai cadangan jika field tidak dikirim di body
    const existing = await getTunjanganById(id_tunjangan_bulanan);
    if (!existing) return null;

    const query = `
      UPDATE tb_tunjangan_bulanan 
      SET 
        tunjangan_kesra = $1, tunjangan_supervisi = $2, tunjangan_wali_kelas = $3, 
        tunjangan_piket = $4, tunjangan_jurbeng = $5, honor_bulan = $6, 
        tunjangan_khusus = $7, total_jam_lebih = $8, tunj_kel_gabungan = $9, 
        tunjjab_25_pp1985 = $10, sb_dana_chuk_2_pp85 = $11, sb_dana_chuk_8_pp85 = $12, 
        tunjangan_perbaikan_penghasilan = $13
      WHERE id_tunjangan_bulanan = $14
      RETURNING *
    `;

    const values = [
      data.tunjangan_kesra ?? existing.tunjangan_kesra,
      data.tunjangan_supervisi ?? existing.tunjangan_supervisi,
      data.tunjangan_wali_kelas ?? existing.tunjangan_wali_kelas,
      data.tunjangan_piket ?? existing.tunjangan_piket,
      data.tunjangan_jurbeng ?? existing.tunjangan_jurbeng,
      data.honor_bulan ?? existing.honor_bulan,
      data.tunjangan_khusus ?? existing.tunjangan_khusus,
      data.total_jam_lebih ?? existing.total_jam_lebih,
      data.tunj_kel_gabungan ?? existing.tunj_kel_gabungan,
      data.tunjjab_25_pp1985 ?? existing.tunjjab_25_pp1985,
      data.sb_dana_chuk_2_pp85 ?? existing.sb_dana_chuk_2_pp85,
      data.sb_dana_chuk_8_pp85 ?? existing.sb_dana_chuk_8_pp85,
      data.tunjangan_perbaikan_penghasilan ??
        existing.tunjangan_perbaikan_penghasilan,
      id_tunjangan_bulanan,
    ];

    const result = await client.query(query, values);
    return result.rows[0] || null;
  } finally {
    client.release();
  }
};

/**
 * 5. Get data tunjangan spesifik untuk 1 pegawai di periode tertentu
 */
export const getTunjanganPegawaiByPeriode = async (
  id_pegawai: number,
  id_periode: number,
) => {
  const client = await pool.connect();
  try {
    const query = `
      SELECT * FROM tb_tunjangan_bulanan 
      WHERE id_pegawai = $1 AND id_periode = $2
    `;
    const result = await client.query(query, [id_pegawai, id_periode]);
    return result.rows[0] || null;
  } finally {
    client.release();
  }
};
