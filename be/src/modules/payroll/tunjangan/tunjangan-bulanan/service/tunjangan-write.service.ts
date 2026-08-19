import { pool } from "../../../../../config/database";
import { TunjanganPegawaiInput } from "../tunjangan-bulanan.types";

export const saveBulk = async (
  id_periode: number,
  data_input: TunjanganPegawaiInput[],
) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Validasi Status Periode
    const pCheck = await client.query(
      "SELECT status FROM tb_periode WHERE id_periode = $1 AND deleted_at IS NULL",
      [id_periode],
    );
    if (pCheck.rows.length === 0) {
      throw new Error("Periode tidak ditemukan!");
    }
    if (["Dikunci", "Selesai", "Diproses Gaji"].includes(pCheck.rows[0].status)) {
      throw new Error("Gagal. Periode ini sudah dikunci atau selesai diproses!");
    }

    const arrHeaderPeriode: number[] = [];
    const arrHeaderPegawai: number[] = [];
    const arrHeaderJamLebih: number[] = [];
    const arrHeaderHonorBulan: number[] = [];

    const arrDetailPeriode: number[] = [];
    const arrDetailPegawai: number[] = [];
    const arrDetailIdTunjangan: number[] = [];
    const arrDetailNilai: number[] = [];

    for (const item of data_input) {
      if (item.details && item.details.length > 0) {
        for (const detail of item.details) {
          arrDetailPeriode.push(id_periode);
          arrDetailPegawai.push(item.id_pegawai);
          arrDetailIdTunjangan.push(detail.id_tunjangan);

          const val = parseFloat(detail.nilai_terhitung?.toString() || "0") || 0;
          arrDetailNilai.push(val);
        }
      }

      const jamLebih = parseFloat((item.total_jam_lebih ?? 0).toString()) || 0;
      const honor = parseFloat((item.honor_bulan ?? 0).toString()) || 0;

      arrHeaderPeriode.push(id_periode);
      arrHeaderPegawai.push(item.id_pegawai);
      arrHeaderJamLebih.push(jamLebih);
      arrHeaderHonorBulan.push(honor);
    }

    // 2. Upsert Header
    if (arrHeaderPegawai.length > 0) {
      const upsertHeader = `
        INSERT INTO tb_tunjangan_bulanan (
          id_periode, id_pegawai, total_jam_lebih, honor_bulan, total_tunjangan_terhitung
        )
        SELECT 
          t.id_periode, 
          t.id_pegawai, 
          t.total_jam_lebih, 
          t.honor_bulan, 
          0.00
        FROM UNNEST($1::int[], $2::int[], $3::numeric[], $4::numeric[]) 
          AS t(id_periode, id_pegawai, total_jam_lebih, honor_bulan)
        ON CONFLICT (id_periode, id_pegawai)
        DO UPDATE SET 
          total_jam_lebih = EXCLUDED.total_jam_lebih,
          honor_bulan = EXCLUDED.honor_bulan;
      `;
      await client.query(upsertHeader, [
        arrHeaderPeriode,
        arrHeaderPegawai,
        arrHeaderJamLebih,
        arrHeaderHonorBulan,
      ]);
    }

    // 3. Upsert Detail (jika ada input detail)
    if (arrDetailPegawai.length > 0) {
      const upsertDetail = `
        INSERT INTO tb_tunjangan_bulanan_detail (
          id_periode, id_pegawai, id_tunjangan, nilai_terhitung
        )
        SELECT 
          t.id_periode, 
          t.id_pegawai, 
          t.id_tunjangan, 
          t.nilai_terhitung
        FROM UNNEST($1::int[], $2::int[], $3::int[], $4::numeric[]) 
          AS t(id_periode, id_pegawai, id_tunjangan, nilai_terhitung)
        ON CONFLICT (id_periode, id_pegawai, id_tunjangan)
        DO UPDATE SET nilai_terhitung = EXCLUDED.nilai_terhitung;
      `;
      await client.query(upsertDetail, [
        arrDetailPeriode,
        arrDetailPegawai,
        arrDetailIdTunjangan,
        arrDetailNilai,
      ]);
    }

    // 4. Sinkronisasi Total Header (Honor + Detail)
    const syncHeaderQuery = `
      UPDATE tb_tunjangan_bulanan tb
      SET total_tunjangan_terhitung = COALESCE(tb.honor_bulan, 0.00) + COALESCE((
        SELECT SUM(tbd.nilai_terhitung)
        FROM tb_tunjangan_bulanan_detail tbd
        WHERE tbd.id_periode = tb.id_periode AND tbd.id_pegawai = tb.id_pegawai
      ), 0.00)
      WHERE tb.id_periode = $1;
    `;
    await client.query(syncHeaderQuery, [id_periode]);

    await client.query("COMMIT");
    return { message: "Data tunjangan dan rincian detail berhasil disimpan!" };
  } catch (error: any) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
