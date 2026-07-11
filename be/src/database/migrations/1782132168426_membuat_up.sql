-- ==========================================
-- I. MASTER TABLES (Tabel Utama / Referensi)
-- ==========================================

-- 1. Master Pengguna
CREATE TABLE IF NOT EXISTS tb_pengguna (
    id_pengguna SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('Admin', 'Petugas Absensi', 'Approver', 'Staf Gaji')),
    deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- 2. Master Parameter / Tunjangan
CREATE TABLE IF NOT EXISTS tb_tunjangan (
    id_tunjangan SERIAL PRIMARY KEY,
    nama_tunjangan VARCHAR(100) NOT NULL,
    nilai NUMERIC(12, 2) NOT NULL,
    jenis_tunjangan VARCHAR(20) NOT NULL,
    sifat_tunjangan VARCHAR(20) NOT NULL,
    keterangan TEXT,
    kode_kondisi VARCHAR(20) NOT NULL DEFAULT 'UMUM',
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    CONSTRAINT unique_kode_kondisi UNIQUE (kode_kondisi),
    CONSTRAINT chk_jenis_tunjangan CHECK (jenis_tunjangan IN ('NOMINAL', 'PERSENTASE')),
    CONSTRAINT chk_sifat_tunjangan CHECK (sifat_tunjangan IN ('BULANAN', 'HARIAN'))
);

-- 3. Master Jabatan
CREATE TABLE IF NOT EXISTS tb_jabatan (
    id_jabatan SERIAL PRIMARY KEY,
    nama_jabatan VARCHAR(50) UNIQUE NOT NULL,
    tunjangan_jabatan_struktural NUMERIC(12, 2) DEFAULT 0,
    deleted_at TIMESTAMPTZ DEFAULT NULL 
);

-- 4. Master Golongan
CREATE TABLE IF NOT EXISTS tb_golongan (
    id_golongan SERIAL PRIMARY KEY,
    nama_golongan VARCHAR(50) UNIQUE NOT NULL, 
    gaji_pokok_standar NUMERIC(12, 2) NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- 5. Master Periode Cut-off 
CREATE TABLE IF NOT EXISTS tb_periode (
    id_periode SERIAL PRIMARY KEY,
    bulan_gaji VARCHAR(20) UNIQUE NOT NULL, -- Tambah UNIQUE untuk mencegah bulan kembar di tingkat DB
    tanggal_awal DATE NOT NULL,      
    tanggal_akhir DATE NOT NULL,     
    status VARCHAR(30) DEFAULT 'Pengisian Absensi',
    deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- Tambahkan ekstensi & constraint EXCLUDE secara terpisah agar aman dipanggil ulang
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE tb_periode DROP CONSTRAINT IF EXISTS chk_anti_overlap_periode;
ALTER TABLE tb_periode ADD CONSTRAINT chk_anti_overlap_periode 
EXCLUDE USING gist (
    daterange(tanggal_awal, tanggal_akhir, '[]') WITH &&
) WHERE (deleted_at IS NULL);

-- 6. Master Pegawai
CREATE TABLE IF NOT EXISTS tb_pegawai (
    id_pegawai SERIAL PRIMARY KEY,
    nama_dan_tanggal_lahir TEXT NOT NULL,
    id_jabatan INTEGER REFERENCES tb_jabatan(id_jabatan) ON DELETE SET NULL,
    id_golongan INTEGER REFERENCES tb_golongan(id_golongan) ON DELETE SET NULL,
    status_perkawinan VARCHAR(10) DEFAULT 'TK',
    jumlah_anak INTEGER DEFAULT 0,
    gaji_pokok_dasar NUMERIC(15, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL
);


-- ==========================================
-- II. TRANSACTIONAL TABLES (Tabel Transaksi)
-- ==========================================

-- 7. Transaksi Absensi Bulanan
CREATE TABLE IF NOT EXISTS tb_absensi_summary (
    id_absensi_summary SERIAL PRIMARY KEY,
    id_periode INTEGER NOT NULL REFERENCES tb_periode(id_periode) ON DELETE CASCADE,
    id_pegawai INTEGER NOT NULL REFERENCES tb_pegawai(id_pegawai) ON DELETE CASCADE, 
    total_hadir_ops_wfo INT DEFAULT 0,
    total_hadir_ops_wfh INT DEFAULT 0,
    total_izin INT DEFAULT 0,
    total_sakit INT DEFAULT 0,
    total_alpha INT DEFAULT 0,
    UNIQUE (id_periode, id_pegawai)
);

-- 8. Log Approval 
CREATE TABLE IF NOT EXISTS tb_approval (
    id_approval SERIAL PRIMARY KEY,
    id_periode INTEGER NOT NULL REFERENCES tb_periode(id_periode) ON DELETE CASCADE,
    approver_id INTEGER NOT NULL REFERENCES tb_pengguna(id_pengguna),
    status VARCHAR(20) NOT NULL CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    catatan TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 9. Transaksi Tunjangan Dinamis & Jam Lebih
CREATE TABLE IF NOT EXISTS tb_tunjangan_bulanan (
    id_tunjangan_bulanan SERIAL PRIMARY KEY,
    id_periode INTEGER NOT NULL REFERENCES tb_periode(id_periode) ON DELETE CASCADE,
    id_pegawai INTEGER NOT NULL REFERENCES tb_pegawai(id_pegawai) ON DELETE CASCADE, 
    total_jam_lebih NUMERIC(5, 2) DEFAULT 0,
    honor_bulan NUMERIC(12, 2) DEFAULT 0,
    UNIQUE (id_periode, id_pegawai)
);

CREATE TABLE IF NOT EXISTS tb_tunjangan_bulanan_detail (
    id_detail SERIAL PRIMARY KEY,
    id_periode INT REFERENCES tb_periode(id_periode) ON DELETE CASCADE,
    id_pegawai INT REFERENCES tb_pegawai(id_pegawai) ON DELETE CASCADE,
    id_tunjangan INT REFERENCES tb_tunjangan(id_tunjangan) ON DELETE RESTRICT,
    nilai_terhitung NUMERIC(12, 2) DEFAULT 0,
    CONSTRAINT unique_periode_pegawai_tunjangan UNIQUE (id_periode, id_pegawai, id_tunjangan)
);

CREATE TABLE IF NOT EXISTS tb_master_potongan (
    id_master_potongan SERIAL PRIMARY KEY,
    nama_potongan VARCHAR(100) NOT NULL,
    kode_potongan VARCHAR(20) UNIQUE NOT NULL, -- Contoh: 'POT_ANGSURAN', 'POT_DANA_WAJIB', 'POT_PELKES'
    nilai_default NUMERIC(12, 2) DEFAULT 0,     -- Jika ada potongan yang sifatnya flat/sama rata
    deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- HEADER: Cukup catat periode, pegawai, dan total potongannya saja
CREATE TABLE IF NOT EXISTS tb_potongan_bulanan (
    id_potongan_bulanan SERIAL PRIMARY KEY,
    id_periode INTEGER NOT NULL REFERENCES tb_periode(id_periode) ON DELETE CASCADE,
    id_pegawai INTEGER NOT NULL REFERENCES tb_pegawai(id_pegawai) ON DELETE CASCADE, 
    total_potongan_terhitung NUMERIC(12, 2) DEFAULT 0,
    UNIQUE (id_periode, id_pegawai)
);

-- DETAIL VERTIKAL: Menampung rincian potongan tiap pegawai tanpa batas kolom
CREATE TABLE IF NOT EXISTS tb_potongan_bulanan_detail (
    id_potongan_detail SERIAL PRIMARY KEY,
    id_periode INTEGER NOT NULL REFERENCES tb_periode(id_periode) ON DELETE CASCADE,
    id_pegawai INTEGER NOT NULL REFERENCES tb_pegawai(id_pegawai) ON DELETE CASCADE,
    id_master_potongan INTEGER NOT NULL REFERENCES tb_master_potongan(id_master_potongan) ON DELETE RESTRICT,
    nilai_potongan NUMERIC(12, 2) DEFAULT 0,
    CONSTRAINT unique_periode_pegawai_potongan UNIQUE (id_periode, id_pegawai, id_master_potongan)
);

-- Bagian insert inisialisasi potongan di fungsi_buka_periode_baru() otomatis jadi begini:
INSERT INTO tb_potongan_bulanan_detail (id_periode, id_pegawai, id_master_potongan, nilai_potongan)
SELECT v_new_periode_id, p.id_pegawai, m.id_master_potongan, m.nilai_default
FROM tb_pegawai p
CROSS JOIN tb_master_potongan m
WHERE p.deleted_at IS NULL AND m.deleted_at IS NULL;

-- 11. Rekap Gaji Akhir & Potongan (Snapshot Bersejarah)
-- 1. HEADER REKAP GAJI (Hanya totalan besar)
CREATE TABLE IF NOT EXISTS tb_rekap_gaji (
    id_rekap SERIAL PRIMARY KEY,
    id_periode INTEGER NOT NULL REFERENCES tb_periode(id_periode) ON DELETE RESTRICT,
    id_pegawai INTEGER NOT NULL REFERENCES tb_pegawai(id_pegawai) ON DELETE RESTRICT, 
    jabatan_snapshot VARCHAR(50) NOT NULL,
    pangkat_golongan_snapshot VARCHAR(50) NOT NULL, 
    gaji_pokok_snapshot NUMERIC(12, 2) DEFAULT 0,
    total_penghasilan_bruto NUMERIC(12, 2) DEFAULT 0,
    total_potongan NUMERIC(12, 2) DEFAULT 0,
    total_penerimaan_bersih NUMERIC(12, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (id_periode, id_pegawai)
);

-- 2. DETAIL REKAP GAJI VERTIKAL (Menampung tunjangan/potongan tanpa batas)
CREATE TABLE IF NOT EXISTS tb_rekap_gaji_detail (
    id_rekap_detail SERIAL PRIMARY KEY,
    id_rekap INTEGER NOT NULL REFERENCES tb_rekap_gaji(id_rekap) ON DELETE CASCADE,
    jenis_komponen VARCHAR(20) NOT NULL CHECK (jenis_komponen IN ('TUNJANGAN', 'POTONGAN')),
    nama_komponen_snapshot VARCHAR(100) NOT NULL, -- Menyimpan nama asli saat closing (misal: 'Tunjangan Anak')
    nilai_snapshot NUMERIC(12, 2) NOT NULL DEFAULT 0,
    kode_kondisi_snapshot VARCHAR(20) DEFAULT 'UMUM' -- Opsional, untuk tracking kode asalnya
);

-- 12. Koreksi Jam Lembur/Lebih (Log Audit)
CREATE TABLE IF NOT EXISTS tb_koreksi_jam (
    id_koreksi SERIAL PRIMARY KEY,
    id_periode INTEGER NOT NULL REFERENCES tb_periode(id_periode) ON DELETE CASCADE,
    id_pegawai INTEGER NOT NULL REFERENCES tb_pegawai(id_pegawai) ON DELETE CASCADE,
    id_staf_gaji INTEGER NOT NULL REFERENCES tb_pengguna(id_pengguna), 
    jam_koreksi NUMERIC(5, 2) NOT NULL, 
    keterangan TEXT NOT NULL, 
    created_at TIMESTAMP DEFAULT NOW()
);


-- =========================================================================
-- III. SEED DATA / DATA DEFAULT (Aman dijalankan berkali-kali)
-- =========================================================================

-- Seed Master Tunjangan
INSERT INTO tb_tunjangan (nama_tunjangan, nilai, jenis_tunjangan, sifat_tunjangan, keterangan, kode_kondisi) VALUES 
('Uang Transport WFO', 30000.00, 'NOMINAL', 'HARIAN', 'Uang transport fisik, dihitung per hari hadir kerja', 'TRN_WFO'),
('Tunjangan Istri', 0.10, 'PERSENTASE', 'BULANAN', 'Tunjangan suami/istri sebesar 10% dari gaji pokok', 'TUNJ_ISTRI'),
('Tunjangan Anak', 0.02, 'PERSENTASE', 'BULANAN', 'Tunjangan per anak sebesar 2% dari gaji pokok', 'TUNJ_ANAK')
ON CONFLICT (kode_kondisi) DO UPDATE SET nilai = EXCLUDED.nilai;

-- Seed Master Jabatan
INSERT INTO tb_jabatan (nama_jabatan, tunjangan_jabatan_struktural) VALUES 
('Kepala Sekolah', 2000000.00),
('Wakil Kepala Sekolah', 1200000.00),
('Kepala Tata Usaha (TU)', 800000.00),
('Wali Kelas', 500000.00),
('Guru Penanggung Jawab Lab', 400000.00),
('Guru Tetap / Staf TU', 0.00)
ON CONFLICT (nama_jabatan) DO NOTHING;

-- Seed Master Golongan
INSERT INTO tb_golongan (nama_golongan, gaji_pokok_standar) VALUES 
('Golongan III/a (Penata Muda)', 2700000.00),
('Golongan III/b (Penata Muda Tk. I)', 2900000.00),
('Golongan III/c (Penata)', 3100000.00),
('Golongan III/d (Penata Tk. I)', 3300000.00),
('Golongan IV/a (Pembina)', 3500000.00),
('GTT/PTT (Guru/Pegawai Tidak Tetap)', 1500000.00)
ON CONFLICT (nama_golongan) DO NOTHING;

-- Seed Master Periode
INSERT INTO tb_periode (bulan_gaji, tanggal_awal, tanggal_akhir, status) 
VALUES ('Juli 2026', '2026-06-26', '2026-07-25', 'Pengisian Absensi')
ON CONFLICT (bulan_gaji) DO NOTHING;

-- Seed Master Pegawai
INSERT INTO tb_pegawai (nama_dan_tanggal_lahir, id_jabatan, id_golongan, status_perkawinan, jumlah_anak, gaji_pokok_dasar) VALUES 
('Drs. Budi Santoso - 1975-05-12', (SELECT id_jabatan FROM tb_jabatan WHERE nama_jabatan='Kepala Sekolah'), (SELECT id_golongan FROM tb_golongan WHERE nama_golongan='Golongan IV/a (Pembina)'), 'K', 2, 3500000.00),
('Siti Aminah S.Pd - 1990-08-20', (SELECT id_jabatan FROM tb_jabatan WHERE nama_jabatan='Wali Kelas'), (SELECT id_golongan FROM tb_golongan WHERE nama_golongan='Golongan III/b (Penata Muda Tk. I)'), 'TK', 0, 2900000.00),
('Rian Hidayat - 1998-11-02', (SELECT id_jabatan FROM tb_jabatan WHERE nama_jabatan='Guru Tetap / Staf TU'), (SELECT id_golongan FROM tb_golongan WHERE nama_golongan='GTT/PTT (Guru/Pegawai Tidak Tetap)'), 'TK', 0, 1500000.00)
ON CONFLICT DO NOTHING;

-- Seed Transaksi Absensi (Dinamis Berbasis Subquery ID Periode & Pegawai)
INSERT INTO tb_absensi_summary (id_periode, id_pegawai, total_hadir_ops_wfo, total_hadir_ops_wfh, total_izin, total_sakit, total_alpha) VALUES
((SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026'), (SELECT id_pegawai FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Drs. Budi Santoso%'), 24, 0, 1, 0, 0),
((SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026'), (SELECT id_pegawai FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Siti Aminah%'), 25, 0, 0, 0, 0),
((SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026'), (SELECT id_pegawai FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Rian Hidayat%'), 22, 0, 0, 3, 0)
ON CONFLICT (id_periode, id_pegawai) DO NOTHING;

-- Seed Transaksi Tunjangan Bulanan Variabel
INSERT INTO tb_tunjangan_bulanan (id_periode, id_pegawai, total_jam_lebih, honor_bulan) VALUES
((SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026'), (SELECT id_pegawai FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Drs. Budi Santoso%'), 0.00, 0.00),
((SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026'), (SELECT id_pegawai FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Siti Aminah%'), 12.50, 0.00),
((SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026'), (SELECT id_pegawai FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Rian Hidayat%'), 5.00, 200000.00)
ON CONFLICT (id_periode, id_pegawai) DO NOTHING;

-- Seed Detail Tunjangan Vertikal
INSERT INTO tb_tunjangan_bulanan_detail (id_periode, id_pegawai, id_tunjangan, nilai_terhitung) VALUES
((SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026'), (SELECT id_pegawai FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Drs. Budi Santoso%'), (SELECT id_tunjangan FROM tb_tunjangan WHERE kode_kondisi='TRN_WFO'), 720000.00),
((SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026'), (SELECT id_pegawai FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Drs. Budi Santoso%'), (SELECT id_tunjangan FROM tb_tunjangan WHERE kode_kondisi='TUNJ_ISTRI'), 350000.00),
((SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026'), (SELECT id_pegawai FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Drs. Budi Santoso%'), (SELECT id_tunjangan FROM tb_tunjangan WHERE kode_kondisi='TUNJ_ANAK'), 140000.00),
((SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026'), (SELECT id_pegawai FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Siti Aminah%'), (SELECT id_tunjangan FROM tb_tunjangan WHERE kode_kondisi='TRN_WFO'), 750000.00),
((SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026'), (SELECT id_pegawai FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Rian Hidayat%'), (SELECT id_tunjangan FROM tb_tunjangan WHERE kode_kondisi='TRN_WFO'), 660000.00)
ON CONFLICT (id_periode, id_pegawai, id_tunjangan) DO NOTHING;

-- Seed Potongan Bulanan
INSERT INTO tb_potongan_bulanan (id_periode, id_pegawai, potongan_angsuran, potongan_dana_wajib, potongan_s_pskd, potongan_pelkes, potongan_lainnya) VALUES
((SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026'), (SELECT id_pegawai FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Drs. Budi Santoso%'), 500000.00, 50000.00, 20000.00, 30000.00, 0.00),
((SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026'), (SELECT id_pegawai FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Siti Aminah%'), 0.00, 50000.00, 20000.00, 30000.00, 10000.00),
((SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026'), (SELECT id_pegawai FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Rian Hidayat%'), 0.00, 25000.00, 20000.00, 0.00, 0.00)
ON CONFLICT (id_periode, id_pegawai) DO NOTHING;

-- Seed Snapshot Rekap Gaji Akhir
INSERT INTO tb_rekap_gaji (
    id_periode, id_pegawai, jabatan_snapshot, pangkat_golongan_snapshot, gaji_pokok_snapshot,
    tunj_kel_gabungan_snapshot, tunjangan_istri_snapshot, tunjangan_anak_snapshot,
    tunjangan_struktural_snapshot, total_tunjangan_dinamis_snapshot, transport_makan_snapshot,
    total_penghasilan_bruto, potongan_angsuran_snapshot, 
    potongan_dana_wajib_snapshot, potongan_s_pskd_snapshot, potongan_pelkes_snapshot, potongan_lainnya_snapshot,
    total_potongan, total_penerimaan_bersih
) VALUES
(
    (SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026'), (SELECT id_pegawai FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Drs. Budi Santoso%'), 'Kepala Sekolah', 'Golongan IV/a (Pembina)', 3500000.00,
    490000.00, 350000.00, 140000.00, 2000000.00, 0.00, 720000.00, 6710000.00, 500000.00, 50000.00, 20000.00, 30000.00, 0.00, 600000.00, 6110000.00
),
(
    (SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026'), (SELECT id_pegawai FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Siti Aminah%'), 'Wali Kelas', 'Golongan III/b (Penata Muda Tk. I)', 2900000.00,
    0.00, 0.00, 0.00, 500000.00, 187500.00, 750000.00, 4337500.00, 0.00, 50000.00, 20000.00, 30000.00, 10000.00, 110000.00, 4227500.00
),
(
    (SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026'), (SELECT id_pegawai FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Rian Hidayat%'), 'Guru Tetap / Staf TU', 'GTT/PTT (Guru/Pegawai Tidak Tetap)', 1500000.00,
    0.00, 0.00, 0.00, 0.00, 275000.00, 660000.00, 2435000.00, 0.00, 25000.00, 20000.00, 0.00, 0.00, 45000.00, 2390000.00
)
ON CONFLICT (id_periode, id_pegawai) 
DO UPDATE SET 
    jabatan_snapshot = EXCLUDED.jabatan_snapshot,
    pangkat_golongan_snapshot = EXCLUDED.pangkat_golongan_snapshot,
    gaji_pokok_snapshot = EXCLUDED.gaji_pokok_snapshot,
    tunj_kel_gabungan_snapshot = EXCLUDED.tunj_kel_gabungan_snapshot,
    tunjangan_istri_snapshot = EXCLUDED.tunjangan_istri_snapshot,
    tunjangan_anak_snapshot = EXCLUDED.tunjangan_anak_snapshot,
    tunjangan_struktural_snapshot = EXCLUDED.tunjangan_struktural_snapshot,
    total_tunjangan_dinamis_snapshot = EXCLUDED.total_tunjangan_dinamis_snapshot,
    transport_makan_snapshot = EXCLUDED.transport_makan_snapshot,
    total_penghasilan_bruto = EXCLUDED.total_penghasilan_bruto,
    potongan_angsuran_snapshot = EXCLUDED.potongan_angsuran_snapshot,
    potongan_dana_wajib_snapshot = EXCLUDED.potongan_dana_wajib_snapshot,
    potongan_s_pskd_snapshot = EXCLUDED.potongan_s_pskd_snapshot,
    potongan_pelkes_snapshot = EXCLUDED.potongan_pelkes_snapshot,
    potongan_lainnya_snapshot = EXCLUDED.potongan_lainnya_snapshot,
    total_potongan = EXCLUDED.total_potongan,
    total_penerimaan_bersih = EXCLUDED.total_penerimaan_bersih,
    created_at = NOW();


-- ==========================================
-- IV. PERFORMANCE INDEXES
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_pegawai_active ON tb_pegawai(id_pegawai) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_jabatan_active ON tb_jabatan(id_jabatan) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_golongan_active ON tb_golongan(id_golongan) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_periode_active ON tb_periode(id_periode) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pengguna_active ON tb_pengguna(id_pengguna) WHERE deleted_at IS NULL;


-- ==========================================
-- V. STORED PROCEDURES / FUNCTIONS
-- ==========================================
CREATE OR REPLACE FUNCTION fungsi_buka_periode_baru(
    p_bulan_gaji VARCHAR(20),
    p_tanggal_awal DATE,
    p_tanggal_akhir DATE
) RETURNS INT AS $$
DECLARE
    v_new_periode_id INT;
    v_pct_istri NUMERIC(12, 2);
    v_pct_anak NUMERIC(12, 2);
BEGIN
    -- 1. PENGAMAN: Validasi urutan tanggal masuk akal
    IF p_tanggal_awal > p_tanggal_akhir THEN
        RAISE EXCEPTION 'Gagal membuka periode: Tanggal awal (%) tidak boleh lebih besar dari tanggal akhir (%)!', p_tanggal_awal, p_tanggal_akhir;
    END IF;

    -- 2. PENGAMAN: Cek nama bulan gaji agar tidak duplikat (untuk yang aktif)
    IF EXISTS (
        SELECT 1 FROM tb_periode 
        WHERE bulan_gaji = p_bulan_gaji AND deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'Gagal membuka periode: Nama periode bulan % sudah terdaftar dan aktif!', p_bulan_gaji;
    END IF;

    -- 3. AMAN DARI HARDCODE: Ambil parameter berbasis kode kondisi khusus
    SELECT COALESCE(MAX(nilai), 0.10) INTO v_pct_istri FROM tb_tunjangan WHERE kode_kondisi = 'TUNJ_ISTRI' AND deleted_at IS NULL;
    SELECT COALESCE(MAX(nilai), 0.02) INTO v_pct_anak FROM tb_tunjangan WHERE kode_kondisi = 'TUNJ_ANAK' AND deleted_at IS NULL;

    -- 4. INSERT PERIODE (Constraint GIST otomatis melempar error jika overlap)
    INSERT INTO tb_periode (bulan_gaji, tanggal_awal, tanggal_akhir, status)
    VALUES (p_bulan_gaji, p_tanggal_awal, p_tanggal_akhir, 'Pengisian Absensi')
    RETURNING id_periode INTO v_new_periode_id;

    -- 5. Inisialisasi data absensi kosong untuk semua pegawai aktif
    INSERT INTO tb_absensi_summary (id_periode, id_pegawai, total_hadir_ops_wfo, total_hadir_ops_wfh, total_izin, total_sakit, total_alpha)
    SELECT v_new_periode_id, id_pegawai, 0, 0, 0, 0, 0
    FROM tb_pegawai
    WHERE deleted_at IS NULL;

    -- 6. Inisialisasi data tunjangan bulanan kosong
    INSERT INTO tb_tunjangan_bulanan (id_periode, id_pegawai, total_jam_lebih, honor_bulan)
    SELECT v_new_periode_id, id_pegawai, 0.00, 0.00
    FROM tb_pegawai
    WHERE deleted_at IS NULL;

    -- 7. OTOMATISASI VERTIKAL: Daftarkan semua master tunjangan aktif ke tabel detail untuk tiap pegawai
    INSERT INTO tb_tunjangan_bulanan_detail (id_periode, id_pegawai, id_tunjangan, nilai_terhitung)
    SELECT v_new_periode_id, p.id_pegawai, t.id_tunjangan, 0.00
    FROM tb_pegawai p
    CROSS JOIN tb_tunjangan t
    WHERE p.deleted_at IS NULL AND t.deleted_at IS NULL;

    -- 8. Inisialisasi data potongan bulanan kosong
    INSERT INTO tb_potongan_bulanan (id_periode, id_pegawai, potongan_angsuran, potongan_dana_wajib, potongan_s_pskd, potongan_pelkes, potongan_lainnya)
    SELECT v_new_periode_id, id_pegawai, 0.00, 0.00, 0.00, 0.00, 0.00
    FROM tb_pegawai
    WHERE deleted_at IS NULL;

    -- 9. Buat snapshot awal di tb_rekap_gaji untuk komponen tetap (Inisialisasi Dasar)
    INSERT INTO tb_rekap_gaji (
        id_periode, id_pegawai, jabatan_snapshot, pangkat_golongan_snapshot, gaji_pokok_snapshot,
        tunjangan_istri_snapshot, tunjangan_anak_snapshot, tunjangan_struktural_snapshot,
        tunj_kel_gabungan_snapshot, total_tunjangan_dinamis_snapshot, transport_makan_snapshot,
        total_penghasilan_bruto, total_potongan, total_penerimaan_bersih
    )
    SELECT 
        v_new_periode_id,
        p.id_pegawai,
        COALESCE(j.nama_jabatan, 'Tidak Ada Jabatan'),
        COALESCE(g.nama_golongan, 'Tidak Ada Golongan'),
        p.gaji_pokok_dasar,
        CASE WHEN p.status_perkawinan = 'K' THEN (p.gaji_pokok_dasar * v_pct_istri) ELSE 0 END,
        (p.gaji_pokok_dasar * v_pct_anak * p.jumlah_anak),
        COALESCE(j.tunjangan_jabatan_struktural, 0),
        (CASE WHEN p.status_perkawinan = 'K' THEN (p.gaji_pokok_dasar * v_pct_istri) ELSE 0 END) + (p.gaji_pokok_dasar * v_pct_anak * p.jumlah_anak),
        0.00, 
        0.00, 
        p.gaji_pokok_dasar + COALESCE(j.tunjangan_jabatan_struktural, 0) + (CASE WHEN p.status_perkawinan = 'K' THEN (p.gaji_pokok_dasar * v_pct_istri) ELSE 0 END) + (p.gaji_pokok_dasar * v_pct_anak * p.jumlah_anak),
        0.00, 
        p.gaji_pokok_dasar + COALESCE(j.tunjangan_jabatan_struktural, 0) + (CASE WHEN p.status_perkawinan = 'K' THEN (p.gaji_pokok_dasar * v_pct_istri) ELSE 0 END) + (p.gaji_pokok_dasar * v_pct_anak * p.jumlah_anak)
    FROM tb_pegawai p
    LEFT JOIN tb_jabatan j ON p.id_jabatan = j.id_jabatan
    LEFT JOIN tb_golongan g ON p.id_golongan = g.id_golongan
    WHERE p.deleted_at IS NULL;

    RETURN v_new_periode_id;
END;
$$ LANGUAGE plpgsql;