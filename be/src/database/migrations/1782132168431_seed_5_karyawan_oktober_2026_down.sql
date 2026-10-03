-- ====================================================================
-- MIGRATION: 1782132168431_seed_5_karyawan_oktober_2026_down.sql
-- ====================================================================

DELETE FROM tb_rekap_gaji_detail;
DELETE FROM tb_rekap_gaji;
DELETE FROM tb_tunjangan_bulanan_detail;
DELETE FROM tb_tunjangan_bulanan;
DELETE FROM tb_potongan_bulanan_detail;
DELETE FROM tb_potongan_bulanan;
DELETE FROM tb_koreksi_jam;
DELETE FROM tb_jam_mengajar;
DELETE FROM tb_absensi;
DELETE FROM tb_absensi_summary;
DELETE FROM tb_approval;
DELETE FROM tb_notifikasi;
DELETE FROM tb_gaji_pokok;
DELETE FROM tb_periode WHERE id_periode = 1;
DELETE FROM tb_pegawai WHERE id_pegawai IN (1, 2, 3, 4, 5);
