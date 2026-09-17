-- ====================================================================
-- MIGRATION: 1782132168430_seed_revisi_data_down.sql
-- ROLLBACK SEED DATA REVISI
-- ====================================================================

DELETE FROM tb_notifikasi WHERE judul IN ('Sistem Siap Digunakan', 'Reminder Periode Cut-Off');
DELETE FROM tb_gaji_pokok;
