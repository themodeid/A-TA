-- ====================================================================
-- MIGRATION: 1782132168430_seed_revisi_data_up.sql
-- SEED DATA REVISI: tb_gaji_pokok, tb_absensi, tb_jam_mengajar, tb_notifikasi
-- ====================================================================

-- Pastikan kolom golongan_ruang cukup lebar untuk nama golongan
ALTER TABLE tb_gaji_pokok ALTER COLUMN golongan_ruang TYPE VARCHAR(100);

-- 1. Update detail tb_pegawai
UPDATE tb_pegawai 
SET 
    nama = 'Adam Wahyu Kurniawan',
    tanggal_lahir = '2005-01-01',
    nip = '202343500510',
    status_kepegawaian = 'GTY',
    kontak = '081234567890'
WHERE nama_dan_tanggal_lahir LIKE 'Adam Wahyu Kurniawan%';

UPDATE tb_pegawai 
SET 
    nama = 'Pak Thomas (Approver)',
    tanggal_lahir = '1975-05-12',
    nip = '197505122001',
    status_kepegawaian = 'GTY',
    kontak = '081234567891'
WHERE nama_dan_tanggal_lahir LIKE '%Thomas%';

UPDATE tb_pegawai 
SET 
    nama = 'Pak Rendy (Petugas Absensi)',
    tanggal_lahir = '1982-08-20',
    nip = '198208202005',
    status_kepegawaian = 'PTY',
    kontak = '081234567892'
WHERE nama_dan_tanggal_lahir LIKE '%Rendy%';

UPDATE tb_pegawai 
SET 
    nama = 'Bu Maria (Staf Gaji)',
    tanggal_lahir = '1990-11-03',
    nip = '199011032015',
    status_kepegawaian = 'PTY',
    kontak = '081234567893'
WHERE nama_dan_tanggal_lahir LIKE '%Maria%';

-- Update bulan dan tahun pada tb_periode
UPDATE tb_periode 
SET 
    bulan = 7,
    tahun = 2026
WHERE bulan_gaji = 'Juli 2026';

-- 2. Seed tb_gaji_pokok untuk seluruh pegawai yang ada
INSERT INTO tb_gaji_pokok (
    id_pegawai,
    golongan_ruang,
    status_kawin,
    jumlah_anak,
    gaji_pokok_pp,
    tunjangan_suami_istri,
    tunjangan_anak,
    tunjangan_kesra_dasar,
    tunjangan_jabatan_struktural,
    tunjangan_jabatan_fungsional,
    tunjangan_jabatan_25_pp85,
    sumbangan_dana_chuk_2,
    sumbangan_dana_chuk_8,
    tunjangan_perbaikan_penghasilan,
    pembulatan,
    jumlah_bruto,
    potongan_angsuran_pinjaman,
    potongan_simpanan_wajib,
    potongan_dana_chuk,
    potongan_premi_kesehatan,
    total_potongan_tetap,
    gaji_bersih_tetap
)
SELECT 
    p.id_pegawai,
    COALESCE(g.nama_golongan, 'Golongan III/a'),
    COALESCE(p.status_perkawinan, 'TK'),
    COALESCE(p.jumlah_anak, 0),
    COALESCE(p.gaji_pokok_dasar, 3000000.00) AS gaji_pokok_pp,
    -- Tunjangan Istri 10% jika K
    CASE WHEN p.status_perkawinan = 'K' THEN (COALESCE(p.gaji_pokok_dasar, 3000000.00) * 0.10) ELSE 0 END AS tunjangan_suami_istri,
    -- Tunjangan Anak 2% per anak (maks 3 anak)
    (COALESCE(p.gaji_pokok_dasar, 3000000.00) * 0.02 * LEAST(COALESCE(p.jumlah_anak, 0), 3)) AS tunjangan_anak,
    150000.00 AS tunjangan_kesra_dasar,
    COALESCE(j.tunjangan_jabatan_struktural, 0) AS tunjangan_jabatan_struktural,
    0.00 AS tunjangan_jabatan_fungsional,
    (COALESCE(p.gaji_pokok_dasar, 3000000.00) * 0.25) AS tunjangan_jabatan_25_pp85,
    (COALESCE(p.gaji_pokok_dasar, 3000000.00) * 0.02) AS sumbangan_dana_chuk_2,
    (COALESCE(p.gaji_pokok_dasar, 3000000.00) * 0.08) AS sumbangan_dana_chuk_8,
    200000.00 AS tunjangan_perbaikan_penghasilan,
    500.00 AS pembulatan,
    -- Jumlah Bruto
    (COALESCE(p.gaji_pokok_dasar, 3000000.00) 
        + CASE WHEN p.status_perkawinan = 'K' THEN (COALESCE(p.gaji_pokok_dasar, 3000000.00) * 0.10) ELSE 0 END
        + (COALESCE(p.gaji_pokok_dasar, 3000000.00) * 0.02 * LEAST(COALESCE(p.jumlah_anak, 0), 3))
        + 150000.00
        + COALESCE(j.tunjangan_jabatan_struktural, 0)
        + (COALESCE(p.gaji_pokok_dasar, 3000000.00) * 0.25)
        + 200000.00
    ) AS jumlah_bruto,
    -- Potongan Tetap
    0.00 AS potongan_angsuran_pinjaman,
    50000.00 AS potongan_simpanan_wajib,
    (COALESCE(p.gaji_pokok_dasar, 3000000.00) * 0.02) AS potongan_dana_chuk,
    100000.00 AS potongan_premi_kesehatan,
    (150000.00 + (COALESCE(p.gaji_pokok_dasar, 3000000.00) * 0.02)) AS total_potongan_tetap,
    -- Gaji Bersih Tetap
    ((COALESCE(p.gaji_pokok_dasar, 3000000.00) 
        + CASE WHEN p.status_perkawinan = 'K' THEN (COALESCE(p.gaji_pokok_dasar, 3000000.00) * 0.10) ELSE 0 END
        + (COALESCE(p.gaji_pokok_dasar, 3000000.00) * 0.02 * LEAST(COALESCE(p.jumlah_anak, 0), 3))
        + 150000.00
        + COALESCE(j.tunjangan_jabatan_struktural, 0)
        + (COALESCE(p.gaji_pokok_dasar, 3000000.00) * 0.25)
        + 200000.00
    ) - (150000.00 + (COALESCE(p.gaji_pokok_dasar, 3000000.00) * 0.02))) AS gaji_bersih_tetap
FROM tb_pegawai p
LEFT JOIN tb_jabatan j ON p.id_jabatan = j.id_jabatan
LEFT JOIN tb_golongan g ON p.id_golongan = g.id_golongan
ON CONFLICT (id_pegawai) DO NOTHING;

-- 3. Seed Notifikasi Awal In-App (Demo Lonceng Notifikasi)
INSERT INTO tb_notifikasi (id_pengguna, judul, pesan, tipe, tautan, is_read)
SELECT 
    id_pengguna,
    'Sistem Siap Digunakan',
    'Selamat datang di Sistem Informasi Penggajian SMK PSKD 3 Jakarta. Seluruh modul telah tersinkronisasi.',
    'INFO',
    '/dashboard',
    false
FROM tb_pengguna;

-- Notifikasi Reminder Cut-Off untuk Petugas Absensi
INSERT INTO tb_notifikasi (id_pengguna, judul, pesan, tipe, tautan, is_read)
SELECT 
    id_pengguna,
    'Reminder Periode Cut-Off',
    'Besok tanggal 16, mohon mulai input rekap absensi periode ini melalui form grid.',
    'REMINDER',
    '/absensi',
    false
FROM tb_pengguna
WHERE role = 'Petugas Absensi';
