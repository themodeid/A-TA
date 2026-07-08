-- ==========================================
-- I. MASTER TABLES (Tabel Utama / Referensi)
-- ==========================================

-- 1. Master Pengguna
CREATE TABLE IF NOT EXISTS tb_pengguna (
    id_pengguna SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('Admin', 'Petugas Absensi', 'Approver', 'Staf Gaji')),
    deleted_at TIMESTAMPTZ DEFAULT NULL -- Soft delete untuk pengguna sistem
);

-- 2. Master Parameter / Konfigurasi Aplikasi
-- 1. Membuat Tabel Master Tunjangan
CREATE TABLE IF NOT EXISTS tb_tunjangan (
    id_tunjangan SERIAL PRIMARY KEY,
    nama_tunjangan VARCHAR(100) NOT NULL,
    nilai NUMERIC(12, 2) NOT NULL,
    jenis_tunjangan VARCHAR(20) NOT NULL, -- Isinya WAJIB: 'NOMINAL' atau 'PERSENTASE'
    sifat_tunjangan VARCHAR(20) NOT NULL, -- Isinya WAJIB: 'BULANAN' atau 'HARIAN'
    keterangan TEXT,
    kode_kondisi VARCHAR(20) NOT NULL DEFAULT 'UMUM',
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    CONSTRAINT chk_jenis_tunjangan CHECK (jenis_tunjangan IN ('NOMINAL', 'PERSENTASE')),
    CONSTRAINT chk_sifat_tunjangan CHECK (sifat_tunjangan IN ('BULANAN', 'HARIAN'))
);

-- 2. Memasukkan Data Pancingan (Seed Data) Berdasarkan Kasus Kamu
INSERT INTO tb_tunjangan (nama_tunjangan, nilai, jenis_tunjangan, sifat_tunjangan, keterangan) VALUES 
('Uang Transport WFO', 30000.00, 'NOMINAL', 'HARIAN', 'Uang transport fisik, dihitung per hari hadir kerja'),
('Tunjangan Istri', 0.10, 'PERSENTASE', 'BULANAN', 'Tunjangan suami/istri sebesar 10% dari gaji pokok'),
('Tunjangan Anak', 0.02, 'PERSENTASE', 'BULANAN', 'Tunjangan per anak sebesar 2% dari gaji pokok')
ON CONFLICT DO NOTHING;

-- 3. Master Jabatan
CREATE TABLE IF NOT EXISTS tb_jabatan (
    id_jabatan SERIAL PRIMARY KEY,
    nama_jabatan VARCHAR(50) UNIQUE NOT NULL,
    tunjangan_jabatan_struktural NUMERIC(12, 2) DEFAULT 0,
    deleted_at TIMESTAMPTZ DEFAULT NULL 
);

INSERT INTO tb_jabatan (nama_jabatan, tunjangan_jabatan_struktural) VALUES 
('Kepala Sekolah', 2000000.00),
('Wakil Kepala Sekolah', 1200000.00),
('Kepala Tata Usaha (TU)', 800000.00),
('Wali Kelas', 500000.00),
('Guru Penanggung Jawab Lab', 400000.00),
('Guru Tetap / Staf TU', 0.00) -- Jabatan fungsional dasar tanpa tunjangan struktural tambahan
ON CONFLICT (nama_jabatan) DO NOTHING;

-- 4. Master Golongan
CREATE TABLE IF NOT EXISTS tb_golongan (
    id_golongan SERIAL PRIMARY KEY,
    nama_golongan VARCHAR(50) UNIQUE NOT NULL, 
    gaji_pokok_standar NUMERIC(12, 2) NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ DEFAULT NULL
);

INSERT INTO tb_golongan (nama_golongan, gaji_pokok_standar) VALUES 
('Golongan III/a (Penata Muda)', 2700000.00),
('Golongan III/b (Penata Muda Tk. I)', 2900000.00),
('Golongan III/c (Penata)', 3100000.00),
('Golongan III/d (Penata Tk. I)', 3300000.00),
('Golongan IV/a (Pembina)', 3500000.00),
('GTT/PTT (Guru/Pegawai Tidak Tetap)', 1500000.00) -- Untuk honorer atau kontrak sekolah
ON CONFLICT (nama_golongan) DO NOTHING;

-- 5. Master Periode Cut-off 
CREATE TABLE IF NOT EXISTS tb_periode (
    id_periode SERIAL PRIMARY KEY,
    bulan_gaji VARCHAR(20) NOT NULL, 
    tanggal_awal DATE NOT NULL,      
    tanggal_akhir DATE NOT NULL,     
    status VARCHAR(30) DEFAULT 'Pengisian Absensi',
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    
    CONSTRAINT tb_periode_status_check 
    CHECK (status IN ('Pengisian Absensi', 'Menunggu Approval', 'Approved', 'Selesai'))
);

-- 6. Master Pegawai
CREATE TABLE IF NOT EXISTS tb_pegawai (
    id_pegawai SERIAL PRIMARY KEY,          -- Identitas utama pegawai
    nama_dan_tanggal_lahir TEXT NOT NULL,   -- Data deskriptif tampilan
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

-- 7. Transaksi Absensi Bulanan (DIEDIT: Menghapus dependensi kolom id_upload)
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
    
    tunjangan_kesra NUMERIC(12, 2) DEFAULT 0,
    tunjangan_supervisi NUMERIC(12, 2) DEFAULT 0,
    tunjangan_wali_kelas NUMERIC(12, 2) DEFAULT 0,
    tunjangan_piket NUMERIC(12, 2) DEFAULT 0,
    tunjangan_jurbeng NUMERIC(12, 2) DEFAULT 0,
    honor_bulan NUMERIC(12, 2) DEFAULT 0,
    tunjangan_khusus NUMERIC(12, 2) DEFAULT 0,
    total_jam_lebih NUMERIC(5, 2) DEFAULT 0, 
    
    tunj_kel_gabungan NUMERIC(12, 2) DEFAULT 0,             -- Komponen input dari form
    tunjjab_25_pp1985 NUMERIC(12, 2) DEFAULT 0,             -- Komponen input dari form
    sb_dana_chuk_2_pp85 NUMERIC(12, 2) DEFAULT 0,           -- Komponen input dari form
    sb_dana_chuk_8_pp85 NUMERIC(12, 2) DEFAULT 0,           -- Komponen input dari form
    tunjangan_perbaikan_penghasilan NUMERIC(12, 2) DEFAULT 0, -- Komponen input dari form

    UNIQUE (id_periode, id_pegawai)
);

-- 10. Transaksi Potongan Bulanan
CREATE TABLE IF NOT EXISTS tb_potongan_bulanan (
    id_potongan_bulanan SERIAL PRIMARY KEY,
    id_periode INTEGER NOT NULL REFERENCES tb_periode(id_periode) ON DELETE CASCADE,
    id_pegawai INTEGER NOT NULL REFERENCES tb_pegawai(id_pegawai) ON DELETE CASCADE, 
    potongan_angsuran NUMERIC(12, 2) DEFAULT 0,
    potongan_dana_wajib NUMERIC(12, 2) DEFAULT 0,
    potongan_s_pskd NUMERIC(12, 2) DEFAULT 0,
    potongan_pelkes NUMERIC(12, 2) DEFAULT 0,
    potongan_lainnya NUMERIC(12, 2) DEFAULT 0,
    UNIQUE (id_periode, id_pegawai)
);

-- 11. Rekap Gaji Akhir & Potongan (Snapshot Bersejarah)
CREATE TABLE IF NOT EXISTS tb_rekap_gaji (
    id_rekap SERIAL PRIMARY KEY,
    id_periode INTEGER NOT NULL REFERENCES tb_periode(id_periode),
    id_pegawai INTEGER NOT NULL REFERENCES tb_pegawai(id_pegawai), 
    
    jabatan_snapshot VARCHAR(50) NOT NULL,
    pangkat_golongan_snapshot VARCHAR(50) NOT NULL, 
    
    gaji_pokok_snapshot NUMERIC(12, 2) DEFAULT 0,
    
    tunj_kel_gabungan_snapshot NUMERIC(12, 2) DEFAULT 0, 
    tunjangan_istri_snapshot NUMERIC(12, 2) DEFAULT 0, 
    tunjangan_anak_snapshot NUMERIC(12, 2) DEFAULT 0,  
    
    tunjangan_struktural_snapshot NUMERIC(12, 2) DEFAULT 0,
    total_tunjangan_dinamis_snapshot NUMERIC(12, 2) DEFAULT 0,
    transport_makan_snapshot NUMERIC(12, 2) DEFAULT 0,
    
    tunjjab_25_pp1985_snapshot NUMERIC(12, 2) DEFAULT 0,
    sb_dana_chuk_2_pp85_snapshot NUMERIC(12, 2) DEFAULT 0,
    sb_dana_chuk_8_pp85_snapshot NUMERIC(12, 2) DEFAULT 0,
    tunjangan_perbaikan_penghasilan_snapshot NUMERIC(12, 2) DEFAULT 0,
    
    pembulatan_snapshot NUMERIC(12, 2) DEFAULT 0, 
    
    total_penghasilan_bruto NUMERIC(12, 2) DEFAULT 0,
    
    potongan_angsuran_snapshot NUMERIC(12, 2) DEFAULT 0,
    potongan_dana_wajib_snapshot NUMERIC(12, 2) DEFAULT 0,
    potongan_s_pskd_snapshot NUMERIC(12, 2) DEFAULT 0,
    potongan_pelkes_snapshot NUMERIC(12, 2) DEFAULT 0,
    potongan_lainnya_snapshot NUMERIC(12, 2) DEFAULT 0,
    total_potongan NUMERIC(12, 2) DEFAULT 0,
    
    total_penerimaan_bersih NUMERIC(12, 2) DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (id_periode, id_pegawai)
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

-- ==========================================
-- III. PERFORMANCE INDEXES (Optimasi Query)
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_pegawai_active ON tb_pegawai(id_pegawai) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_jabatan_active ON tb_jabatan(id_jabatan) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_golongan_active ON tb_golongan(id_golongan) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_periode_active ON tb_periode(id_periode) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pengguna_active ON tb_pengguna(id_pengguna) WHERE deleted_at IS NULL;