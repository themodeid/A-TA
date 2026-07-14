const { Pool } = require("pg");
// Inisialisasi pool koneksi database kamu
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Service untuk melakukan kalkulasi gaji akhir berdasarkan ID Periode
 * @param {number} idPeriode
 */
async function kalkulasiGajiAkhirService(idPeriode) {
  const client = await pool.connect();

  try {
    // 1. MULAI TRANSAKSI (Sangat krusial untuk menjaga integritas data keuangan)
    await client.query("BEGIN");

    // =========================================================================
    // A. AMBIL DATA MASTER & PARAMETER TERBARU
    // =========================================================================

    // Ambil rate lembur per jam
    const rateLemburRes = await client.query(
      `SELECT COALESCE(MAX(nilai), 0) AS nilai 
       FROM public.tb_tunjangan 
       WHERE kode_kondisi = 'LEMBUR_PER_JAM' AND deleted_at IS NULL`,
    );
    const vRateLembur = Number(rateLemburRes.rows[0]?.nilai || 0);

    // Ambil master potongan
    const masterPotonganRes = await client.query(
      `SELECT id_master_potongan, nilai_default, nama_potongan, kode_potongan 
       FROM public.tb_master_potongan 
       WHERE deleted_at IS NULL`,
    );
    const masterPotongan = masterPotonganRes.rows;

    // Ambil master tunjangan variabel yang relevan
    const masterTunjanganRes = await client.query(
      `SELECT id_tunjangan, formula_type, nilai, nama_tunjangan, kode_kondisi 
       FROM public.tb_tunjangan 
       WHERE formula_type IN ('HARIAN_HADIR_WFO', 'PERSEN_GAJI_JIKA_KAWIN', 'PERSEN_GAJI_PER_ANAK', 'PER_JAM_LEMBUR')
         AND deleted_at IS NULL`,
    );
    const masterTunjangan = masterTunjanganRes.rows;

    // =========================================================================
    // B. AMBIL DATA TRANSAKSIONAL (PEGAWAI & ABSENSI)
    // =========================================================================
    const dataPegawaiRes = await client.query(
      `SELECT 
        p.id_pegawai,
        p.status_perkawinan,
        p.jumlah_anak,
        p.gaji_pokok_dasar,
        COALESCE(j.nama_jabatan, 'Tanpa Jabatan') AS nama_jabatan,
        COALESCE(j.tunjangan_jabatan_struktural, 0) AS tunjangan_jabatan_struktural,
        COALESCE(g.nama_golongan, '-') AS nama_golongan,
        COALESCE(g.gaji_pokok_standar, 0) AS gaji_pokok_standar,
        abs.total_hadir_ops_wfo,
        COALESCE(tb.total_jam_lebih, 0) AS total_jam_lebih,
        COALESCE(tb.honor_bulan, 0) AS honor_bulan
       FROM public.tb_pegawai p
       JOIN public.tb_absensi_summary abs ON p.id_pegawai = abs.id_pegawai
       LEFT JOIN public.tb_jabatan j ON p.id_jabatan = j.id_jabatan
       LEFT JOIN public.tb_golongan g ON p.id_golongan = g.id_golongan
       LEFT JOIN public.tb_tunjangan_bulanan tb ON p.id_pegawai = tb.id_pegawai AND tb.id_periode = $1
       WHERE abs.id_periode = $1 AND p.deleted_at IS NULL`,
      [idPeriode],
    );
    const listPegawai = dataPegawaiRes.rows;

    if (listPegawai.length === 0) {
      throw new Error(
        `Tidak ada data absensi aktif untuk periode ID ${idPeriode}`,
      );
    }

    // =========================================================================
    // C. LOOPING KALKULASI DI MEMORI NODE.JS (SANGAT KENCANG & RINGAN!)
    // =========================================================================
    for (const pgw of listPegawai) {
      const gajiPokokSnapshot =
        pgw.gaji_pokok_dasar > 0
          ? Number(pgw.gaji_pokok_dasar)
          : Number(pgw.gaji_pokok_standar);
      const idPegawai = pgw.id_pegawai;

      // 1. Inisialisasi/Upsert Header Rekap Gaji & Snapshot Pegawai
      const upsertRekapRes = await client.query(
        `INSERT INTO public.tb_rekap_gaji 
          (id_periode, id_pegawai, jabatan_snapshot, pangkat_golongan_snapshot, gaji_pokok_snapshot)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id_periode, id_pegawai) DO UPDATE 
         SET 
           jabatan_snapshot = EXCLUDED.jabatan_snapshot,
           pangkat_golongan_snapshot = EXCLUDED.pangkat_golongan_snapshot,
           gaji_pokok_snapshot = EXCLUDED.gaji_pokok_snapshot
         RETURNING id_rekap`,
        [
          idPeriode,
          idPegawai,
          pgw.nama_jabatan,
          pgw.nama_golongan,
          gajiPokokSnapshot,
        ],
      );
      const idRekap = upsertRekapRes.rows[0].id_rekap;

      // 2. Inisialisasi Header Potongan & Tunjangan Bulanan jika belum ada
      await client.query(
        `INSERT INTO public.tb_potongan_bulanan (id_periode, id_pegawai, total_potongan_terhitung)
         VALUES ($1, $2, 0) ON CONFLICT (id_periode, id_pegawai) DO NOTHING`,
        [idPeriode, idPegawai],
      );
      await client.query(
        `INSERT INTO public.tb_tunjangan_bulanan (id_periode, id_pegawai, total_jam_lebih, honor_bulan)
         VALUES ($1, $2, $3, $4) ON CONFLICT (id_periode, id_pegawai) DO NOTHING`,
        [idPeriode, idPegawai, pgw.total_jam_lebih, pgw.honor_bulan],
      );

      // 3. Proses Detail Potongan
      let totalPotongan = 0;
      const listPotonganDetail = [];
      for (const pot of masterPotongan) {
        const nilaiPotongan = Number(pot.nilai_default);
        totalPotongan += nilaiPotongan;

        await client.query(
          `INSERT INTO public.tb_potongan_bulanan_detail (id_periode, id_pegawai, id_master_potongan, nilai_potongan)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (id_periode, id_pegawai, id_master_potongan) 
           DO UPDATE SET nilai_potongan = EXCLUDED.nilai_potongan`,
          [idPeriode, idPegawai, pot.id_master_potongan, nilaiPotongan],
        );

        if (nilaiPotongan > 0) {
          listPotonganDetail.push({
            nama: pot.nama_potongan,
            nilai: nilaiPotongan,
            kode: pot.kode_potongan,
          });
        }
      }

      // 4. Proses Detail Tunjangan Variabel & Rumus Matematikanya
      let totalTunjanganVariabel = 0;
      const listTunjanganDetail = [];
      for (const tunj of masterTunjangan) {
        let nilaiTerhitung = 0;

        switch (tunj.formula_type) {
          case "HARIAN_HADIR_WFO":
            nilaiTerhitung =
              Number(pgw.total_hadir_ops_wfo || 0) * Number(tunj.nilai);
            break;
          case "PERSEN_GAJI_JIKA_KAWIN":
            nilaiTerhitung =
              pgw.status_perkawinan === "K"
                ? gajiPokokSnapshot * Number(tunj.nilai)
                : 0;
            break;
          case "PERSEN_GAJI_PER_ANAK":
            nilaiTerhitung =
              gajiPokokSnapshot *
              Number(tunj.nilai) *
              Number(pgw.jumlah_anak || 0);
            break;
          case "PER_JAM_LEMBUR":
            nilaiTerhitung =
              Number(pgw.total_jam_lebih || 0) * Number(tunj.nilai);
            break;
        }

        totalTunjanganVariabel += nilaiTerhitung;

        await client.query(
          `INSERT INTO public.tb_tunjangan_bulanan_detail (id_periode, id_pegawai, id_tunjangan, nilai_terhitung)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (id_periode, id_pegawai, id_tunjangan) 
           DO UPDATE SET nilai_terhitung = EXCLUDED.nilai_terhitung`,
          [idPeriode, idPegawai, tunj.id_tunjangan, nilaiTerhitung],
        );

        if (nilaiTerhitung > 0) {
          const namaTunjanganSnapshot =
            tunj.formula_type === "PER_JAM_LEMBUR"
              ? `Honor Lembur (${pgw.total_jam_lebih} Jam)`
              : tunj.nama_tunjangan;

          listTunjanganDetail.push({
            nama: namaTunjanganSnapshot,
            nilai: nilaiTerhitung,
            kode: tunj.kode_kondisi,
          });
        }
      }

      // 5. Update Header Potongan Bulanan
      await client.query(
        `UPDATE public.tb_potongan_bulanan 
         SET total_potongan_terhitung = $3
         WHERE id_periode = $1 AND id_pegawai = $2`,
        [idPeriode, idPegawai, totalPotongan],
      );

      // 6. Kalkulasi Bruto & Netto Final
      const tunjStruktural = Number(pgw.tunjangan_jabatan_struktural);
      const honorBulan = Number(pgw.honor_bulan);
      const totalPenghasilanBruto =
        gajiPokokSnapshot +
        tunjStruktural +
        totalTunjanganVariabel +
        honorBulan;
      const totalPenerimaanClean = totalPenghasilanBruto - totalPotongan;

      await client.query(
        `UPDATE public.tb_rekap_gaji 
         SET total_penghasilan_bruto = $3, total_potongan = $4, total_penerimaan_clean = $5
         WHERE id_periode = $1 AND id_pegawai = $2`,
        [
          idPeriode,
          idPegawai,
          totalPenghasilanBruto,
          totalPotongan,
          totalPenerimaanClean,
        ],
      );

      // 7. SNAPSHOT DETAIL UNTUK SLIP GAJI
      // Hapus snapshot lama untuk pegawai ini di periode ini
      await client.query(
        `DELETE FROM public.tb_rekap_gaji_detail WHERE id_rekap = $1`,
        [idRekap],
      );

      // Simpan Tunjangan Struktural (jika ada)
      if (tunjStruktural > 0) {
        await client.query(
          `INSERT INTO public.tb_rekap_gaji_detail 
            (id_rekap, jenis_komponen, nama_komponen_snapshot, nilai_snapshot, kode_kondisi_snapshot)
           VALUES ($1, 'TUNJANGAN', $2, $3, 'TUNJ_JABATAN')`,
          [idRekap, `Tunjangan Struktural ${pgw.nama_jabatan}`, tunjStruktural],
        );
      }

      // Simpan Tunjangan Variabel (bulk insert per pegawai)
      for (const tunjDet of listTunjanganDetail) {
        await client.query(
          `INSERT INTO public.tb_rekap_gaji_detail 
            (id_rekap, jenis_komponen, nama_komponen_snapshot, nilai_snapshot, kode_kondisi_snapshot)
           VALUES ($1, 'TUNJANGAN', $2, $3, $4)`,
          [idRekap, tunjDet.nama, tunjDet.nilai, tunjDet.kode],
        );
      }

      // Simpan Potongan Detail (bulk insert per pegawai)
      for (const potDet of listPotonganDetail) {
        await client.query(
          `INSERT INTO public.tb_rekap_gaji_detail 
            (id_rekap, jenis_komponen, nama_komponen_snapshot, nilai_snapshot, kode_kondisi_snapshot)
           VALUES ($1, 'POTONGAN', $2, $3, $4)`,
          [idRekap, potDet.nama, potDet.nilai, potDet.kode],
        );
      }
    }

    // JIKA SEMUA BERHASIL, SUBMIT KE DATABASE PERMANEN
    await client.query("COMMIT");
    console.log(
      `[Success] Kalkulasi gaji untuk periode ${idPeriode} selesai diproses.`,
    );
    return {
      success: true,
      message: `Kalkulasi gaji periode ${idPeriode} berhasil diproses.`,
    };
  } catch (error) {
    // JIKA ADA ERROR DI JALAN, BATALKAN SEMUA PROSES ATAS (DATABASE TETAP AMAN & BERSIH)
    await client.query("ROLLBACK");
    console.error("[Error] Gagal kalkulasi gaji, transaksi dibatalkan:", error);
    throw error;
  } finally {
    // Kembalikan client ke pool koneksi
    client.release();
  }
}

module.exports = {
  kalkulasiGajiAkhirService,
};
