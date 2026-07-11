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
    bulan_gaji VARCHAR(20) NOT NULL, 
    tanggal_awal DATE NOT NULL,      
    tanggal_akhir DATE NOT NULL,     
    status VARCHAR(30) DEFAULT 'Pengisian Absensi',
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    CONSTRAINT tb_periode_status_check CHECK (status IN ('Pengisian Absensi', 'Menunggu Approval', 'Approved', 'Selesai'))
);

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
    id_periode INT REFERENCES tb_periode(id_periode),
    id_pegawai INT REFERENCES tb_pegawai(id_pegawai),
    id_tunjangan INT REFERENCES tb_tunjangan(id_tunjangan),
    nilai_terhitung NUMERIC(12, 2) DEFAULT 0,
    
    CONSTRAINT unique_periode_pegawai_tunjangan UNIQUE (id_periode, id_pegawai, id_tunjangan)
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


-- =========================================================================
-- III. SEED DATA / DATA DEFAULT (Eksekusi berurutan agar aman dari konstrain)
-- =========================================================================

-- Seed Master Tunjangan
INSERT INTO tb_tunjangan (nama_tunjangan, nilai, jenis_tunjangan, sifat_tunjangan, keterangan) VALUES 
('Uang Transport WFO', 30000.00, 'NOMINAL', 'HARIAN', 'Uang transport fisik, dihitung per hari hadir kerja'),
('Tunjangan Istri', 0.10, 'PERSENTASE', 'BULANAN', 'Tunjangan suami/istri sebesar 10% dari gaji pokok'),
('Tunjangan Anak', 0.02, 'PERSENTASE', 'BULANAN', 'Tunjangan per anak sebesar 2% dari gaji pokok')
ON CONFLICT DO NOTHING;

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
ON CONFLICT DO NOTHING;

-- Seed Master Pegawai
INSERT INTO tb_pegawai (nama_dan_tanggal_lahir, id_jabatan, id_golongan, status_perkawinan, jumlah_anak, gaji_pokok_dasar) VALUES 
('Drs. Budi Santoso - 1975-05-12', 1, 5, 'K', 2, 3500000.00),
('Siti Aminah S.Pd - 1990-08-20', 4, 2, 'TK', 0, 2900000.00),
('Rian Hidayat - 1998-11-02', 6, 6, 'TK', 0, 1500000.00)
ON CONFLICT DO NOTHING;

-- Seed Transaksi Absensi
INSERT INTO tb_absensi_summary (id_periode, id_pegawai, total_hadir_ops_wfo, total_hadir_ops_wfh, total_izin, total_sakit, total_alpha) VALUES
(1, 1, 24, 0, 1, 0, 0),
(1, 2, 25, 0, 0, 0, 0),
(1, 3, 22, 0, 0, 3, 0)
ON CONFLICT (id_periode, id_pegawai) DO NOTHING;

-- Seed Transaksi Tunjangan Bulanan Variabel
INSERT INTO tb_tunjangan_bulanan (id_periode, id_pegawai, total_jam_lebih, honor_bulan) VALUES
(1, 1, 0.00, 0.00),
(1, 2, 12.50, 0.00),
(1, 3, 5.00, 200000.00)
ON CONFLICT (id_periode, id_pegawai) DO NOTHING;

-- Seed Detail Tunjangan Vertikal
INSERT INTO tb_tunjangan_bulanan_detail (id_periode, id_pegawai, id_tunjangan, nilai_terhitung) VALUES
(1, 1, 1, 720000.00),
(1, 1, 2, 350000.00),
(1, 1, 3, 140000.00),
(1, 2, 1, 750000.00),
(1, 3, 1, 660000.00)
ON CONFLICT DO NOTHING;

-- Seed Potongan Bulanan
INSERT INTO tb_potongan_bulanan (id_periode, id_pegawai, potongan_angsuran, potongan_dana_wajib, potongan_s_pskd, potongan_pelkes, potongan_lainnya) VALUES
(1, 1, 500000.00, 50000.00, 20000.00, 30000.00, 0.00),
(1, 2, 0.00, 50000.00, 20000.00, 30000.00, 10000.00),
(1, 3, 0.00, 25000.00, 20000.00, 0.00, 0.00)
ON CONFLICT (id_periode, id_pegawai) DO NOTHING;

-- Seed Snapshot Rekap Gaji Akhir (Rincian snapshot disamakan persis dengan rincian aslinya)
INSERT INTO tb_rekap_gaji (
    id_periode, id_pegawai, jabatan_snapshot, pangkat_golongan_snapshot, gaji_pokok_snapshot,
    tunj_kel_gabungan_snapshot, tunjangan_istri_snapshot, tunjangan_anak_snapshot,
    tunjangan_struktural_snapshot, total_tunjangan_dinamis_snapshot, transport_makan_snapshot,
    total_penghasilan_bruto, potongan_angsuran_snapshot, 
    potongan_dana_wajib_snapshot, potongan_s_pskd_snapshot, potongan_pelkes_snapshot, potongan_lainnya_snapshot,
    total_potongan, total_penerimaan_bersih
) VALUES
(
    1, 1, 'Kepala Sekolah', 'Golongan IV/a (Pembina)', 3500000.00,
    490000.00, 350000.00, 140000.00, 2000000.00, 0.00, 720000.00,
    6710000.00, 
    500000.00, 50000.00, 20000.00, 30000.00, 0.00, 
    600000.00, 6110000.00
),
(
    1, 2, 'Wali Kelas', 'Golongan III/b (Penata Muda Tk. I)', 2900000.00,
    0.00, 0.00, 0.00, 500000.00, 187500.00, 750000.00,
    4337500.00, 
    0.00, 50000.00, 20000.00, 30000.00, 10000.00,
    110000.00, 4227500.00
),
(
    1, 3, 'Guru Tetap / Staf TU', 'GTT/PTT (Guru/Pegawai Tidak Tetap)', 1500000.00,
    0.00, 0.00, 0.00, 0.00, 275000.00, 660000.00,
    2435000.00, 
    0.00, 25000.00, 20000.00, 0.00, 0.00,
    45000.00, 2390000.00
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

CREATE OR REPLACE FUNCTION fungsi_buka_periode_baru(
    p_bulan_gaji VARCHAR(20),
    p_tanggal_awal DATE,
    p_tanggal_akhir DATE
) RETURNS INT AS $$
DECLARE
    v_new_periode_id INT;
BEGIN
    -- PENGAMAN: Cek apakah nama bulan sudah ada ATAU rentang tanggal beririsan
    IF EXISTS (
        SELECT 1 FROM tb_periode 
        WHERE (bulan_gaji = p_bulan_gaji OR (tanggal_awal <= p_tanggal_akhir AND tanggal_akhir >= p_tanggal_awal))
          AND deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'Gagal membuka periode: Bulan % atau rentang tanggal tersebut sudah terdaftar!', p_bulan_gaji;
    END IF;

    -- 1. Insert periode baru
    INSERT INTO tb_periode (bulan_gaji, tanggal_awal, tanggal_akhir, status)
    VALUES (p_bulan_gaji, p_tanggal_awal, p_tanggal_akhir, 'Pengisian Absensi')
    RETURNING id_periode INTO v_new_periode_id;

    -- 2. Inisialisasi data absensi kosong untuk semua pegawai aktif
    INSERT INTO tb_absensi_summary (id_periode, id_pegawai, total_hadir_ops_wfo, total_hadir_ops_wfh, total_izin, total_sakit, total_alpha)
    SELECT v_new_periode_id, id_pegawai, 0, 0, 0, 0, 0
    FROM tb_pegawai
    WHERE deleted_at IS NULL;

    -- 3. Inisialisasi data tunjangan bulanan kosong
    INSERT INTO tb_tunjangan_bulanan (id_periode, id_pegawai, total_jam_lebih, honor_bulan)
    SELECT v_new_periode_id, id_pegawai, 0.00, 0.00
    FROM tb_pegawai
    WHERE deleted_at IS NULL;

    -- 4. Inisialisasi data potongan bulanan kosong
    INSERT INTO tb_potongan_bulanan (id_periode, id_pegawai, potongan_angsuran, potongan_dana_wajib, potongan_s_pskd, potongan_pelkes, potongan_lainnya)
    SELECT v_new_periode_id, id_pegawai, 0, 0, 0, 0, 0
    FROM tb_pegawai
    WHERE deleted_at IS NULL;

    -- 5. Buat snapshot awal di tb_rekap_gaji untuk komponen tetap
    INSERT INTO tb_rekap_gaji (
        id_periode, id_pegawai, jabatan_snapshot, pangkat_golongan_snapshot, gaji_pokok_snapshot,
        tunjangan_istri_snapshot, tunjangan_anak_snapshot, tunjangan_struktural_snapshot,
        tunj_kel_gabungan_snapshot, total_penghasilan_bruto, total_penerimaan_bersih
    )
    SELECT 
        v_new_periode_id,
        p.id_pegawai,
        COALESCE(j.nama_jabatan, 'Tidak Ada Jabatan'),
        COALESCE(g.nama_golongan, 'Tidak Ada Golongan'),
        p.gaji_pokok_dasar,
        -- Hitung tunjangan istri (10% jika 'K')
        CASE WHEN p.status_perkawinan = 'K' THEN (p.gaji_pokok_dasar * 0.10) ELSE 0 END,
        -- Hitung tunjangan anak (2% per anak)
        (p.gaji_pokok_dasar * 0.02 * p.jumlah_anak),
        COALESCE(j.tunjangan_jabatan_struktural, 0),
        -- Gabungan tunjangan keluarga
        (CASE WHEN p.status_perkawinan = 'K' THEN (p.gaji_pokok_dasar * 0.10) ELSE 0 END) + (p.gaji_pokok_dasar * 0.02 * p.jumlah_anak),
        -- Bruto awal (baru komponen tetap)
        p.gaji_pokok_dasar + COALESCE(j.tunjangan_jabatan_struktural, 0) + (CASE WHEN p.status_perkawinan = 'K' THEN (p.gaji_pokok_dasar * 0.10) ELSE 0 END) + (p.gaji_pokok_dasar * 0.02 * p.jumlah_anak),
        -- Netto awal
        p.gaji_pokok_dasar + COALESCE(j.tunjangan_jabatan_struktural, 0) + (CASE WHEN p.status_perkawinan = 'K' THEN (p.gaji_pokok_dasar * 0.10) ELSE 0 END) + (p.gaji_pokok_dasar * 0.02 * p.jumlah_anak)
    FROM tb_pegawai p
    LEFT JOIN tb_jabatan j ON p.id_jabatan = j.id_jabatan
    LEFT JOIN tb_golongan g ON p.id_golongan = g.id_golongan
    WHERE p.deleted_at IS NULL;

    RETURN v_new_periode_id;
END;
$$ LANGUAGE plpgsql;