-- migrations/001_init_schema.up.sql

CREATE TABLE IF NOT EXISTS tb_periode (
    id_periode SERIAL PRIMARY KEY,
    bulan_gaji VARCHAR(20) NOT NULL,
    tanggal_awal DATE NOT NULL,
    tanggal_akhir DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'aktif',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tb_pegawai (
    id_pegawai VARCHAR(10) PRIMARY KEY,
    nama_lengkap VARCHAR(100) NOT NULL,
    jabatan VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL,
    jenis_kelamin CHAR(1),
    no_hp VARCHAR(20),
    email VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS tb_absensi (
    id_absen SERIAL PRIMARY KEY,
    id_periode INTEGER NOT NULL REFERENCES tb_periode(id_periode),
    id_pegawai VARCHAR(10) NOT NULL REFERENCES tb_pegawai(id_pegawai),
    tanggal DATE NOT NULL,
    status_kehadiran VARCHAR(20) NOT NULL CHECK (status_kehadiran IN ('Hadir', 'Izin', 'Sakit', 'Alpha')),
    keterangan TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (id_pegawai, tanggal)
);

-- Nama tabel disesuaikan dengan skrip absensi.ts agar log pencatatan tidak error
CREATE TABLE IF NOT EXISTS tb_upload_absensi (
    id_upload SERIAL PRIMARY KEY,
    id_periode INTEGER REFERENCES tb_periode(id_periode),
    nama_file VARCHAR(255),
    total_baris INTEGER,
    baris_sukses INTEGER,
    baris_gagal INTEGER,
    detail_error JSONB,
    uploaded_at TIMESTAMP DEFAULT NOW()
);