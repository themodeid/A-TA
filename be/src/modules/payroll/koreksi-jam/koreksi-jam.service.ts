import { pool } from "../../../config/database";
import { calculate } from "../tunjangan/tunjangan-bulanan/service/tunjangan-calc.service";
import { CreateKoreksiJamDto, KoreksiJamFilter, KoreksiJamRecord } from "./koreksi-jam.type";

export const getKoreksiJam = async (filter: KoreksiJamFilter = {}): Promise<KoreksiJamRecord[]> => {
  let query = `
    SELECT 
      k.id_koreksi,
      k.id_periode,
      prd.bulan_gaji,
      prd.status AS status_periode,
      k.id_pegawai,
      p.nama_dan_tanggal_lahir AS nama_pegawai,
      j.nama_jabatan,
      g.nama_golongan,
      k.id_staf_gaji,
      u.nama_lengkap AS nama_staf_gaji,
      k.jam_awal,
      k.jam_koreksi,
      k.jam_akhir,
      k.jenis_koreksi,
      k.keterangan,
      k.bukti_dokumen,
      k.created_at
    FROM tb_koreksi_jam k
    JOIN tb_periode prd ON k.id_periode = prd.id_periode
    JOIN tb_pegawai p ON k.id_pegawai = p.id_pegawai
    LEFT JOIN tb_jabatan j ON p.id_jabatan = j.id_jabatan
    LEFT JOIN tb_golongan g ON p.id_golongan = g.id_golongan
    LEFT JOIN tb_pengguna u ON k.id_staf_gaji = u.id_pengguna
    WHERE 1=1
  `;

  const values: any[] = [];
  let paramIdx = 1;

  if (filter.id_periode) {
    query += ` AND k.id_periode = $${paramIdx++}`;
    values.push(filter.id_periode);
  }

  if (filter.id_pegawai) {
    query += ` AND k.id_pegawai = $${paramIdx++}`;
    values.push(filter.id_pegawai);
  }

  query += ` ORDER BY k.created_at DESC, k.id_koreksi DESC`;

  const result = await pool.query(query, values);
  return result.rows;
};

export const createKoreksiJam = async (data: CreateKoreksiJamDto): Promise<KoreksiJamRecord> => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Cek validitas & status periode
    const pCheck = await client.query(
      "SELECT id_periode, bulan_gaji, status FROM tb_periode WHERE id_periode = $1 AND deleted_at IS NULL",
      [data.id_periode]
    );

    if (pCheck.rows.length === 0) {
      throw new Error("Periode tidak ditemukan!");
    }

    const currentStatus = pCheck.rows[0].status;
    if (["Dikunci", "Selesai", "Diproses Gaji"].includes(currentStatus)) {
      throw new Error(`Gagal. Periode berstatus "${currentStatus}" sehingga tidak dapat dikoreksi.`);
    }

    // 2. Cek pegawai
    const pegCheck = await client.query(
      "SELECT id_pegawai, nama_dan_tanggal_lahir FROM tb_pegawai WHERE id_pegawai = $1 AND deleted_at IS NULL",
      [data.id_pegawai]
    );
    if (pegCheck.rows.length === 0) {
      throw new Error("Pegawai tidak ditemukan!");
    }

    // 3. Tentukan user penginput (staf gaji)
    let stafGajiId = data.id_staf_gaji;
    if (!stafGajiId) {
      const defaultUser = await client.query("SELECT id_pengguna FROM tb_pengguna LIMIT 1");
      stafGajiId = defaultUser.rows[0]?.id_pengguna || 1;
    }

    // 4. Hitung jam_awal dari akumulasi sebelumnya
    const currentSumRes = await client.query(
      `SELECT COALESCE(SUM(
        CASE 
          WHEN jenis_koreksi = 'ADD' THEN jam_koreksi 
          WHEN jenis_koreksi = 'SUBTRACT' THEN -jam_koreksi 
          ELSE 0 
        END
      ), 0.00) AS total_jam
      FROM tb_koreksi_jam
      WHERE id_periode = $1 AND id_pegawai = $2`,
      [data.id_periode, data.id_pegawai]
    );

    const jamAwal = parseFloat(currentSumRes.rows[0].total_jam) || 0.00;
    const jamKoreksi = parseFloat(String(data.jam_koreksi));

    if (isNaN(jamKoreksi) || jamKoreksi <= 0) {
      throw new Error("Nilai jam koreksi harus lebih besar dari 0!");
    }

    let jamAkhir = 0.00;
    if (data.jenis_koreksi === "ADD") {
      jamAkhir = jamAwal + jamKoreksi;
    } else if (data.jenis_koreksi === "SUBTRACT") {
      jamAkhir = jamAwal - jamKoreksi;
      if (jamAkhir < 0) {
        throw new Error(`Pengurangan jam melebihi total jam lembur yang tercatat (${jamAwal} jam)!`);
      }
    } else {
      throw new Error("Jenis koreksi harus berupa 'ADD' atau 'SUBTRACT'!");
    }

    // 5. Insert log koreksi
    const insertQuery = `
      INSERT INTO tb_koreksi_jam (
        id_periode,
        id_pegawai,
        id_staf_gaji,
        jam_awal,
        jam_koreksi,
        jam_akhir,
        jenis_koreksi,
        keterangan,
        bukti_dokumen
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `;

    const insertRes = await client.query(insertQuery, [
      data.id_periode,
      data.id_pegawai,
      stafGajiId,
      jamAwal,
      jamKoreksi,
      jamAkhir,
      data.jenis_koreksi,
      data.keterangan,
      data.bukti_dokumen || null,
    ]);

    await client.query("COMMIT");

    // 6. Sinkronisasi kalkulasi tunjangan lembur periode secara otomatis
    try {
      await calculate(data.id_periode);
    } catch (calcErr) {
      console.warn("[KoreksiJam] Warning saat auto calculate tunjangan:", calcErr);
    }

    return insertRes.rows[0];
  } catch (error: any) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const deleteKoreksiJam = async (id_koreksi: number): Promise<boolean> => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Ambil data koreksi & cek status periode
    const checkRes = await client.query(
      `SELECT k.id_koreksi, k.id_periode, prd.status AS status_periode
       FROM tb_koreksi_jam k
       JOIN tb_periode prd ON k.id_periode = prd.id_periode
       WHERE k.id_koreksi = $1`,
      [id_koreksi]
    );

    if (checkRes.rows.length === 0) {
      throw new Error("Data koreksi jam tidak ditemukan!");
    }

    const { id_periode, status_periode } = checkRes.rows[0];
    if (["Dikunci", "Selesai", "Diproses Gaji"].includes(status_periode)) {
      throw new Error(`Gagal menghapus. Periode berstatus "${status_periode}".`);
    }

    // 2. Hapus data
    await client.query("DELETE FROM tb_koreksi_jam WHERE id_koreksi = $1", [id_koreksi]);

    await client.query("COMMIT");

    // 3. Rekalkulasi tunjangan periode
    try {
      await calculate(id_periode);
    } catch (calcErr) {
      console.warn("[KoreksiJam] Warning saat auto calculate setelah delete:", calcErr);
    }

    return true;
  } catch (error: any) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
