import { pool } from "../../../config/database";
import { initialize as initTunjangan } from "../tunjangan/tunjangan-bulanan/service/tunjangan-calc.service";

export interface CreatePeriodeDTO {
  bulan_gaji: string;
  tanggal_awal: Date | string;
  tanggal_akhir: Date | string;
  auto_init?: boolean;
  copy_potongan_from_periode_id?: number;
}

export interface AutoInitOptions {
  defaultAbsensi?: boolean;
  copyPotonganFromPeriodeId?: number;
}

// 1. Buang approver_id dari DTO
export interface ApprovalDTO {
  catatan?: string;
}

export interface PeriodeReadiness {
  isReady: boolean;
  totalPegawai: number;
  absensi: {
    filledCount: number;
    totalCount: number;
    isComplete: boolean;
    missingPegawai: { id_pegawai: number; nama: string }[];
  };
  tunjangan: {
    filledCount: number;
    totalCount: number;
    isComplete: boolean;
    missingPegawai: { id_pegawai: number; nama: string }[];
  };
  potongan: {
    filledCount: number;
    totalCount: number;
    isComplete: boolean;
    missingPegawai: { id_pegawai: number; nama: string }[];
  };
  reasons: string[];
}

export const checkPeriodeReadiness = async (
  idPeriode: number,
): Promise<PeriodeReadiness> => {
  const client = await pool.connect();
  try {
    // 1. Ambil semua pegawai aktif
    const pegawaiRes = await client.query(
      `SELECT id_pegawai, nama_dan_tanggal_lahir FROM tb_pegawai WHERE deleted_at IS NULL ORDER BY id_pegawai ASC;`,
    );
    const pegawaiList = pegawaiRes.rows;
    const totalPegawai = pegawaiList.length;

    // 2. Ambil absensi terisi untuk periode ini
    const absensiRes = await client.query(
      `SELECT id_pegawai FROM tb_absensi_summary WHERE id_periode = $1;`,
      [idPeriode],
    );
    const absensiIds = new Set(absensiRes.rows.map((r: any) => r.id_pegawai));
    const missingAbsensi = pegawaiList
      .filter((p: any) => !absensiIds.has(p.id_pegawai))
      .map((p: any) => ({
        id_pegawai: p.id_pegawai,
        nama: p.nama_dan_tanggal_lahir,
      }));

    // 3. Ambil tunjangan terisi untuk periode ini
    const tunjanganRes = await client.query(
      `SELECT id_pegawai FROM tb_tunjangan_bulanan WHERE id_periode = $1;`,
      [idPeriode],
    );
    const tunjanganIds = new Set(
      tunjanganRes.rows.map((r: any) => r.id_pegawai),
    );
    const missingTunjangan = pegawaiList
      .filter((p: any) => !tunjanganIds.has(p.id_pegawai))
      .map((p: any) => ({
        id_pegawai: p.id_pegawai,
        nama: p.nama_dan_tanggal_lahir,
      }));

    // 4. Ambil potongan terisi untuk periode ini
    const potonganRes = await client.query(
      `SELECT id_pegawai FROM tb_potongan_bulanan WHERE id_periode = $1;`,
      [idPeriode],
    );
    const potonganIds = new Set(potonganRes.rows.map((r: any) => r.id_pegawai));
    const missingPotongan = pegawaiList
      .filter((p: any) => !potonganIds.has(p.id_pegawai))
      .map((p: any) => ({
        id_pegawai: p.id_pegawai,
        nama: p.nama_dan_tanggal_lahir,
      }));

    const reasons: string[] = [];
    if (totalPegawai === 0) {
      reasons.push("Belum ada data pegawai aktif di master pegawai.");
    }
    if (missingAbsensi.length > 0) {
      reasons.push(
        `Data Absensi belum lengkap (${missingAbsensi.length} dari ${totalPegawai} pegawai belum ada data absensi).`,
      );
    }
    if (missingTunjangan.length > 0) {
      reasons.push(
        `Data Tunjangan Bulanan belum diinisialisasi/diisi untuk ${missingTunjangan.length} dari ${totalPegawai} pegawai.`,
      );
    }
    if (missingPotongan.length > 0) {
      reasons.push(
        `Data Potongan Bulanan belum diinisialisasi/diisi untuk ${missingPotongan.length} dari ${totalPegawai} pegawai.`,
      );
    }

    const isReady =
      totalPegawai > 0 &&
      missingAbsensi.length === 0 &&
      missingTunjangan.length === 0 &&
      missingPotongan.length === 0;

    return {
      isReady,
      totalPegawai,
      absensi: {
        filledCount: absensiIds.size,
        totalCount: totalPegawai,
        isComplete: totalPegawai > 0 && missingAbsensi.length === 0,
        missingPegawai: missingAbsensi,
      },
      tunjangan: {
        filledCount: tunjanganIds.size,
        totalCount: totalPegawai,
        isComplete: totalPegawai > 0 && missingTunjangan.length === 0,
        missingPegawai: missingTunjangan,
      },
      potongan: {
        filledCount: potonganIds.size,
        totalCount: totalPegawai,
        isComplete: totalPegawai > 0 && missingPotongan.length === 0,
        missingPegawai: missingPotongan,
      },
      reasons,
    };
  } finally {
    client.release();
  }
};

// 1. SUBMIT APPROVAL: 'Pengisian Absensi' atau 'Ditolak' -> 'Menunggu Approval'
export const submitApprovalPeriode = async (id: number) => {
  const periode = await getPeriodeById(id);

  if (periode.status !== "Pengisian Absensi" && periode.status !== "Ditolak") {
    throw new Error(
      `Status periode saat ini '${periode.status}'. Hanya periode berstatus 'Pengisian Absensi' atau 'Ditolak' yang bisa diajukan.`,
    );
  }

  // Cek validasi kelengkapan data absensi, tunjangan, dan potongan
  const readiness = await checkPeriodeReadiness(id);
  if (!readiness.isReady) {
    throw new Error(
      `Pengajuan Approval Ditolak: ${readiness.reasons.join(" ")}`,
    );
  }

  return await updatePeriode(id, { status: "Menunggu Approval" });
};

export const approvePeriode = async (id: number, data: ApprovalDTO) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Lock baris periode
    const checkQuery = `
      SELECT status FROM tb_periode 
      WHERE id_periode = $1 AND deleted_at IS NULL 
      FOR UPDATE;
    `;
    const checkRes = await client.query(checkQuery, [id]);
    const currentStatus = checkRes.rows[0]?.status;

    if (!currentStatus) {
      throw new Error(`Periode dengan ID ${id} tidak ditemukan.`);
    }

    if (currentStatus !== "Menunggu Approval") {
      throw new Error(
        `Gagal Approve: Status periode saat ini '${currentStatus}', seharusnya 'Menunggu Approval'.`,
      );
    }

    // Validasi: Pastikan absensi seluruh pegawai aktif sudah terisi lengkap
    const pegawaiCountRes = await client.query(
      `SELECT COUNT(*)::int AS total FROM tb_pegawai WHERE deleted_at IS NULL;`,
    );
    const totalPegawai = pegawaiCountRes.rows[0]?.total || 0;

    const absensiCountRes = await client.query(
      `SELECT COUNT(DISTINCT id_pegawai)::int AS total FROM tb_absensi_summary WHERE id_periode = $1;`,
      [id],
    );
    const totalAbsensi = absensiCountRes.rows[0]?.total || 0;

    if (totalPegawai === 0) {
      throw new Error("Gagal Approve: Belum ada data pegawai aktif.");
    }

    if (totalAbsensi < totalPegawai) {
      throw new Error(
        `Gagal Approve: Absensi belum terisi lengkap untuk semua pegawai (${totalAbsensi} dari ${totalPegawai} pegawai yang memiliki rekap absensi). Harap lengkapi absensi terlebih dahulu.`,
      );
    }

    // Update Status Periode
    const updateQuery = `
      UPDATE tb_periode 
      SET status = 'Disetujui' 
      WHERE id_periode = $1 
      RETURNING *;
    `;
    const updatedPeriodeRes = await client.query(updateQuery, [id]);

    // 2. Query INSERT tanpa approver_id
    const logQuery = `
      INSERT INTO tb_approval (id_periode, status, catatan)
      VALUES ($1, 'Approved', $2)
      RETURNING *;
    `;
    await client.query(logQuery, [id, data.catatan || "Disetujui"]);

    await client.query("COMMIT");
    return updatedPeriodeRes.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error di approvePeriode Service:", error);
    throw error;
  } finally {
    client.release();
  }
};

// 3. REJECT PERIODE: 'Menunggu Approval' -> 'Ditolak' + Transaction Log
export const rejectPeriode = async (id: number, data: ApprovalDTO) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const checkQuery = `
      SELECT status FROM tb_periode 
      WHERE id_periode = $1 AND deleted_at IS NULL 
      FOR UPDATE;
    `;
    const checkRes = await client.query(checkQuery, [id]);
    const currentStatus = checkRes.rows[0]?.status;

    if (!currentStatus) {
      throw new Error(`Periode dengan ID ${id} tidak ditemukan.`);
    }

    if (currentStatus !== "Menunggu Approval") {
      throw new Error(
        `Gagal Reject: Status periode saat ini '${currentStatus}', seharusnya 'Menunggu Approval'.`,
      );
    }

    // Update Status Periode
    const updateQuery = `
      UPDATE tb_periode 
      SET status = 'Ditolak' 
      WHERE id_periode = $1 
      RETURNING *;
    `;
    const updatedPeriodeRes = await client.query(updateQuery, [id]);

    // Insert Log ke tb_approval
    const logQuery = `
      INSERT INTO tb_approval (id_periode, status, catatan)
      VALUES ($1, 'Rejected', $2)
      RETURNING *;
    `;
    await client.query(logQuery, [id, data.catatan || "Ditolak"]);

    await client.query("COMMIT");
    return updatedPeriodeRes.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error di rejectPeriode Service:", error);
    throw error;
  } finally {
    client.release();
  }
};

// AUTO-INIT: Inisialisasi otomatis semua data transaksi (Absensi, Tunjangan, Potongan)
export const initializeAllPeriodeData = async (
  idPeriode: number,
  options: AutoInitOptions = {},
) => {
  const client = await pool.connect();
  try {
    // 1. Ambil info periode
    const periodeRes = await client.query(
      `SELECT id_periode, tanggal_awal, tanggal_akhir, status FROM tb_periode WHERE id_periode = $1 AND deleted_at IS NULL;`,
      [idPeriode],
    );
    const periode = periodeRes.rows[0];
    if (!periode) {
      throw new Error(`Periode dengan ID ${idPeriode} tidak ditemukan.`);
    }

    // 2. Ambil pegawai aktif
    const pegawaiRes = await client.query(
      `SELECT id_pegawai FROM tb_pegawai WHERE deleted_at IS NULL ORDER BY id_pegawai ASC;`,
    );
    const pegawaiList = pegawaiRes.rows;
    if (pegawaiList.length === 0) {
      return {
        message: "Tidak ada pegawai aktif untuk diinisialisasi.",
        totalPegawai: 0,
      };
    }

    // 3. Inisialisasi Absensi Default jika diminta (default: true)
    if (options.defaultAbsensi !== false) {
      // Hitung hari kerja efektif (Senin-Jumat) antara tanggal_awal dan tanggal_akhir
      const workDaysRes = await client.query(
        `SELECT COUNT(*)::int AS working_days 
         FROM generate_series($1::date, $2::date, '1 day'::interval) d 
         WHERE EXTRACT(DOW FROM d) NOT IN (0, 6);`,
        [periode.tanggal_awal, periode.tanggal_akhir],
      );
      const defaultWorkingDays = workDaysRes.rows[0]?.working_days || 22;

      // Insert default absensi summary untuk setiap pegawai yang belum ada
      const absensiQuery = `
        INSERT INTO tb_absensi_summary (
          id_periode, id_pegawai, total_hadir_ops_wfo, total_hadir_ops_wfh, total_izin, total_sakit, total_alpha
        )
        SELECT $1, id_pegawai, $2, 0, 0, 0, 0
        FROM tb_pegawai
        WHERE deleted_at IS NULL
        ON CONFLICT (id_periode, id_pegawai) DO NOTHING;
      `;
      await client.query(absensiQuery, [idPeriode, defaultWorkingDays]);
    }

    // 4. Inisialisasi Potongan
    // a. Buat header untuk semua pegawai
    const potHeaderQuery = `
      INSERT INTO tb_potongan_bulanan (id_periode, id_pegawai, total_potongan_terhitung)
      SELECT $1, id_pegawai, 0.00
      FROM tb_pegawai
      WHERE deleted_at IS NULL
      ON CONFLICT (id_periode, id_pegawai) DO NOTHING;
    `;
    await client.query(potHeaderQuery, [idPeriode]);

    // b. Jika ada copyPotonganFromPeriodeId, salin detail potongan dari periode sebelumnya
    if (options.copyPotonganFromPeriodeId) {
      const copyPotDetailQuery = `
        INSERT INTO tb_potongan_bulanan_detail (id_periode, id_pegawai, id_master_potongan, nilai_potongan)
        SELECT $1, pbd.id_pegawai, pbd.id_master_potongan, pbd.nilai_potongan
        FROM tb_potongan_bulanan_detail pbd
        JOIN tb_pegawai p ON p.id_pegawai = pbd.id_pegawai
        WHERE pbd.id_periode = $2 AND p.deleted_at IS NULL
        ON CONFLICT (id_periode, id_pegawai, id_master_potongan)
        DO UPDATE SET nilai_potongan = EXCLUDED.nilai_potongan;
      `;
      await client.query(copyPotDetailQuery, [
        idPeriode,
        options.copyPotonganFromPeriodeId,
      ]);

      // Sync header total potongan
      const syncPotHeaderQuery = `
        INSERT INTO tb_potongan_bulanan (id_periode, id_pegawai, total_potongan_terhitung)
        SELECT 
          pbd.id_periode,
          pbd.id_pegawai,
          COALESCE(SUM(pbd.nilai_potongan), 0)
        FROM tb_potongan_bulanan_detail pbd
        WHERE pbd.id_periode = $1
        GROUP BY pbd.id_periode, pbd.id_pegawai
        ON CONFLICT (id_periode, id_pegawai)
        DO UPDATE SET total_potongan_terhitung = EXCLUDED.total_potongan_terhitung;
      `;
      await client.query(syncPotHeaderQuery, [idPeriode]);
    }
  } finally {
    client.release();
  }

  // 5. Inisialisasi Tunjangan (menggunakan initTunjangan yang mengkalkulasi formula master tunjangan & transport WFO dari absensi)
  await initTunjangan(idPeriode);

  return {
    message: "Inisialisasi seluruh data periode (Absensi, Tunjangan, Potongan) berhasil.",
    idPeriode,
  };
};

// CREATE: Membuka periode baru memanfaatkan Stored Function DB
export const createPeriode = async (data: CreatePeriodeDTO) => {
  let newPeriodeId: number | null = null;
  const client = await pool.connect();
  try {
    const { bulan_gaji, tanggal_awal, tanggal_akhir } = data;

    // Jalankan query dengan memanggil fungsi database yang sudah kita buat
    const result = await client.query(
      `SELECT public.fungsi_buka_periode_baru($1::varchar, $2::date, $3::date) AS id_periode;`,
      [bulan_gaji, tanggal_awal, tanggal_akhir],
    );

    newPeriodeId = result.rows[0]?.id_periode;

    if (!newPeriodeId) {
      throw new Error("Gagal membuka periode baru melalui Database Function");
    }
  } catch (error) {
    console.error("Error di createPeriode Service:", error);
    throw error;
  } finally {
    client.release();
  }

  if (newPeriodeId && data.auto_init) {
    await initializeAllPeriodeData(newPeriodeId, {
      defaultAbsensi: true,
      copyPotonganFromPeriodeId: data.copy_potongan_from_periode_id,
    });
  }

  // Ambil data lengkap periode yang baru dibuat untuk dikembalikan ke controller
  return await getPeriodeById(newPeriodeId!);
};

// READ: Mengambil semua periode yang aktif
export const getAllPeriode = async () => {
  const client = await pool.connect();
  try {
    const query = `
      SELECT * FROM tb_periode 
      WHERE deleted_at IS NULL 
      ORDER BY tanggal_awal DESC;
    `;
    const result = await client.query(query);
    return result.rows;
  } finally {
    client.release();
  }
};

// READ: Mengambil detail satu periode berdasarkan ID
export const getPeriodeById = async (id: number) => {
  const client = await pool.connect();
  try {
    const query = `
      SELECT * FROM tb_periode 
      WHERE id_periode = $1 AND deleted_at IS NULL;
    `;
    const result = await client.query(query, [id]);
    const periode = result.rows[0];

    if (!periode) {
      throw new Error(
        `Periode dengan ID ${id} tidak ditemukan atau telah dihapus`,
      );
    }
    return periode;
  } finally {
    client.release();
  }
};

// UPDATE: Mengubah data dasar periode dinamis
export const updatePeriode = async (
  id: number,
  data: Partial<CreatePeriodeDTO> & { status?: string },
) => {
  // 1. Validasi keberadaan data (Pastikan id_periode ini memang ada)
  await getPeriodeById(id);

  const client = await pool.connect();
  try {
    const fields: string[] = [];
    const values: any[] = [];
    let placeholderCounter = 1;

    if (data.bulan_gaji) {
      fields.push(`bulan_gaji = $${placeholderCounter++}::varchar`);
      values.push(data.bulan_gaji);
    }
    if (data.tanggal_awal) {
      // Kirim string mentah 'YYYY-MM-DD', lalu cast ke ::date di Postgres
      fields.push(`tanggal_awal = $${placeholderCounter++}::date`);
      values.push(data.tanggal_awal);
    }
    if (data.tanggal_akhir) {
      // Kirim string mentah 'YYYY-MM-DD', lalu cast ke ::date di Postgres
      fields.push(`tanggal_akhir = $${placeholderCounter++}::date`);
      values.push(data.tanggal_akhir);
    }
    if (data.status) {
      fields.push(`status = $${placeholderCounter++}::varchar`);
      values.push(data.status);
    }

    // Cek apakah ada field yang mau di-update
    if (fields.length === 0) {
      throw new Error("Tidak ada data baru yang dikirim untuk di-update");
    }

    // Masukkan id ke paling akhir array parameter untuk WHERE clause
    values.push(id);
    const query = `
      UPDATE tb_periode 
      SET ${fields.join(", ")} 
      WHERE id_periode = $${placeholderCounter}
      RETURNING *;
    `;

    const result = await client.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error("Error di updatePeriode Service:", error);
    throw error;
  } finally {
    client.release();
  }
};

// DELETE: Menggunakan Soft-Delete
export const deletePeriode = async (id: number) => {
  await getPeriodeById(id);

  const client = await pool.connect();
  try {
    const query = `
      UPDATE tb_periode 
      SET deleted_at = $1 
      WHERE id_periode = $2
      RETURNING *;
    `;

    const result = await client.query(query, [new Date(), id]);
    return result.rows[0];
  } finally {
    client.release();
  }
};
