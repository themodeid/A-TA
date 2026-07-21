import { pool } from "../../../config/database";

// Definisi interface untuk tipe data input massal dari frontend
interface TunjanganInput {
  id_pegawai: number;
  total_jam_lebih: number;
  honor_bulan: number;
}

// ==========================================
// LOGIKA MENGAMBIL DATA UNTUK TABEL GRID UI (BERDASARKAN PERIODE)
// ==========================================
export const getAllByPeriode = async (id_periode: number) => {
  const queryText = `
        SELECT 
            tb.id_tunjangan_bulanan,
            tb.id_periode,
            tb.id_pegawai,
            p.nama_dan_tanggal_lahir,
            tb.total_jam_lebih,
            tb.honor_bulan
        FROM tb_tunjangan_bulanan tb
        JOIN tb_pegawai p ON tb.id_pegawai = p.id_pegawai
        WHERE tb.id_periode = $1
        ORDER BY p.nama_dan_tanggal_lahir ASC;
    `;

  // Menggunakan pool secara langsung untuk single-query tanpa transaksi
  const result = await pool.query(queryText, [id_periode]);
  return result.rows;
};

// ==========================================
// LOGIKA INISIALISASI PERIODE BARU
// ==========================================
export const initialize = async (id_periode: number) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const pCheck = await client.query(
      "SELECT status FROM tb_periode WHERE id_periode = $1",
      [id_periode],
    );
    if (pCheck.rows.length === 0) throw new Error("Periode tidak ditemukan!");
    if (pCheck.rows[0].status !== "Pengisian Absensi") {
      throw new Error(
        "Gagal. Status periode ini bukan Pengisian Absensi atau sudah dikunci!",
      );
    }

    const initQuery = `
        INSERT INTO tb_tunjangan_bulanan (id_periode, id_pegawai, total_jam_lebih, honor_bulan)
        SELECT $1, id_pegawai, 0.00, 0.00
        FROM tb_pegawai
        WHERE deleted_at IS NULL
        ON CONFLICT (id_periode, id_pegawai) DO NOTHING;
    `;
    await client.query(initQuery, [id_periode]);

    await client.query("COMMIT");
    return { message: "Inisialisasi wadah tunjangan bulanan berhasil!" };
  } catch (error: any) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

// ==========================================
// LOGIKA SIMPAN MASSAL (BULK SAVE)
// ==========================================
export const saveBulk = async (
  id_periode: number,
  data_input: TunjanganInput[],
) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const rateMaster = await client.query(
      "SELECT id_tunjangan, nilai FROM tb_tunjangan WHERE kode_kondisi = 'LEMBUR_PER_JAM' LIMIT 1",
    );
    if (rateMaster.rows.length === 0) {
      throw new Error(
        "Master data 'LEMBUR_PER_JAM' belum diseed! Silakan isi master data terlebih dahulu.",
      );
    }
    const { id_tunjangan: idTunjangLembur, nilai: rateLembur } =
      rateMaster.rows[0];

    for (const item of data_input) {
      const { id_pegawai, total_jam_lebih, honor_bulan } = item;

      const updateHeader = `
            INSERT INTO tb_tunjangan_bulanan (id_periode, id_pegawai, total_jam_lebih, honor_bulan)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (id_periode, id_pegawai)
            DO UPDATE SET 
                total_jam_lebih = EXCLUDED.total_jam_lebih,
                honor_bulan = EXCLUDED.honor_bulan;
        `;
      await client.query(updateHeader, [
        id_periode,
        id_pegawai,
        total_jam_lebih,
        honor_bulan,
      ]);

      const uangLemburTerhitung =
        parseFloat(total_jam_lebih.toString()) *
        parseFloat(rateLembur.toString());

      const updateDetailLembur = `
            INSERT INTO tb_tunjangan_bulanan_detail (id_periode, id_pegawai, id_tunjangan, nilai_terhitung)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (id_periode, id_pegawai, id_tunjangan)
            DO UPDATE SET nilai_terhitung = EXCLUDED.nilai_terhitung;
        `;
      await client.query(updateDetailLembur, [
        id_periode,
        id_pegawai,
        idTunjangLembur,
        uangLemburTerhitung,
      ]);
    }

    await client.query("COMMIT");
    return {
      message:
        "Semua data tunjangan bulanan berhasil disimpan dan disinkronkan!",
    };
  } catch (error: any) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
