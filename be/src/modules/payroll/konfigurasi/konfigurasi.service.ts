// modules/tunjangan/tunjangan.service.ts
import { pool } from "../../../config/database"; // Sesuaikan dengan koneksi database proyekmu

export const getAllTunjangan = async () => {
  // Hanya ambil yang BELUM di-soft delete
  const query = `SELECT * FROM tb_tunjangan WHERE deleted_at IS NULL ORDER BY id_tunjangan ASC`;
  const { rows } = await pool.query(query);
  return rows;
};

export const getTunjanganById = async (id: number) => {
  // Pastikan data yang dicari belum di-soft delete
  const query = `SELECT * FROM tb_tunjangan WHERE id_tunjangan = $1 AND deleted_at IS NULL`;
  const { rows } = await pool.query(query, [id]);
  return rows[0] || null;
};

export const createTunjangan = async (data: {
  nama_tunjangan: string;
  nilai: number;
  jenis_tunjangan: "NOMINAL" | "PERSENTASE";
  sifat_tunjangan: "BULANAN" | "HARIAN";
  kode_kondisi?: string;
  keterangan?: string;
}) => {
  const query = `
    INSERT INTO tb_tunjangan (nama_tunjangan, nilai, jenis_tunjangan, sifat_tunjangan, kode_kondisi, keterangan)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *;
  `;
  const values = [
    data.nama_tunjangan,
    data.nilai,
    data.jenis_tunjangan,
    data.sifat_tunjangan,
    data.kode_kondisi || "UMUM", // Default ke UMUM jika dikosongkan dari frontend
    data.keterangan || null,
  ];
  const { rows } = await pool.query(query, values);
  return rows[0];
};

export const updateTunjangan = async (
  id: number,
  data: {
    nama_tunjangan: string;
    nilai: number;
    jenis_tunjangan: "NOMINAL" | "PERSENTASE";
    sifat_tunjangan: "BULANAN" | "HARIAN";
    kode_kondisi: string;
    keterangan?: string;
  },
) => {
  // Pastikan tidak bisa update data yang sudah terhapus
  const query = `
    UPDATE tb_tunjangan 
    SET nama_tunjangan = $1, nilai = $2, jenis_tunjangan = $3, sifat_tunjangan = $4, kode_kondisi = $5, keterangan = $6
    WHERE id_tunjangan = $7 AND deleted_at IS NULL
    RETURNING *;
  `;
  const values = [
    data.nama_tunjangan,
    data.nilai,
    data.jenis_tunjangan,
    data.sifat_tunjangan,
    data.kode_kondisi,
    data.keterangan || null,
    id,
  ];
  const { rows } = await pool.query(query, values);
  return rows[0] || null;
};

export const deleteTunjangan = async (id: number) => {
  const query = `
    UPDATE tb_tunjangan 
    SET deleted_at = NOW() 
    WHERE id_tunjangan = $1 AND deleted_at IS NULL
    RETURNING id_tunjangan
  `;

  const { rows } = await pool.query(query, [id]);
  return rows.length > 0;
};
