-- ====================================================================
-- MIGRATION: 1782132168429_sync_revisi_tables_down.sql
-- ROLLBACK SINKRONISASI 13 TABEL DOKUMEN REVISI TA
-- ====================================================================

DROP TABLE IF EXISTS tb_notifikasi CASCADE;
DROP TABLE IF EXISTS tb_permintaan_pembayaran_detail CASCADE;
DROP TABLE IF EXISTS tb_permintaan_pembayaran CASCADE;
DROP TABLE IF EXISTS tb_tunjangan_periode CASCADE;
DROP TABLE IF EXISTS tb_gaji_pokok CASCADE;
DROP TABLE IF EXISTS tb_jam_mengajar CASCADE;
DROP TABLE IF EXISTS tb_absensi CASCADE;

ALTER TABLE tb_rekap_gaji
    DROP COLUMN IF EXISTS transport_uang_makan,
    DROP COLUMN IF EXISTS tunjangan_jabatan_dll,
    DROP COLUMN IF EXISTS gaji_kompetensi,
    DROP COLUMN IF EXISTS hari_hadir;

ALTER TABLE tb_approval
    DROP COLUMN IF EXISTS id_approver;

ALTER TABLE tb_periode
    DROP COLUMN IF EXISTS tahun,
    DROP COLUMN IF EXISTS bulan;

ALTER TABLE tb_jabatan
    DROP COLUMN IF EXISTS tunjangan_jabatan_fungsional;

ALTER TABLE tb_pegawai
    DROP COLUMN IF EXISTS kontak,
    DROP COLUMN IF EXISTS status_kepegawaian,
    DROP COLUMN IF EXISTS nip,
    DROP COLUMN IF EXISTS tanggal_lahir,
    DROP COLUMN IF EXISTS nama;
