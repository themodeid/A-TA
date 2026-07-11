import { pool } from "../../../config/database";

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
    GROUP BY rg.id_rekap, p.nama_dan_tanggal_lahir
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
