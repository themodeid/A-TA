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
    tunjangan_jabatan_struktural NUMERIC(12, 2) DEFAULT 0
);

-- 3. Master Pegawai (Disesuaikan dengan Struktur Golongan & Keluarga PSKD)
CREATE TABLE IF NOT EXISTS tb_pegawai (
    id_pegawai VARCHAR(10) PRIMARY KEY,
    nama_lengkap VARCHAR(100) NOT NULL,
    id_jabatan INTEGER NOT NULL REFERENCES tb_jabatan(id_jabatan),
    pangkat_golongan VARCHAR(10), -- Contoh: 'III/d', 'III/c'
    status_perkawinan CHAR(1) CHECK (status_perkawinan IN ('K', 'TK')), -- K=Kawin, TK=Tidak Kawin
    jumlah_anak INTEGER DEFAULT 0,
    gaji_pokok_dasar NUMERIC(12, 2) NOT NULL DEFAULT 0, -- Sesuai ketentuan pusat / PP
    jenis_kelamin CHAR(1) CHECK (jenis_kelamin IN ('L', 'P')),
    no_hp VARCHAR(20),
    email VARCHAR(100) UNIQUE
);

-- 4. Master Periode Cut-off
CREATE TABLE IF NOT EXISTS tb_periode (
    id_periode SERIAL PRIMARY KEY,
    bulan_gaji VARCHAR(20) NOT NULL, -- Contoh: 'Juni 2026'
    tanggal_awal DATE NOT NULL,      -- Biasanya tanggal 16 bulan lalu
    tanggal_akhir DATE NOT NULL,     -- Biasanya tanggal 15/16 bulan berjalan
    status VARCHAR(20) DEFAULT 'aktif' CHECK (status IN ('aktif', 'ditutup')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 5. Log Upload File Absensi (Tracking Otomatisasi & n8n)
CREATE TABLE IF NOT EXISTS tb_upload_absensi (
    id_upload SERIAL PRIMARY KEY,
    id_periode INTEGER REFERENCES tb_periode(id_periode),
    nama_file VARCHAR(255) NOT NULL,
    diupload_oleh INT REFERENCES tb_pengguna(id_pengguna),
    total_baris INTEGER DEFAULT 0,
    baris_sukses INTEGER DEFAULT 0,
    baris_gagal INTEGER DEFAULT 0,
    detail_error JSONB,
    status_proses VARCHAR(20) DEFAULT 'success',
    uploaded_at TIMESTAMP DEFAULT NOW()
);

-- 6. Transaksi Absensi Bulanan (Hasil Agregasi Fingerprint per Periode)
CREATE TABLE IF NOT EXISTS tb_absensi_summary (
    id_absensi_summary SERIAL PRIMARY KEY,
    id_periode INTEGER NOT NULL REFERENCES tb_periode(id_periode),
    id_pegawai VARCHAR(10) NOT NULL REFERENCES tb_pegawai(id_pegawai),
    id_upload INTEGER REFERENCES tb_upload_absensi(id_upload) ON DELETE CASCADE,
    total_hadir_ops_wfo INT DEFAULT 0,
    total_hadir_ops_wfh INT DEFAULT 0,
    total_izin INT DEFAULT 0,
    total_sakit INT DEFAULT 0,
    total_alpha INT DEFAULT 0,
    UNIQUE (id_periode, id_pegawai)
);

-- 7. Log Approval (Trigger Notifikasi WhatsApp via n8n oleh Pak Thomas)
CREATE TABLE IF NOT EXISTS tb_approval (
    id_approval SERIAL PRIMARY KEY,
    id_periode INTEGER NOT NULL REFERENCES tb_periode(id_periode),
    approver_id INT NOT NULL REFERENCES tb_pengguna(id_pengguna),
    status VARCHAR(20) NOT NULL CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    catatan TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 8. Transaksi Tunjangan Dinamis & Jam Lebih (Diisi/Disesuaikan Pak Thomas & Maria)
CREATE TABLE IF NOT EXISTS tb_tunjangan_bulanan (
    id_tunjangan_bulanan SERIAL PRIMARY KEY,
    id_periode INTEGER NOT NULL REFERENCES tb_periode(id_periode),
    id_pegawai VARCHAR(10) NOT NULL REFERENCES tb_pegawai(id_pegawai),
    tunjangan_kesra NUMERIC(12, 2) DEFAULT 0,
    tunjangan_supervisi NUMERIC(12, 2) DEFAULT 0,
    tunjangan_wali_kelas NUMERIC(12, 2) DEFAULT 0,
    tunjangan_piket NUMERIC(12, 2) DEFAULT 0,
    tunjangan_jurbeng NUMERIC(12, 2) DEFAULT 0,
    honor_bulan NUMERIC(12, 2) DEFAULT 0,
    tunjangan_khusus NUMERIC(12, 2) DEFAULT 0,
    total_jam_lebih NUMERIC(5, 2) DEFAULT 0, -- Diambil dari data rekap jam
    UNIQUE (id_periode, id_pegawai)
);

-- 9. Rekap Gaji Akhir & Potongan (Snapshot Final untuk Export Permintaan Pembayaran)
CREATE TABLE IF NOT EXISTS tb_rekap_gaji (
    id_rekap SERIAL PRIMARY KEY,
    id_periode INTEGER NOT NULL REFERENCES tb_periode(id_periode),
    id_pegawai VARCHAR(10) NOT NULL REFERENCES tb_pegawai(id_pegawai),
    
    -- Snapshot Pendapatan
    gaji_pokok_snapshot NUMERIC(12, 2) DEFAULT 0,
    tunjangan_keluarga_snapshot NUMERIC(12, 2) DEFAULT 0, -- Istri + Anak jika ada
    total_tunjangan_snapshot NUMERIC(12, 2) DEFAULT 0,    -- Gabungan semua tunjangan dinamis & struktural
    transport_makan_snapshot NUMERIC(12, 2) DEFAULT 0,    -- Hasil kali hari hadir WFO * Rp30.000
    total_penghasilan_bruto NUMERIC(12, 2) DEFAULT 0,
    
    -- Snapshot Potongan (Sangat Krusial di Excel PSKD)
    potongan_angsuran NUMERIC(12, 2) DEFAULT 0,
    potongan_dana_wajib NUMERIC(12, 2) DEFAULT 0,
    potongan_s_pskd NUMERIC(12, 2) DEFAULT 0,
    potongan_pelkes NUMERIC(12, 2) DEFAULT 0,
    total_potongan NUMERIC(12, 2) DEFAULT 0,
    
    -- Hasil Bersih
    total_penerimaan_bersih NUMERIC(12, 2) DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (id_periode, id_pegawai)
);