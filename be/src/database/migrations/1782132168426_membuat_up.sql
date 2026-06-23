-- 1. Master Pengguna (Untuk Login & Hak Akses Role)
CREATE TABLE IF NOT EXISTS tb_pengguna (
    id_pengguna SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('Admin', 'Petugas Absensi', 'Approver', 'Staf Gaji'))
);

-- 2. Master Jabatan
CREATE TABLE IF NOT EXISTS tb_jabatan (
    id_jabatan SERIAL PRIMARY KEY,
    nama_jabatan VARCHAR(50) UNIQUE NOT NULL,
    tunjangan_jabatan NUMERIC(12, 2) DEFAULT 0,
    tunjangan_transport NUMERIC(12, 2) DEFAULT 0,
    tunjangan_makan NUMERIC(12, 2) DEFAULT 0
);

-- 3. Master Pegawai
CREATE TABLE IF NOT EXISTS tb_pegawai (
    id_pegawai VARCHAR(10) PRIMARY KEY,
    nama_lengkap VARCHAR(100) NOT NULL,
    id_jabatan INTEGER NOT NULL REFERENCES tb_jabatan(id_jabatan),
    gaji_pokok NUMERIC(12, 2) NOT NULL DEFAULT 0, -- Ditambahkan sesuai data dari Kantor Pusat
    status VARCHAR(30) NOT NULL,
    jenis_kelamin CHAR(1) CHECK (jenis_kelamin IN ('L', 'P')),
    no_hp VARCHAR(20),
    email VARCHAR(100) UNIQUE
);

-- 4. Master Periode Cut-off
CREATE TABLE IF NOT EXISTS tb_periode (
    id_periode SERIAL PRIMARY KEY,
    bulan_gaji VARCHAR(20) NOT NULL,
    tanggal_awal DATE NOT NULL,
    tanggal_akhir DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'aktif', -- aktif / ditutup
    created_at TIMESTAMP DEFAULT NOW()
);

-- 5. Log Upload File Absensi
CREATE TABLE IF NOT EXISTS tb_upload_absensi (
    id_upload SERIAL PRIMARY KEY,
    id_periode INTEGER REFERENCES tb_periode(id_periode),
    nama_file VARCHAR(255) NOT NULL,
    diupload_oleh INT REFERENCES tb_pengguna(id_pengguna), -- Ditambahkan tracking user
    total_baris INTEGER DEFAULT 0,
    baris_sukses INTEGER DEFAULT 0,
    baris_gagal INTEGER DEFAULT 0,
    detail_error JSONB,
    status_proses VARCHAR(20) DEFAULT 'success',
    uploaded_at TIMESTAMP DEFAULT NOW()
);

-- 6. Transaksi Absensi Harian (Hasil Parsing)
CREATE TABLE IF NOT EXISTS tb_absensi (
    id_absen SERIAL PRIMARY KEY,
    id_periode INTEGER NOT NULL REFERENCES tb_periode(id_periode),
    id_pegawai VARCHAR(10) NOT NULL REFERENCES tb_pegawai(id_pegawai),
    id_upload INTEGER REFERENCES tb_upload_absensi(id_upload) ON DELETE CASCADE, -- Referensi log upload
    tanggal DATE NOT NULL,
    status_kehadiran VARCHAR(20) NOT NULL CHECK (status_kehadiran IN ('Hadir', 'Izin', 'Sakit', 'Alpha')),
    keterangan TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (id_pegawai, tanggal)
);

-- 7. Log Approval (Untuk Trigger Notifikasi n8n)
CREATE TABLE IF NOT EXISTS tb_approval (
    id_approval SERIAL PRIMARY KEY,
    id_periode INTEGER NOT NULL REFERENCES tb_periode(id_periode),
    approver_id INT NOT NULL REFERENCES tb_pengguna(id_pengguna), -- Pak Thomas
    status VARCHAR(20) NOT NULL CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    catatan TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 8. Transaksi Jam Lebih (Lembur)
CREATE TABLE IF NOT EXISTS tb_jam_lebih (
    id_jam_lebih SERIAL PRIMARY KEY,
    id_pegawai VARCHAR(10) NOT NULL REFERENCES tb_pegawai(id_pegawai),
    tanggal DATE NOT NULL,
    jam_masuk TIME,   -- Ditambahkan sesuai Bab 6 Dokumen
    jam_keluar TIME,  -- Ditambahkan sesuai Bab 6 Dokumen
    total_jam NUMERIC(12, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 9. Rekap Gaji Akhir
CREATE TABLE IF NOT EXISTS tb_rekap_gaji (
    id_rekap SERIAL PRIMARY KEY,
    id_periode INTEGER NOT NULL REFERENCES tb_periode(id_periode),
    id_pegawai VARCHAR(10) NOT NULL REFERENCES tb_pegawai(id_pegawai),
    total_hadir INT DEFAULT 0,
    total_jam_lebih NUMERIC(12, 2) DEFAULT 0,
    gaji_pokok_snapshot NUMERIC(12, 2) DEFAULT 0,    -- Nilai aman dari perubahan data master masa depan
    tunjangan_snapshot NUMERIC(12, 2) DEFAULT 0,     -- Nilai aman dari perubahan data master masa depan
    total_gaji_akhir NUMERIC(12, 2) DEFAULT 0,       -- Hasil kalkulasi final
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (id_periode, id_pegawai)
);