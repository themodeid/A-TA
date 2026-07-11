import { pool } from "../../../config/database";

export class RekapGajiCommandService {
  /**
   * Menghitung dari awal (kalkulasi) dan menyimpan snapshot rekap gaji
   */
  async kalkulasiPeriode(idPeriode: number): Promise<void> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // 1. Validasi Status Periode
      const periodeCheck = await client.query(
        `SELECT status FROM tb_periode WHERE id_periode = $1 AND deleted_at IS NULL`,
        [idPeriode],
      );

      if (periodeCheck.rowCount === 0) {
        throw new Error("Periode tidak ditemukan.");
      }

      const statusPeriode = periodeCheck.rows[0].status;
      if (statusPeriode === "Selesai" || statusPeriode === "Approved") {
        throw new Error(
          "Gagal kalkulasi! Periode ini sudah disetujui atau selesai dan telah dikunci.",
        );
      }

      // 2. Ambil data mentah gabungan untuk kalkulasi matematika
      const dataMentahQuery = `
        SELECT 
          p.id_pegawai, p.nama_dan_tanggal_lahir, p.status_perkawinan, p.jumlah_anak, p.gaji_pokok_dasar,
          j.nama_jabatan, j.tunjangan_jabatan_struktural,
          g.nama_golongan,
          COALESCE(abs.total_hadir_ops_wfo, 0) as total_hadir_ops_wfo,
          COALESCE(tb.honor_bulan, 0) as honor_bulan_lembur,
          COALESCE(pot.potongan_angsuran, 0) as pot_angsuran,
          COALESCE(pot.potongan_dana_wajib, 0) as pot_dana_wajib,
          COALESCE(pot.potongan_s_pskd, 0) as pot_s_pskd,
          COALESCE(pot.potongan_pelkes, 0) as pot_pelkes,
          COALESCE(pot.potongan_lainnya, 0) as pot_lainnya
        FROM tb_pegawai p
        JOIN tb_jabatan j ON p.id_jabatan = j.id_jabatan
        JOIN tb_golongan g ON p.id_golongan = g.id_golongan
        LEFT JOIN tb_absensi_summary abs ON p.id_pegawai = abs.id_pegawai AND abs.id_periode = $1
        LEFT JOIN tb_tunjangan_bulanan tb ON p.id_pegawai = tb.id_pegawai AND tb.id_periode = $1
        LEFT JOIN tb_potongan_bulanan pot ON p.id_pegawai = pot.id_pegawai AND pot.id_periode = $1
        WHERE p.deleted_at IS NULL
      `;

      const { rows: daftarPegawai } = await client.query(dataMentahQuery, [
        idPeriode,
      ]);

      if (daftarPegawai.length === 0) {
        throw new Error(
          "Tidak ada data pegawai aktif untuk dikalkulasi pada periode ini.",
        );
      }

      // 3. Looping Perhitungan Matematika & Jalankan Upsert
      for (const pegawai of daftarPegawai) {
        const gajiPokok = parseFloat(pegawai.gaji_pokok_dasar);
        const tunjStruktural = parseFloat(pegawai.tunjangan_jabatan_struktural);
        const totalHadirWfo = parseInt(pegawai.total_hadir_ops_wfo);
        const honorBulanLembur = parseFloat(pegawai.honor_bulan_lembur);

        // Rumus Tunjangan
        const tunjanganIstri =
          pegawai.status_perkawinan === "K" ? gajiPokok * 0.1 : 0.0;
        const tunjanganAnak =
          gajiPokok * 0.02 * Math.min(pegawai.jumlah_anak, 3);
        const tunjKelGabungan = tunjanganIstri + tunjanganAnak;
        const transportMakan = totalHadirWfo * 30000.0;

        // Total Bruto
        const totalPenghasilanBruto =
          gajiPokok +
          tunjKelGabungan +
          tunjStruktural +
          honorBulanLembur +
          transportMakan;

        // Potongan
        const potAngsuran = parseFloat(pegawai.pot_angsuran);
        const potDanaWajib = parseFloat(pegawai.pot_dana_wajib);
        const potSPskd = parseFloat(pegawai.pot_s_pskd);
        const potPelkes = parseFloat(pegawai.pot_pelkes);
        const potLainnya = parseFloat(pegawai.pot_lainnya);

        const totalPotongan =
          potAngsuran + potDanaWajib + potSPskd + potPelkes + potLainnya;
        const totalPenerimaanBersih = totalPenghasilanBruto - totalPotongan;

        // 4. Eksekusi Upsert
        const upsertQuery = `
          INSERT INTO tb_rekap_gaji (
            id_periode, id_pegawai, jabatan_snapshot, pangkat_golongan_snapshot, gaji_pokok_snapshot,
            tunj_kel_gabungan_snapshot, tunjangan_istri_snapshot, tunjangan_anak_snapshot,
            tunjangan_struktural_snapshot, total_tunjangan_dinamis_snapshot, transport_makan_snapshot,
            total_penghasilan_bruto, potongan_angsuran_snapshot, potongan_dana_wajib_snapshot, 
            potongan_s_pskd_snapshot, potongan_pelkes_snapshot, potongan_lainnya_snapshot,
            total_potongan, total_penerimaan_bersih
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
          )
          ON CONFLICT (id_periode, id_pegawai) 
          DO UPDATE SET 
            jabatan_snapshot = EXCLUDED.jabatan_snapshot,
            pangkat_golongan_snapshot = EXCLUDED.pangkat_golongan_snapshot,
            gaji_pokok_snapshot = EXCLUDED.gaji_pokok_snapshot,
            tunj_kel_gabungan_snapshot = EXCLUDED.tunj_kel_gabungan_snapshot,
            tunjangan_istri_snapshot = EXCLUDED.tunjangan_istri_snapshot,
            tunjangan_anak_snapshot = EXCLUDED.tunjangan_anak_snapshot,
            tunjangan_struktural_snapshot = EXCLUDED.tunjangan_struktural_snapshot,
            total_tunjangan_dinamis_snapshot = EXCLUDED.total_tunjangan_dinamis_snapshot,
            transport_makan_snapshot = EXCLUDED.transport_makan_snapshot,
            total_penghasilan_bruto = EXCLUDED.total_penghasilan_bruto,
            potongan_angsuran_snapshot = EXCLUDED.potongan_angsuran_snapshot,
            potongan_dana_wajib_snapshot = EXCLUDED.potongan_dana_wajib_snapshot,
            potongan_s_pskd_snapshot = EXCLUDED.potongan_s_pskd_snapshot,
            potongan_pelkes_snapshot = EXCLUDED.potongan_pelkes_snapshot,
            potongan_lainnya_snapshot = EXCLUDED.potongan_lainnya_snapshot,
            total_potongan = EXCLUDED.total_potongan,
            total_penerimaan_bersih = EXCLUDED.total_penerimaan_bersih,
            created_at = NOW();
        `;

        const values = [
          idPeriode,
          pegawai.id_pegawai,
          pegawai.nama_jabatan,
          pegawai.nama_golongan,
          gajiPokok,
          tunjKelGabungan,
          tunjanganIstri,
          tunjanganAnak,
          tunjStruktural,
          honorBulanLembur,
          transportMakan,
          totalPenghasilanBruto,
          potAngsuran,
          potDanaWajib,
          potSPskd,
          potPelkes,
          potLainnya,
          totalPotongan,
          totalPenerimaanBersih,
        ];

        await client.query(upsertQuery, values);
      }

      // Update status periode otomatis
      await client.query(
        `UPDATE tb_periode SET status = 'Menunggu Approval' WHERE id_periode = $1`,
        [idPeriode],
      );

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
