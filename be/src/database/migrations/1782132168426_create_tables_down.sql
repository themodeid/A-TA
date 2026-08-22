-- Drop Indexes
DROP INDEX IF EXISTS idx_pegawai_deleted_at;
DROP INDEX IF EXISTS idx_rekap_gaji_periode;
DROP INDEX IF EXISTS idx_potongan_detail_lookup;
DROP INDEX IF EXISTS idx_tunjangan_detail_lookup;

-- Drop Tables (in reverse dependency order)
DROP TABLE IF EXISTS tb_koreksi_jam CASCADE;
DROP TABLE IF EXISTS tb_rekap_gaji_detail CASCADE;
DROP TABLE IF EXISTS tb_rekap_gaji CASCADE;
DROP TABLE IF EXISTS tb_potongan_bulanan_detail CASCADE;
DROP TABLE IF EXISTS tb_potongan_bulanan CASCADE;
DROP TABLE IF EXISTS tb_tunjangan_bulanan_detail CASCADE;
DROP TABLE IF EXISTS tb_tunjangan_bulanan CASCADE;
DROP TABLE IF EXISTS tb_approval CASCADE;
DROP TABLE IF EXISTS tb_absensi_summary CASCADE;
DROP TABLE IF EXISTS tb_pegawai CASCADE;
DROP FUNCTION IF EXISTS public.fungsi_buka_periode_baru(VARCHAR, DATE, DATE);
DROP TABLE IF EXISTS tb_periode CASCADE;
DROP TABLE IF EXISTS tb_golongan CASCADE;
DROP TABLE IF EXISTS tb_jabatan CASCADE;
DROP TABLE IF EXISTS tb_master_potongan CASCADE;
DROP TABLE IF EXISTS tb_formula_potongan CASCADE;
DROP TABLE IF EXISTS tb_tunjangan CASCADE;
DROP TABLE IF EXISTS tb_formula_tunjangan CASCADE;
DROP TABLE IF EXISTS tb_pengguna CASCADE;
