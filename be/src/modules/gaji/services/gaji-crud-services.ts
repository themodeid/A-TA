import { pool } from "../../../config/database";
import { PoolClient } from "pg";

export interface IRekapGajiRow {
  id_rekap: number;
  id_periode: number;
  id_pegawai: number;
  nama_pegawai: string;
  jabatan_snapshot: string;
  pangkat_golongan_snapshot: string;
  gaji_pokok_snapshot: number;
  tunjangan_istri_snapshot: number;
  tunjangan_anak_snapshot: number;
  tunjangan_struktural_snapshot: number;
  tunjangan_transport_wfo_snapshot: number;
  total_penghasilan_bruto: number;
  total_potongan: number;
  total_penerimaan_clean: number;
  created_at: Date;
}

// Payload untuk membuat/mengupdate rekap gaji secara manual
export interface ICreateRekapPayload {
  id_periode: number;
  id_pegawai: number;
  jabatan_snapshot: string;
  pangkat_golongan_snapshot: string;
  gaji_pokok_snapshot: number;
  total_penghasilan_bruto: number;
  total_potongan: number;
  total_penerimaan_clean: number;
  details?: Array<{
    jenis_komponen: "TUNJANGAN" | "POTONGAN";
    nama_komponen_snapshot: string;
    nilai_snapshot: number;
    kode_kondisi_snapshot: string;
  }>;
}

/**
 * 1. Ambil rekap gaji berdasarkan Periode (Fungsi lama yang sudah disesuaikan)
 */
export const getRekapByPeriode = async (
  idPeriode: number,
): Promise<IRekapGajiRow[]> => {
  const query = `
    SELECT 
      rg.id_rekap,
      rg.id_periode,
      rg.id_pegawai,
      p.nama_dan_tanggal_lahir as nama_pegawai,
      rg.jabatan_snapshot,
      rg.pangkat_golongan_snapshot,
      rg.gaji_pokok_snapshot,
      
      COALESCE(SUM(CASE WHEN rgd.kode_kondisi_snapshot = 'TUNJ_ISTRI' THEN rgd.nilai_snapshot END), 0) as tunjangan_istri_snapshot,
      COALESCE(SUM(CASE WHEN rgd.kode_kondisi_snapshot = 'TUNJ_ANAK' THEN rgd.nilai_snapshot END), 0) as tunjangan_anak_snapshot,
      COALESCE(SUM(CASE WHEN rgd.kode_kondisi_snapshot = 'TUNJ_STRUKTURAL' THEN rgd.nilai_snapshot END), 0) as tunjangan_struktural_snapshot,
      COALESCE(SUM(CASE WHEN rgd.kode_kondisi_snapshot = 'TRN_WFO' THEN rgd.nilai_snapshot END), 0) as tunjangan_transport_wfo_snapshot,
      
      rg.total_penghasilan_bruto,
      rg.total_potongan,
      rg.total_penerimaan_clean,
      rg.created_at
    FROM tb_rekap_gaji rg
    JOIN tb_pegawai p ON rg.id_pegawai = p.id_pegawai
    LEFT JOIN tb_rekap_gaji_detail rgd ON rg.id_rekap = rgd.id_rekap
    WHERE rg.id_periode = $1
    GROUP BY rg.id_rekap, p.nama_dan_tanggal_lahir, rg.id_periode, rg.id_pegawai, rg.jabatan_snapshot, rg.pangkat_golongan_snapshot, rg.gaji_pokok_snapshot, rg.total_penghasilan_bruto, rg.total_potongan, rg.total_penerimaan_clean, rg.created_at
    ORDER BY p.nama_dan_tanggal_lahir ASC;
  `;

  const { rows } = await pool.query(query, [idPeriode]);

  return rows.map((row) => ({
    ...row,
    gaji_pokok_snapshot: parseFloat(row.gaji_pokok_snapshot),
    tunjangan_istri_snapshot: parseFloat(row.tunjangan_istri_snapshot),
    tunjangan_anak_snapshot: parseFloat(row.tunjangan_anak_snapshot),
    tunjangan_struktural_snapshot: parseFloat(
      row.tunjangan_struktural_snapshot,
    ),
    tunjangan_transport_wfo_snapshot: parseFloat(
      row.tunjangan_transport_wfo_snapshot,
    ),
    total_penghasilan_bruto: parseFloat(row.total_penghasilan_bruto),
    total_potongan: parseFloat(row.total_potongan),
    total_penerimaan_clean: parseFloat(row.total_penerimaan_clean),
  }));
};

/**
 * 2. Ambil list semua periode (Fungsi lama)
 */
export const getAllPeriode = async () => {
  const query = `
    SELECT id_periode, bulan_gaji, tanggal_awal, tanggal_akhir, status 
    FROM tb_periode 
    WHERE deleted_at IS NULL
    ORDER BY tanggal_awal DESC;
  `;
  const { rows } = await pool.query(query);
  return rows;
};

/**
 * 3. Ambil rekap gaji dari semua pegawai (Global)
 */
export const getAllRekapGaji = async (): Promise<any[]> => {
  const query = `
    SELECT rg.*, p.nama_dan_tanggal_lahir as nama_pegawai 
    FROM tb_rekap_gaji rg
    JOIN tb_pegawai p ON rg.id_pegawai = p.id_pegawai
    ORDER BY rg.created_at DESC;
  `;
  const { rows } = await pool.query(query);
  return rows;
};

/**
 * 4. Ambil rekap gaji berdasarkan spesifik Pegawai (History slip)
 */
export const getRekapByPegawai = async (idPegawai: number): Promise<any[]> => {
  const query = `
    SELECT rg.*, per.bulan_gaji 
    FROM tb_rekap_gaji rg
    JOIN tb_periode per ON rg.id_periode = per.id_periode
    WHERE rg.id_pegawai = $1
    ORDER BY per.tanggal_awal DESC;
  `;
  const { rows } = await pool.query(query, [idPegawai]);
  return rows;
};

/**
 * 5. [CREATE/UPSERT] Simpan/Update data rekap gaji + transaksional detailnya
 * Menggantikan logic INSERT ON CONFLICT dan DELETE detail lama dari SQL seeding kamu.
 */
export const saveRekapGajiWithDetails = async (
  payload: ICreateRekapPayload,
): Promise<number> => {
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Upsert header tb_rekap_gaji
    const upsertHeaderQuery = `
      INSERT INTO public.tb_rekap_gaji 
        (id_periode, id_pegawai, jabatan_snapshot, pangkat_golongan_snapshot, gaji_pokok_snapshot, total_penghasilan_bruto, total_potongan, total_penerimaan_clean) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id_periode, id_pegawai) DO UPDATE 
      SET 
        jabatan_snapshot = EXCLUDED.jabatan_snapshot,
        pangkat_golongan_snapshot = EXCLUDED.pangkat_golongan_snapshot,
        gaji_pokok_snapshot = EXCLUDED.gaji_pokok_snapshot,
        total_penghasilan_bruto = EXCLUDED.total_penghasilan_bruto,
        total_potongan = EXCLUDED.total_potongan,
        total_penerimaan_clean = EXCLUDED.total_penerimaan_clean
      RETURNING id_rekap;
    `;

    const headerRes = await client.query(upsertHeaderQuery, [
      payload.id_periode,
      payload.id_pegawai,
      payload.jabatan_snapshot,
      payload.pangkat_golongan_snapshot,
      payload.gaji_pokok_snapshot,
      payload.total_penghasilan_bruto,
      payload.total_potongan,
      payload.total_penerimaan_clean,
    ]);

    const idRekap = headerRes.rows[0].id_rekap;

    // 2. Hapus detail lama agar tidak menumpuk saat ditimpa (Sesuai logic SQL-mu)
    await client.query(
      "DELETE FROM public.tb_rekap_gaji_detail WHERE id_rekap = $1",
      [idRekap],
    );

    // 3. Masukkan detail baru jika didefinisikan dalam payload
    if (payload.details && payload.details.length > 0) {
      const insertDetailQuery = `
        INSERT INTO public.tb_rekap_gaji_detail 
          (id_rekap, jenis_komponen, nama_komponen_snapshot, nilai_snapshot, kode_kondisi_snapshot) 
        VALUES ($1, $2, $3, $4, $5);
      `;

      for (const det of payload.details) {
        await client.query(insertDetailQuery, [
          idRekap,
          det.jenis_komponen,
          det.nama_komponen_snapshot,
          det.nilai_snapshot,
          det.kode_kondisi_snapshot,
        ]);
      }
    }

    await client.query("COMMIT");
    return idRekap;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

/**
 * 6. [DELETE] Hapus data rekap beserta detailnya secara aman cascade/manual
 */
export const deleteRekapGaji = async (idRekap: number): Promise<boolean> => {
  const client: PoolClient = await pool.connect();
  try {
    await client.query("BEGIN");

    // Hapus detail terlebih dahulu untuk menghindari constraint foreign key
    await client.query(
      "DELETE FROM public.tb_rekap_gaji_detail WHERE id_rekap = $1",
      [idRekap],
    );

    // Hapus rekap utama
    const res = await client.query(
      "DELETE FROM public.tb_rekap_gaji WHERE id_rekap = $1",
      [idRekap],
    );

    await client.query("COMMIT");
    return (res.rowCount ?? 0) > 0;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
