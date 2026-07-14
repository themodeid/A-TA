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
-- [PERBAIKAN NINO] Tambah kolom formula_type: menentukan CARA HITUNG tunjangan
-- secara data-driven, bukan hardcode kode_kondisi di function.
-- Nambah tunjangan baru yang pola hitungnya REUSE salah satu formula_type ini
-- otomatis kehandle tanpa ubah SQL sama sekali.
CREATE TABLE IF NOT EXISTS tb_tunjangan (
    id_tunjangan SERIAL PRIMARY KEY,
    nama_tunjangan VARCHAR(100) NOT NULL,
    nilai NUMERIC(12, 2) NOT NULL,
    jenis_tunjangan VARCHAR(20) NOT NULL,
    sifat_tunjangan VARCHAR(20) NOT NULL,
    keterangan TEXT,
    kode_kondisi VARCHAR(20) NOT NULL DEFAULT 'UMUM',
    formula_type VARCHAR(30) DEFAULT NULL,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    CONSTRAINT unique_kode_kondisi UNIQUE (kode_kondisi),
    CONSTRAINT chk_jenis_tunjangan CHECK (jenis_tunjangan IN ('NOMINAL', 'PERSENTASE')),
    CONSTRAINT chk_sifat_tunjangan CHECK (sifat_tunjangan IN ('BULANAN', 'HARIAN', 'PER_JAM')),
    CONSTRAINT chk_formula_type CHECK (formula_type IN (
        'HARIAN_HADIR_WFO',        -- nilai_terhitung = jumlah hadir WFO * rate
        'PERSEN_GAJI_JIKA_KAWIN',  -- nilai_terhitung = gaji_pokok * persen, hanya jika status_perkawinan='K'
        'PERSEN_GAJI_PER_ANAK',    -- nilai_terhitung = gaji_pokok * persen * jumlah_anak
        'PER_JAM_LEMBUR'           -- rate per jam, dikonsumsi langsung dari total_jam_lebih
    ) OR formula_type IS NULL)
);

-- 3. Master Potongan (VERTIKAL - Pengganti kolom hardcode)
CREATE TABLE IF NOT EXISTS tb_master_potongan (
    id_master_potongan SERIAL PRIMARY KEY,
    nama_potongan VARCHAR(100) NOT NULL,
    kode_potongan VARCHAR(20) UNIQUE NOT NULL, 
    nilai_default NUMERIC(12, 2) DEFAULT 0,     
    deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- 4. Master Jabatan
CREATE TABLE IF NOT EXISTS tb_jabatan (
    id_jabatan SERIAL PRIMARY KEY,
    nama_jabatan VARCHAR(50) UNIQUE NOT NULL,
    tunjangan_jabatan_struktural NUMERIC(12, 2) DEFAULT 0,
    deleted_at TIMESTAMPTZ DEFAULT NULL 
);

-- 5. Master Golongan
CREATE TABLE IF NOT EXISTS tb_golongan (
    id_golongan SERIAL PRIMARY KEY,
    nama_golongan VARCHAR(50) UNIQUE NOT NULL, 
    gaji_pokok_standar NUMERIC(12, 2) NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- 6. Master Periode Cut-off 
-- [PERBAIKAN NINO] status sekarang dibatasi CHECK constraint (lihat bawah).
-- ASUMSI: 6 status ini berdasarkan alur role (Petugas Absensi -> Approver -> Staf Gaji).
-- WAJIB DICEK ke kode backend Express lo, samain exact string-nya (case-sensitive).
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS tb_periode (
    id_periode    SERIAL PRIMARY KEY,
    bulan_gaji    VARCHAR(20) NOT NULL UNIQUE, 
    tanggal_awal  DATE NOT NULL,      
    tanggal_akhir DATE NOT NULL,     
    status        VARCHAR(30) DEFAULT 'Pengisian Absensi' 
                      CHECK (status IN (
                          'Pengisian Absensi',
                          'Menunggu Approval',
                          'Disetujui',
                          'Ditolak',
                          'Diproses Gaji',
                          'Selesai'
                      )),
    deleted_at    TIMESTAMPTZ DEFAULT NULL,

    -- Constraint anti-overlap langsung didefinisikan di sini
    CONSTRAINT chk_anti_overlap_periode 
        EXCLUDE USING gist (
            DATERANGE(tanggal_awal, tanggal_akhir, '[]') WITH &&
        ) WHERE (deleted_at IS NULL)
);

CREATE OR REPLACE FUNCTION public.fungsi_buka_periode_baru(
    p_bulan_gaji VARCHAR,
    p_tanggal_awal DATE,
    p_tanggal_akhir DATE
)
RETURNS INTEGER AS $$
DECLARE
    v_id_periode INTEGER;
BEGIN
    -- 1. Insert data periode baru ke tb_periode
    INSERT INTO public.tb_periode (bulan_gaji, tanggal_awal, tanggal_akhir)
    VALUES (p_bulan_gaji, p_tanggal_awal, p_tanggal_akhir)
    RETURNING id_periode INTO v_id_periode;

    -- 2. Mengembalikan id_periode yang baru dibuat ke Node.js
    RETURN v_id_periode;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION '%', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- 7. Master Pegawai
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

-- 8. Transaksi Absensi Bulanan
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

-- 9. Log Approval 
CREATE TABLE IF NOT EXISTS tb_approval (
    id_approval SERIAL PRIMARY KEY,
    id_periode INTEGER NOT NULL REFERENCES tb_periode(id_periode) ON DELETE CASCADE,
    approver_id INTEGER NOT NULL REFERENCES tb_pengguna(id_pengguna),
    status VARCHAR(20) NOT NULL CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    catatan TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 10. Transaksi Tunjangan Bulanan (VERTIKAL Bersih)
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

-- 11. Transaksi Potongan Bulanan (VERTIKAL Bersih, Bebas Kolom Hardcode)
CREATE TABLE IF NOT EXISTS tb_potongan_bulanan (
    id_potongan_bulanan SERIAL PRIMARY KEY,
    id_periode INTEGER NOT NULL REFERENCES tb_periode(id_periode) ON DELETE CASCADE,
    id_pegawai INTEGER NOT NULL REFERENCES tb_pegawai(id_pegawai) ON DELETE CASCADE, 
    total_potongan_terhitung NUMERIC(12, 2) DEFAULT 0,
    UNIQUE (id_periode, id_pegawai)
);

CREATE TABLE IF NOT EXISTS tb_potongan_bulanan_detail (
    id_potongan_detail SERIAL PRIMARY KEY,
    id_periode INTEGER NOT NULL REFERENCES tb_periode(id_periode) ON DELETE CASCADE,
    id_pegawai INTEGER NOT NULL REFERENCES tb_pegawai(id_pegawai) ON DELETE CASCADE,
    id_master_potongan INTEGER NOT NULL REFERENCES tb_master_potongan(id_master_potongan) ON DELETE RESTRICT,
    nilai_potongan NUMERIC(12, 2) DEFAULT 0,
    CONSTRAINT unique_periode_pegawai_potongan UNIQUE (id_periode, id_pegawai, id_master_potongan)
);

-- 12. Rekap Gaji Akhir (Snapshot Bersejarah Vertikal)
CREATE TABLE IF NOT EXISTS tb_rekap_gaji (
    id_rekap SERIAL PRIMARY KEY,
    id_periode INTEGER NOT NULL REFERENCES tb_periode(id_periode) ON DELETE RESTRICT,
    id_pegawai INTEGER NOT NULL REFERENCES tb_pegawai(id_pegawai) ON DELETE RESTRICT, 
    jabatan_snapshot VARCHAR(50) NOT NULL,
    pangkat_golongan_snapshot VARCHAR(50) NOT NULL, 
    gaji_pokok_snapshot NUMERIC(12, 2) DEFAULT 0,
    total_penghasilan_bruto NUMERIC(12, 2) DEFAULT 0,
    total_potongan NUMERIC(12, 2) DEFAULT 0,
    total_penerimaan_clean NUMERIC(12, 2) DEFAULT 0, -- Penerimaan bersih final
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (id_periode, id_pegawai)
);

CREATE TABLE IF NOT EXISTS tb_rekap_gaji_detail (
    id_rekap_detail SERIAL PRIMARY KEY,
    id_rekap INTEGER NOT NULL REFERENCES tb_rekap_gaji(id_rekap) ON DELETE CASCADE,
    jenis_komponen VARCHAR(20) NOT NULL CHECK (jenis_komponen IN ('TUNJANGAN', 'POTONGAN')),
    nama_komponen_snapshot VARCHAR(100) NOT NULL, 
    nilai_snapshot NUMERIC(12, 2) NOT NULL DEFAULT 0,
    kode_kondisi_snapshot VARCHAR(20) DEFAULT 'UMUM'
);

-- 13. Log Audit Koreksi Jam
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
-- III. SEED DATA / DATA DEFAULT
-- =========================================================================

-- Seed Master Tunjangan (dengan formula_type)
INSERT INTO tb_tunjangan (nama_tunjangan, nilai, jenis_tunjangan, sifat_tunjangan, keterangan, kode_kondisi, formula_type) VALUES 
('Uang Transport WFO', 30000.00, 'NOMINAL', 'HARIAN', 'Uang transport fisik', 'TRN_WFO', 'HARIAN_HADIR_WFO'),
('Tunjangan Istri', 0.10, 'PERSENTASE', 'BULANAN', 'Tunjangan istri 10% dari gaji pokok', 'TUNJ_ISTRI', 'PERSEN_GAJI_JIKA_KAWIN'),
('Tunjangan Anak', 0.02, 'PERSENTASE', 'BULANAN', 'Tunjangan per anak 2% dari gaji pokok', 'TUNJ_ANAK', 'PERSEN_GAJI_PER_ANAK'),
-- ⚠️ GANTI 25000.00 SESUAI RATE LEMBUR ASLI SEKOLAH LO. Ini placeholder.
('Honor Lembur Per Jam', 25000.00, 'NOMINAL', 'PER_JAM', 'Rate lembur per jam, flat untuk semua pegawai', 'LEMBUR_PER_JAM', 'PER_JAM_LEMBUR')
ON CONFLICT (kode_kondisi) DO UPDATE SET nilai = EXCLUDED.nilai, formula_type = EXCLUDED.formula_type;

-- Seed Master Potongan
INSERT INTO tb_master_potongan (nama_potongan, kode_potongan, nilai_default) VALUES
('Potongan Angsuran', 'POT_ANGSURAN', 0.00),
('Potongan Dana Wajib', 'POT_DANA_WAJIB', 50000.00),
('Potongan S_PSKD', 'POT_S_PSKD', 20000.00),
('Potongan Pelkes', 'POT_PELKES', 30000.00),
('Potongan Lainnya', 'POT_LAINNYA', 0.00)
ON CONFLICT (kode_potongan) DO UPDATE SET nilai_default = EXCLUDED.nilai_default;

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

-- Seed Transaksi Absensi
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

-- Seed Transaksi Potongan Utama (Header)
INSERT INTO tb_potongan_bulanan (id_periode, id_pegawai, total_potongan_terhitung) VALUES
((SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026'), (SELECT id_pegawai FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Drs. Budi Santoso%'), 600000.00),
((SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026'), (SELECT id_pegawai FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Siti Aminah%'), 110000.00),
((SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026'), (SELECT id_pegawai FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Rian Hidayat%'), 450000.00)
ON CONFLICT (id_periode, id_pegawai) DO NOTHING;

-- Seed Detail Potongan Vertikal
INSERT INTO tb_potongan_bulanan_detail (id_periode, id_pegawai, id_master_potongan, nilai_potongan) VALUES
((SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026'), (SELECT id_pegawai FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Drs. Budi Santoso%'), (SELECT id_master_potongan FROM tb_master_potongan WHERE kode_potongan='POT_ANGSURAN'), 500000.00),
((SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026'), (SELECT id_pegawai FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Drs. Budi Santoso%'), (SELECT id_master_potongan FROM tb_master_potongan WHERE kode_potongan='POT_DANA_WAJIB'), 50000.00),
((SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026'), (SELECT id_pegawai FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Drs. Budi Santoso%'), (SELECT id_master_potongan FROM tb_master_potongan WHERE kode_potongan='POT_S_PSKD'), 20000.00),
((SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026'), (SELECT id_pegawai FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Drs. Budi Santoso%'), (SELECT id_master_potongan FROM tb_master_potongan WHERE kode_potongan='POT_PELKES'), 30000.00),
((SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026'), (SELECT id_pegawai FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Siti Aminah%'), (SELECT id_master_potongan FROM tb_master_potongan WHERE kode_potongan='POT_DANA_WAJIB'), 50000.00)
ON CONFLICT (id_periode, id_pegawai, id_master_potongan) DO NOTHING;


-- ==========================================
-- IV. PERFORMANCE INDEXES
-- ==========================================
-- Catatan: tabel transaksional (tb_absensi_summary, tb_tunjangan_bulanan,
-- tb_potongan_bulanan, tb_rekap_gaji, dan kedua tabel _detail) sudah otomatis
-- ke-index lewat UNIQUE(id_periode, id_pegawai, ...) masing-masing.
-- Jadi nggak perlu index tambahan di situ.
CREATE INDEX IF NOT EXISTS idx_pegawai_active ON tb_pegawai(id_pegawai) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_jabatan_active ON tb_jabatan(id_jabatan) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_golongan_active ON tb_golongan(id_golongan) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_periode_active ON tb_periode(id_periode) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pengguna_active ON tb_pengguna(id_pengguna) WHERE deleted_at IS NULL;