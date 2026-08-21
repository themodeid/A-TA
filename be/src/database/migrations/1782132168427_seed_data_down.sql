-- Rollback Seed Data (Truncate/Delete transactional and master data)
DELETE FROM tb_rekap_gaji_detail;
DELETE FROM tb_rekap_gaji;
DELETE FROM tb_potongan_bulanan_detail;
DELETE FROM tb_potongan_bulanan;
DELETE FROM tb_tunjangan_bulanan_detail;
DELETE FROM tb_tunjangan_bulanan;
DELETE FROM tb_absensi_summary;
DELETE FROM tb_koreksi_jam;
DELETE FROM tb_approval;
DELETE FROM tb_pegawai;
DELETE FROM tb_periode;
DELETE FROM tb_golongan;
DELETE FROM tb_jabatan;
DELETE FROM tb_master_potongan;
DELETE FROM tb_tunjangan;
DELETE FROM tb_formula_potongan;
DELETE FROM tb_formula_tunjangan;
