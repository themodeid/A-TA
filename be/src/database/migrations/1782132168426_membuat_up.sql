-- ==========================================
-- I. MASTER TABLES (Tabel Utama / Referensi)
-- ==========================================
-- 0. Extension wajib untuk Exclude Overlap
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 1. Master Pengguna
CREATE TABLE IF NOT EXISTS tb_pengguna (
    id_pengguna SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('Admin', 'Petugas Absensi', 'Approver', 'Staf Gaji')),
    deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- 1. Tabel Master Formula Tunjangan (Ganti Hardcode CHECK)
CREATE TABLE IF NOT EXISTS tb_formula_tunjangan (
    kode_formula VARCHAR(30) PRIMARY KEY, -- Misal: 'HARIAN_HADIR_WFO', 'PERSEN_GAJI_JIKA_KAWIN'
    nama_formula VARCHAR(100) NOT NULL,   -- Misal: 'Tunjangan Uang Makan WFO'
    keterangan TEXT
);

-- 2. Tabel Master Tunjangan (Pakai Foreign Key)
CREATE TABLE IF NOT EXISTS tb_tunjangan (
    id_tunjangan SERIAL PRIMARY KEY,
    nama_tunjangan VARCHAR(100) NOT NULL,
    nilai NUMERIC(12, 2) NOT NULL DEFAULT 0,
    jenis_tunjangan VARCHAR(20) NOT NULL DEFAULT 'NOMINAL',
    sifat_tunjangan VARCHAR(20) NOT NULL DEFAULT 'BULANAN',
    keterangan TEXT,
    kode_kondisi VARCHAR(20) NOT NULL DEFAULT 'UMUM',
    formula_type VARCHAR(30) REFERENCES tb_formula_tunjangan(kode_formula) ON DELETE SET NULL,
    deleted_at TIMESTAMPTZ DEFAULT NULL,

    CONSTRAINT unique_kode_kondisi UNIQUE (kode_kondisi)
);

-- 3. Master Potongan
CREATE TABLE IF NOT EXISTS tb_formula_potongan (
    kode_formula VARCHAR(30) PRIMARY KEY, -- Misal: 'HARIAN_MANGKIR', 'PPH21_2026'
    nama_formula VARCHAR(100) NOT NULL,   -- Misal: 'Potongan Mangkir Harian'
    keterangan TEXT
);

-- Tabel Master Potongan cukup pakai FOREIGN KEY
CREATE TABLE IF NOT EXISTS tb_master_potongan (
    id_master_potongan SERIAL PRIMARY KEY,
    nama_potongan VARCHAR(100) NOT NULL,
    nilai NUMERIC(12, 2) NOT NULL DEFAULT 0,
    jenis_potongan VARCHAR(20) NOT NULL DEFAULT 'NOMINAL',
    sifat_potongan VARCHAR(20) NOT NULL DEFAULT 'BULANAN',
    keterangan TEXT,
    kode_potongan VARCHAR(20) UNIQUE NOT NULL,
    formula_type VARCHAR(30) REFERENCES tb_formula_potongan(kode_formula) ON DELETE SET NULL,
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

-- 6. Periode Gaji & Function
CREATE TABLE IF NOT EXISTS tb_periode (
    id_periode SERIAL PRIMARY KEY,
    bulan_gaji VARCHAR(20) NOT NULL UNIQUE, 
    tanggal_awal DATE NOT NULL,      
    tanggal_akhir DATE NOT NULL,     
    status VARCHAR(30) DEFAULT 'Pengisian Absensi' 
        CHECK (status IN (
            'Pengisian Absensi',
            'Menunggu Approval',
            'Disetujui',
            'Ditolak',
            'Diproses Gaji',
            'Selesai'
        )),
    deleted_at TIMESTAMPTZ DEFAULT NULL,
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
    IF p_tanggal_awal > p_tanggal_akhir THEN
        RAISE EXCEPTION 'tanggal_awal tidak boleh lebih besar dari tanggal_akhir';
    END IF;

    INSERT INTO public.tb_periode (bulan_gaji, tanggal_awal, tanggal_akhir)
    VALUES (p_bulan_gaji, p_tanggal_awal, p_tanggal_akhir)
    RETURNING id_periode INTO v_id_periode;

    RETURN v_id_periode;
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

-- 8. Transaksi Absensi Summary
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

-- 9. Log Approval (Diselaraskan menggunakan TIMESTAMPTZ)
CREATE TABLE IF NOT EXISTS tb_approval (
    id_approval SERIAL PRIMARY KEY,
    id_periode INTEGER NOT NULL REFERENCES tb_periode(id_periode) ON DELETE CASCADE,
    approver_id INTEGER NOT NULL REFERENCES tb_pengguna(id_pengguna),
    status VARCHAR(20) NOT NULL CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    catatan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Transaksi Tunjangan Bulanan & Detail
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

-- 11. Transaksi Potongan Bulanan & Detail
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

-- 12. Rekap Gaji Akhir & Detail
CREATE TABLE IF NOT EXISTS tb_rekap_gaji (
    id_rekap SERIAL PRIMARY KEY,
    id_periode INTEGER NOT NULL REFERENCES tb_periode(id_periode) ON DELETE RESTRICT,
    id_pegawai INTEGER NOT NULL REFERENCES tb_pegawai(id_pegawai) ON DELETE RESTRICT, 
    jabatan_snapshot VARCHAR(50) NOT NULL,
    pangkat_golongan_snapshot VARCHAR(50) NOT NULL, 
    gaji_pokok_snapshot NUMERIC(12, 2) DEFAULT 0,
    total_penghasilan_bruto NUMERIC(12, 2) DEFAULT 0,
    total_potongan NUMERIC(12, 2) DEFAULT 0,
    total_penerimaan_clean NUMERIC(12, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
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
    jam_awal NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    jam_koreksi NUMERIC(5, 2) NOT NULL,
    jam_akhir NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    jenis_koreksi VARCHAR(20) NOT NULL DEFAULT 'ADD' CHECK (jenis_koreksi IN ('ADD', 'SUBTRACT')),
    keterangan TEXT NOT NULL,
    bukti_dokumen VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_jam_non_negatif CHECK (jam_awal >= 0 AND jam_akhir >= 0)
);

-- =========================================================================
-- III. SEED DATA / DATA DEFAULT (VERSI PERBAIKAN AMAN CONFLICT)
-- =========================================================================

-- Seed Master Tunjangan (dengan formula_type)
INSERT INTO tb_tunjangan (nama_tunjangan, nilai, jenis_tunjangan, sifat_tunjangan, keterangan, kode_kondisi, formula_type) VALUES 
('Uang Transport WFO', 30000.00, 'NOMINAL', 'HARIAN', 'Uang transport fisik', 'TRN_WFO', 'HARIAN_HADIR_WFO'),
('Tunjangan Istri', 0.10, 'PERSENTASE', 'BULANAN', 'Tunjangan istri 10% dari gaji pokok', 'TUNJ_ISTRI', 'PERSEN_GAJI_JIKA_KAWIN'),
('Tunjangan Anak', 0.02, 'PERSENTASE', 'BULANAN', 'Tunjangan per anak 2% dari gaji pokok', 'TUNJ_ANAK', 'PERSEN_GAJI_PER_ANAK'),
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

-- Periode Juli 2026 disesuaikan ke tanggal 16 Juni - 15 Juli dengan status 'Selesai'
INSERT INTO tb_periode (bulan_gaji, tanggal_awal, tanggal_akhir, status) 
VALUES ('Juli 2026', '2026-06-16', '2026-07-15', 'Selesai')
ON CONFLICT (bulan_gaji) DO UPDATE SET tanggal_awal = EXCLUDED.tanggal_awal, tanggal_akhir = EXCLUDED.tanggal_akhir, status = EXCLUDED.status;

-- Seed Master Pegawai menggunakan WHERE NOT EXISTS (Aman dari kendala Unique Constraint)
INSERT INTO tb_pegawai (nama_dan_tanggal_lahir, id_jabatan, id_golongan, status_perkawinan, jumlah_anak, gaji_pokok_dasar)
SELECT 'Drs. Budi Santoso - 1975-05-12', (SELECT id_jabatan FROM tb_jabatan WHERE nama_jabatan='Kepala Sekolah'), (SELECT id_golongan FROM tb_golongan WHERE nama_golongan='Golongan IV/a (Pembina)'), 'K', 2, 3500000.00
WHERE NOT EXISTS (SELECT 1 FROM tb_pegawai WHERE nama_dan_tanggal_lahir = 'Drs. Budi Santoso - 1975-05-12');

INSERT INTO tb_pegawai (nama_dan_tanggal_lahir, id_jabatan, id_golongan, status_perkawinan, jumlah_anak, gaji_pokok_dasar)
SELECT 'Siti Aminah S.Pd - 1990-08-20', (SELECT id_jabatan FROM tb_jabatan WHERE nama_jabatan='Wali Kelas'), (SELECT id_golongan FROM tb_golongan WHERE nama_golongan='Golongan III/b (Penata Muda Tk. I)'), 'TK', 0, 2900000.00
WHERE NOT EXISTS (SELECT 1 FROM tb_pegawai WHERE nama_dan_tanggal_lahir = 'Siti Aminah S.Pd - 1990-08-20');

INSERT INTO tb_pegawai (nama_dan_tanggal_lahir, id_jabatan, id_golongan, status_perkawinan, jumlah_anak, gaji_pokok_dasar)
SELECT 'Rian Hidayat - 1998-11-02', (SELECT id_jabatan FROM tb_jabatan WHERE nama_jabatan='Guru Tetap / Staf TU'), (SELECT id_golongan FROM tb_golongan WHERE nama_golongan='GTT/PTT (Guru/Pegawai Tidak Tetap)'), 'TK', 0, 1500000.00
WHERE NOT EXISTS (SELECT 1 FROM tb_pegawai WHERE nama_dan_tanggal_lahir = 'Rian Hidayat - 1998-11-02');

-- Seed Transaksi Absensi
INSERT INTO tb_absensi_summary (id_periode, id_pegawai, total_hadir_ops_wfo, total_hadir_ops_wfh, total_izin, total_sakit, total_alpha) VALUES
((SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026'), (SELECT id_pegawai FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Drs. Budi Santoso%' LIMIT 1), 24, 0, 1, 0, 0),
((SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026'), (SELECT id_pegawai FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Siti Aminah%' LIMIT 1), 25, 0, 0, 0, 0),
((SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026'), (SELECT id_pegawai FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Rian Hidayat%' LIMIT 1), 22, 0, 0, 3, 0)
ON CONFLICT (id_periode, id_pegawai) DO NOTHING;

-- Seed Transaksi Tunjangan Bulanan Variabel
INSERT INTO tb_tunjangan_bulanan (id_periode, id_pegawai, total_jam_lebih, honor_bulan) VALUES
((SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026'), (SELECT id_pegawai FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Drs. Budi Santoso%' LIMIT 1), 0.00, 0.00),
((SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026'), (SELECT id_pegawai FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Siti Aminah%' LIMIT 1), 12.50, 0.00),
((SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026'), (SELECT id_pegawai FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Rian Hidayat%' LIMIT 1), 5.00, 200000.00)
ON CONFLICT (id_periode, id_pegawai) DO NOTHING;

-- Seed Detail Tunjangan Vertikal
INSERT INTO tb_tunjangan_bulanan_detail (id_periode, id_pegawai, id_tunjangan, nilai_terhitung) VALUES
((SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026'), (SELECT id_pegawai FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Drs. Budi Santoso%' LIMIT 1), (SELECT id_tunjangan FROM tb_tunjangan WHERE kode_kondisi='TRN_WFO'), 720000.00),
((SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026'), (SELECT id_pegawai FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Drs. Budi Santoso%' LIMIT 1), (SELECT id_tunjangan FROM tb_tunjangan WHERE kode_kondisi='TUNJ_ISTRI'), 350000.00),
((SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026'), (SELECT id_pegawai FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Drs. Budi Santoso%' LIMIT 1), (SELECT id_tunjangan FROM tb_tunjangan WHERE kode_kondisi='TUNJ_ANAK'), 140000.00),
((SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026'), (SELECT id_pegawai FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Siti Aminah%' LIMIT 1), (SELECT id_tunjangan FROM tb_tunjangan WHERE kode_kondisi='TRN_WFO'), 750000.00),
((SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026'), (SELECT id_pegawai FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Rian Hidayat%' LIMIT 1), (SELECT id_tunjangan FROM tb_tunjangan WHERE kode_kondisi='TRN_WFO'), 660000.00)
ON CONFLICT (id_periode, id_pegawai, id_tunjangan) DO NOTHING;

-- Seed Transaksi Potongan Utama (Header)
-- Seed Potongan Bulanan (Header)
INSERT INTO tb_potongan_bulanan (id_periode, id_pegawai, total_potongan_terhitung) VALUES
((SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026'), (SELECT id_pegawai FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Drs. Budi Santoso%' LIMIT 1), 600000.00),
((SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026'), (SELECT id_pegawai FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Siti Aminah%' LIMIT 1), 110000.00),
((SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026'), (SELECT id_pegawai FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Rian Hidayat%' LIMIT 1), 450000.00)
ON CONFLICT (id_periode, id_pegawai) DO NOTHING;

-- Seed Detail Potongan Vertikal (SUDAH DISINKRONKAN)
INSERT INTO tb_potongan_bulanan_detail (id_periode, id_pegawai, id_master_potongan, nilai_potongan) VALUES
((SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026'), (SELECT id_pegawai FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Drs. Budi Santoso%' LIMIT 1), (SELECT id_master_potongan FROM tb_master_potongan WHERE kode_potongan='POT_ANGSURAN'), 500000.00),
((SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026'), (SELECT id_pegawai FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Drs. Budi Santoso%' LIMIT 1), (SELECT id_master_potongan FROM tb_master_potongan WHERE kode_potongan='POT_DANA_WAJIB'), 50000.00),
((SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026'), (SELECT id_pegawai FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Drs. Budi Santoso%' LIMIT 1), (SELECT id_master_potongan FROM tb_master_potongan WHERE kode_potongan='POT_S_PSKD'), 20000.00),
((SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026'), (SELECT id_pegawai FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Drs. Budi Santoso%' LIMIT 1), (SELECT id_master_potongan FROM tb_master_potongan WHERE kode_potongan='POT_PELKES'), 30000.00),
((SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026'), (SELECT id_pegawai FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Siti Aminah%' LIMIT 1), (SELECT id_master_potongan FROM tb_master_potongan WHERE kode_potongan='POT_DANA_WAJIB'), 50000.00),
((SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026'), (SELECT id_pegawai FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Siti Aminah%' LIMIT 1), (SELECT id_master_potongan FROM tb_master_potongan WHERE kode_potongan='POT_LAINNYA'), 60000.00),
((SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026'), (SELECT id_pegawai FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Rian Hidayat%' LIMIT 1), (SELECT id_master_potongan FROM tb_master_potongan WHERE kode_potongan='POT_LAINNYA'), 450000.00)

ON CONFLICT (id_periode, id_pegawai, id_master_potongan) DO NOTHING;

-- Seed Rekap Utama
INSERT INTO public.tb_rekap_gaji 
  (id_periode, id_pegawai, jabatan_snapshot, pangkat_golongan_snapshot, gaji_pokok_snapshot, total_penghasilan_bruto, total_potongan, total_penerimaan_clean) 
VALUES 
  ((SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026'), 
   (SELECT id_pegawai FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Drs. Budi Santoso%' LIMIT 1), 
   'Kepala Sekolah', 'Golongan IV/a (Pembina)', 3500000.00, 6710000.00, 600000.00, 6110000.00),

  ((SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026'), 
   (SELECT id_pegawai FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Siti Aminah%' LIMIT 1), 
   'Wali Kelas', 'Golongan III/b (Penata Muda Tk. I)', 2900000.00, 4462500.00, 110000.00, 4352500.00),

  ((SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026'), 
   (SELECT id_pegawai FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Rian Hidayat%' LIMIT 1), 
   'Guru Tetap / Staf TU', 'GTT/PTT (Guru/Pegawai Tidak Tetap)', 1500000.00, 2485000.00, 450000.00, 2035000.00)
ON CONFLICT (id_periode, id_pegawai) DO UPDATE 
SET 
  total_penghasilan_bruto = EXCLUDED.total_penghasilan_bruto,
  total_potongan = EXCLUDED.total_potongan,
  total_penerimaan_clean = EXCLUDED.total_penerimaan_clean;

-- Hapus detail lama jika ada kecocokan rekap agar tidak duplikat saat seeding ulang
DELETE FROM public.tb_rekap_gaji_detail 
WHERE id_rekap IN (SELECT id_rekap FROM public.tb_rekap_gaji WHERE id_periode = (SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026'));

-- Masukkan data breakdown slip gaji (Subquery aman dengan LIMIT 1)
INSERT INTO public.tb_rekap_gaji_detail 
  (id_rekap, jenis_komponen, nama_komponen_snapshot, nilai_snapshot, kode_kondisi_snapshot) 
VALUES 
  ((SELECT id_rekap FROM tb_rekap_gaji WHERE id_periode = (SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026') AND id_pegawai = (SELECT id_pegawai FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Drs. Budi Santoso%' LIMIT 1) LIMIT 1), 
   'TUNJANGAN', 'Tunjangan Struktural Kepala Sekolah', 2000000.00, 'TUNJ_STRUKTURAL'),
  
  ((SELECT id_rekap FROM tb_rekap_gaji WHERE id_periode = (SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026') AND id_pegawai = (SELECT id_pegawai FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Drs. Budi Santoso%' LIMIT 1) LIMIT 1), 
   'TUNJANGAN', 'Uang Transport WFO', 720000.00, 'TRN_WFO'),
  
  ((SELECT id_rekap FROM tb_rekap_gaji WHERE id_periode = (SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026') AND id_pegawai = (SELECT id_pegawai FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Drs. Budi Santoso%' LIMIT 1) LIMIT 1), 
   'TUNJANGAN', 'Tunjangan Istri', 350000.00, 'TUNJ_ISTRI'),
  
  ((SELECT id_rekap FROM tb_rekap_gaji WHERE id_periode = (SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026') AND id_pegawai = (SELECT id_pegawai FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Drs. Budi Santoso%' LIMIT 1) LIMIT 1), 
   'TUNJANGAN', 'Tunjangan Anak', 140000.00, 'TUNJ_ANAK'),
  
  ((SELECT id_rekap FROM tb_rekap_gaji WHERE id_periode = (SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026') AND id_pegawai = (SELECT id_pegawai FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Drs. Budi Santoso%' LIMIT 1) LIMIT 1), 
   'POTONGAN', 'Potongan Angsuran', 500000.00, 'POT_ANGSURAN'),
  
  ((SELECT id_rekap FROM tb_rekap_gaji WHERE id_periode = (SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026') AND id_pegawai = (SELECT id_pegawai FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Drs. Budi Santoso%' LIMIT 1) LIMIT 1), 
   'POTONGAN', 'Potongan Dana Wajib', 50000.00, 'POT_DANA_WAJIB'),
  
  ((SELECT id_rekap FROM tb_rekap_gaji WHERE id_periode = (SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026') AND id_pegawai = (SELECT id_pegawai FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Drs. Budi Santoso%' LIMIT 1) LIMIT 1), 
   'POTONGAN', 'Potongan S_PSKD', 20000.00, 'POT_S_PSKD'),
  
  ((SELECT id_rekap FROM tb_rekap_gaji WHERE id_periode = (SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026') AND id_pegawai = (SELECT id_pegawai FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Drs. Budi Santoso%' LIMIT 1) LIMIT 1), 
   'POTONGAN', 'Potongan Pelkes', 30000.00, 'POT_PELKES'),

  -- DETAILS FOR: Siti Aminah S.Pd
  ((SELECT id_rekap FROM tb_rekap_gaji WHERE id_periode = (SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026') AND id_pegawai = (SELECT id_pegawai FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Siti Aminah%' LIMIT 1) LIMIT 1), 
   'TUNJANGAN', 'Tunjangan Struktural Wali Kelas', 500000.00, 'TUNJ_STRUKTURAL'),
  
  ((SELECT id_rekap FROM tb_rekap_gaji WHERE id_periode = (SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026') AND id_pegawai = (SELECT id_pegawai FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Siti Aminah%' LIMIT 1) LIMIT 1), 
   'TUNJANGAN', 'Uang Transport WFO', 750000.00, 'TRN_WFO'),
  
  ((SELECT id_rekap FROM tb_rekap_gaji WHERE id_periode = (SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026') AND id_pegawai = (SELECT id_pegawai FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Siti Aminah%' LIMIT 1) LIMIT 1), 
   'TUNJANGAN', 'Honor Lembur (12.5 Jam)', 312500.00, 'LEMBUR_PER_JAM'),
  
  ((SELECT id_rekap FROM tb_rekap_gaji WHERE id_periode = (SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026') AND id_pegawai = (SELECT id_pegawai FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Siti Aminah%' LIMIT 1) LIMIT 1), 
   'POTONGAN', 'Potongan Dana Wajib', 50000.00, 'POT_DANA_WAJIB'),
  
  ((SELECT id_rekap FROM tb_rekap_gaji WHERE id_periode = (SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026') AND id_pegawai = (SELECT id_pegawai FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Siti Aminah%' LIMIT 1) LIMIT 1), 
   'POTONGAN', 'Potongan Lainnya / Penyesuaian', 60000.00, 'POT_LAINNYA'),

  -- DETAILS FOR: Rian Hidayat
  ((SELECT id_rekap FROM tb_rekap_gaji WHERE id_periode = (SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026') AND id_pegawai = (SELECT id_pegawai FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Rian Hidayat%' LIMIT 1) LIMIT 1), 
   'TUNJANGAN', 'Uang Transport WFO', 660000.00, 'TRN_WFO'),
  
  ((SELECT id_rekap FROM tb_rekap_gaji WHERE id_periode = (SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026') AND id_pegawai = (SELECT id_pegawai FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Rian Hidayat%' LIMIT 1) LIMIT 1), 
   'TUNJANGAN', 'Honor Lembur (5 Jam)', 125000.00, 'LEMBUR_PER_JAM'),
  
  ((SELECT id_rekap FROM tb_rekap_gaji WHERE id_periode = (SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026') AND id_pegawai = (SELECT id_pegawai FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Rian Hidayat%' LIMIT 1) LIMIT 1), 
   'TUNJANGAN', 'Honor Tambahan Bulan Ini', 200000.00, 'HONOR_BULANAN_MANUAL'),
  
  ((SELECT id_rekap FROM tb_rekap_gaji WHERE id_periode = (SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026') AND id_pegawai = (SELECT id_pegawai FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Rian Hidayat%' LIMIT 1) LIMIT 1), 
   'POTONGAN', 'Total Potongan Terhitung', 450000.00, 'POT_LAINNYA');

CREATE INDEX IF NOT EXISTS idx_tunjangan_detail_lookup ON tb_tunjangan_bulanan_detail(id_periode, id_pegawai);
CREATE INDEX IF NOT EXISTS idx_potongan_detail_lookup ON tb_potongan_bulanan_detail(id_periode, id_pegawai);
CREATE INDEX IF NOT EXISTS idx_rekap_gaji_periode ON tb_rekap_gaji(id_periode);
CREATE INDEX IF NOT EXISTS idx_pegawai_deleted_at ON tb_pegawai(deleted_at) WHERE deleted_at IS NULL;