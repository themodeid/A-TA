import { pool } from "../../../config/database";

export const kalkulasiPeriode = async (idPeriode: number): Promise<void> => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Validasi Status Periode (Harus sinkron dengan CHECK constraint DB)
    const { rows: periodeCheck } = await client.query(
      `SELECT status FROM tb_periode WHERE id_periode = $1 AND deleted_at IS NULL`,
      [idPeriode],
    );

    if (periodeCheck.length === 0) {
      throw new Error("Periode tidak ditemukan.");
    }

    // Status yang dikunci (Selesai / Diproses Gaji / Disetujui) tidak boleh di-kalkulasi ulang
    if (
      ["Selesai", "Diproses Gaji", "Disetujui"].includes(periodeCheck[0].status)
    ) {
      throw new Error(
        "Gagal kalkulasi! Periode ini sudah dikunci atau sedang diproses.",
      );
    }

    // 2. DELEGASIKAN KESELURUHAN KALKULASI KE DATABASE (Murni Set-Based Operation)
    // Semua hitungan formula, auto-init vertikal, bruto, potongan, dan snapshot detail di-handle di sini
    await client.query(`SELECT fungsi_kalkulasi_gaji_akhir($1)`, [idPeriode]);

    // 3. Update Status Periode ke Tahap Berikutnya setelah Kalkulasi Sukses
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
};
