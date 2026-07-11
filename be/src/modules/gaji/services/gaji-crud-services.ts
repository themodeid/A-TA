import { pool } from "../../../config/database";

export interface IRekapGajiRow {
  id_rekap: number;
  id_periode: number;
  id_pegawai: number;
  nama_pegawai: string;
  jabatan_snapshot: string;
  pangkat_golongan_snapshot: string;
  gaji_pokok_snapshot: string | number;
  tunj_kel_gabungan_snapshot: string | number;
  tunjangan_istri_snapshot: string | number;
  tunjangan_anak_snapshot: string | number;
  tunjangan_struktural_snapshot: string | number;
  total_tunjangan_dinamis_snapshot: string | number;
  transport_makan_snapshot: string | number;
  total_penghasilan_bruto: string | number;
  potongan_angsuran_snapshot: string | number;
  potongan_dana_wajib_snapshot: string | number;
  potongan_s_pskd_snapshot: string | number;
  potongan_pelkes_snapshot: string | number;
  potongan_lainnya_snapshot: string | number;
  total_potongan: string | number;
  total_penerimaan_bersih: string | number;
  created_at: Date;
}

export class RekapGajiQueryService {
  /**
   * Mengambil data historical snapshot rekap gaji berdasarkan ID Periode
   */
  async getRekapByPeriode(idPeriode: number): Promise<IRekapGajiRow[]> {
    const query = `
      SELECT 
        rg.*,
        p.nama_dan_tanggal_lahir as nama_pegawai
      FROM tb_rekap_gaji rg
      JOIN tb_pegawai p ON rg.id_pegawai = p.id_pegawai
      WHERE rg.id_periode = $1
      ORDER BY p.nama_dan_tanggal_lahir ASC
    `;

    const { rows } = await pool.query(query, [idPeriode]);
    return rows;
  }

  /**
   * Mengambil daftar semua periode yang sudah pernah dibuat
   */
}
