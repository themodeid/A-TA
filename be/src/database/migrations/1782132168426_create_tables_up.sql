-- ==========================================
-- I. MASTER TABLES & STRUCTURE
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

-- 2. Tabel Master Formula Tunjangan
CREATE TABLE IF NOT EXISTS tb_formula_tunjangan (
    id_formula_tunjangan SERIAL PRIMARY KEY,
    kode_formula VARCHAR(30) UNIQUE NOT NULL,
    nama_formula VARCHAR(100) NOT NULL,
    keterangan TEXT
);

-- 3. Tabel Master Tunjangan
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

-- 4. Master Formula Potongan
CREATE TABLE IF NOT EXISTS tb_formula_potongan (
    id_formula_potongan SERIAL PRIMARY KEY,
    kode_formula VARCHAR(30) UNIQUE NOT NULL, 
    nama_formula VARCHAR(100) NOT NULL,
    keterangan TEXT
);

-- 5. Tabel Master Potongan
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

-- 6. Master Jabatan
CREATE TABLE IF NOT EXISTS tb_jabatan (
    id_jabatan SERIAL PRIMARY KEY,
    nama_jabatan VARCHAR(50) UNIQUE NOT NULL,
    tunjangan_jabatan_struktural NUMERIC(12, 2) DEFAULT 0,
    deleted_at TIMESTAMPTZ DEFAULT NULL 
);

-- 7. Master Golongan
CREATE TABLE IF NOT EXISTS tb_golongan (
    id_golongan SERIAL PRIMARY KEY,
    nama_golongan VARCHAR(50) UNIQUE NOT NULL, 
    gaji_pokok_standar NUMERIC(12, 2) NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- 8. Master Periode
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

-- 9. Master Pegawai
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
-- II. TRANSACTION TABLES
-- ==========================================

-- 10. Transaksi Absensi Summary
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

-- 11. Log Approval
CREATE TABLE IF NOT EXISTS tb_approval (
    id_approval SERIAL PRIMARY KEY,
    id_periode INTEGER NOT NULL REFERENCES tb_periode(id_periode) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    catatan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Transaksi Tunjangan Bulanan (Header)
CREATE TABLE IF NOT EXISTS tb_tunjangan_bulanan (
    id_tunjangan_bulanan SERIAL PRIMARY KEY,
    id_periode INTEGER NOT NULL REFERENCES tb_periode(id_periode) ON DELETE CASCADE,
    id_pegawai INTEGER NOT NULL REFERENCES tb_pegawai(id_pegawai) ON DELETE CASCADE, 
    total_jam_lebih NUMERIC(5, 2) DEFAULT 0.00,
    honor_bulan NUMERIC(12, 2) DEFAULT 0.00,
    total_tunjangan_terhitung NUMERIC(12, 2) DEFAULT 0.00,
    UNIQUE (id_periode, id_pegawai)
);

-- 13. Detail Tunjangan Vertikal (Detail)
CREATE TABLE IF NOT EXISTS tb_tunjangan_bulanan_detail (
    id_tunjangan_detail SERIAL PRIMARY KEY,
    id_periode INTEGER NOT NULL REFERENCES tb_periode(id_periode) ON DELETE CASCADE,
    id_pegawai INTEGER NOT NULL REFERENCES tb_pegawai(id_pegawai) ON DELETE CASCADE,
    id_tunjangan INTEGER NOT NULL REFERENCES tb_tunjangan(id_tunjangan) ON DELETE RESTRICT,
    nilai_terhitung NUMERIC(12, 2) DEFAULT 0.00,
    CONSTRAINT unique_periode_pegawai_tunjangan UNIQUE (id_periode, id_pegawai, id_tunjangan)
);

-- 14. Transaksi Potongan Bulanan (Header)
CREATE TABLE IF NOT EXISTS tb_potongan_bulanan (
    id_potongan_bulanan SERIAL PRIMARY KEY,
    id_periode INTEGER NOT NULL REFERENCES tb_periode(id_periode) ON DELETE CASCADE,
    id_pegawai INTEGER NOT NULL REFERENCES tb_pegawai(id_pegawai) ON DELETE CASCADE, 
    total_potongan_terhitung NUMERIC(12, 2) DEFAULT 0,
    UNIQUE (id_periode, id_pegawai)
);

-- 15. Detail Potongan Vertikal (Detail)
CREATE TABLE IF NOT EXISTS tb_potongan_bulanan_detail (
    id_potongan_detail SERIAL PRIMARY KEY,
    id_periode INTEGER NOT NULL REFERENCES tb_periode(id_periode) ON DELETE CASCADE,
    id_pegawai INTEGER NOT NULL REFERENCES tb_pegawai(id_pegawai) ON DELETE CASCADE,
    id_master_potongan INTEGER NOT NULL REFERENCES tb_master_potongan(id_master_potongan) ON DELETE RESTRICT,
    nilai_potongan NUMERIC(12, 2) DEFAULT 0,
    CONSTRAINT unique_periode_pegawai_potongan UNIQUE (id_periode, id_pegawai, id_master_potongan)
);

-- 16. Rekap Gaji Akhir & Detail
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

-- 17. Log Audit Koreksi Jam
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

-- ==========================================
-- III. INDEKS OPTIMASI QUERY
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_tunjangan_detail_lookup ON tb_tunjangan_bulanan_detail(id_periode, id_pegawai);
CREATE INDEX IF NOT EXISTS idx_potongan_detail_lookup ON tb_potongan_bulanan_detail(id_periode, id_pegawai);
CREATE INDEX IF NOT EXISTS idx_rekap_gaji_periode ON tb_rekap_gaji(id_periode);
CREATE INDEX IF NOT EXISTS idx_pegawai_deleted_at ON tb_pegawai(deleted_at) WHERE deleted_at IS NULL;
