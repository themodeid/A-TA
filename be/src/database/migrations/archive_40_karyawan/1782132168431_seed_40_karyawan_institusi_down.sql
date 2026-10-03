-- ====================================================================
-- MIGRATION: 1782132168431_seed_40_karyawan_institusi_down.sql
-- ROLLBACK SEED 40 KARYAWAN INSTITUSI
-- ====================================================================

-- Hapus jam mengajar dan absensi terkait NIP 40 pegawai
DELETE FROM tb_jam_mengajar 
WHERE id_pegawai IN (
    SELECT id_pegawai FROM tb_pegawai WHERE nip LIKE '08121111%' OR nip LIKE '197505122001%' OR nip LIKE '197803102003%'
);

DELETE FROM tb_absensi_summary 
WHERE id_pegawai IN (
    SELECT id_pegawai FROM tb_pegawai WHERE nip LIKE '08121111%' OR nip LIKE '197505122001%' OR nip LIKE '197803102003%'
);

DELETE FROM tb_gaji_pokok 
WHERE id_pegawai IN (
    SELECT id_pegawai FROM tb_pegawai WHERE nip LIKE '08121111%' OR nip LIKE '197505122001%' OR nip LIKE '197803102003%'
);

DELETE FROM tb_pegawai 
WHERE nip LIKE '08121111%' OR nip LIKE '197505122001%' OR nip LIKE '197803102003%';
