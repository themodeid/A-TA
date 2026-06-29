-- 1. Master Pengguna
CREATE TABLE IF NOT EXISTS tb_pengguna (
    id_pengguna SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('Admin', 'Petugas Absensi', 'Approver', 'Staf Gaji'))
);

-- 2. Master Parameter / Konfigurasi Aplikasi
CREATE TABLE IF NOT EXISTS tb_konfigurasi (
    id_konfigurasi SERIAL PRIMARY KEY,
    key_parameter VARCHAR(50) UNIQUE NOT NULL,
    nilai_parameter NUMERIC(12, 2) NOT NULL,
    keterangan TEXT
);

INSERT INTO tb_konfigurasi (key_parameter, nilai_parameter, keterangan) VALUES 
('TARIF_TRANSPORT_WFO', 30000.00, 'Uang transport per hari hadir fisik WFO'),
('PERSEN_TUNJ_ISTRI', 0.10, 'Persentase tunjangan suami/istri dari gaji pokok (10%)'),
('PERSEN_TUNJ_ANAK', 0.02, 'Persentase tunjangan per anak dari gaji pokok (2%)')
ON CONFLICT (key_parameter) DO NOTHING; -- Aman jika di-run berkali-kali

-- 3. Master Jabatan
CREATE TABLE IF NOT EXISTS tb_jabatan (
    id_jabatan SERIAL PRIMARY KEY,
    nama_jabatan VARCHAR(50) UNIQUE NOT NULL,
    tunjangan_jabatan_struktural NUMERIC(12, 2) DEFAULT 0,
    deleted_at TIMESTAMPTZ DEFAULT NULL 
);

-- 4. Master Pegawai
CREATE TABLE IF NOT EXISTS tb_pegawai (
    id_pegawai SERIAL PRIMARY KEY, 
    nama_lengkap VARCHAR(100) UNIQUE NOT NULL, 
    id_jabatan INTEGER NOT NULL REFERENCES tb_jabatan(id_jabatan),
    pangkat_golongan VARCHAR(50),
    status_perkawinan CHAR(2),
    jumlah_anak INTEGER DEFAULT 0,
    gaji_pokok_dasar NUMERIC(12, 2) NOT NULL DEFAULT 0, 
    jenis_kelamin CHAR(1),
    no_hp VARCHAR(20),
    email VARCHAR(100),
    deleted_at TIMESTAMPTZ DEFAULT NULL 
);

-- 5. Master Periode Cut-off
CREATE TABLE IF NOT EXISTS tb_periode (
    id_periode SERIAL PRIMARY KEY,
    bulan_gaji VARCHAR(20) NOT NULL, 
    tanggal_awal DATE NOT NULL,      
    tanggal_akhir DATE NOT NULL,     
    status VARCHAR(20) DEFAULT 'aktif' CHECK (status IN ('aktif', 'ditutup')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 6. Log Upload File Absensi
CREATE TABLE IF NOT EXISTS tb_upload_absensi (
    id_upload SERIAL PRIMARY KEY,
    id_periode INTEGER REFERENCES tb_periode(id_periode) ON DELETE CASCADE,
    nama_file VARCHAR(255) NOT NULL,
    diupload_oleh INTEGER REFERENCES tb_pengguna(id_pengguna), -- Diubah ke INTEGER agar konsisten
    total_baris INTEGER DEFAULT 0,
    baris_sukses INTEGER DEFAULT 0,
    baris_gagal INTEGER DEFAULT 0,
    detail_error JSONB,
    status_proses VARCHAR(20) DEFAULT 'success',
    uploaded_at TIMESTAMP DEFAULT NOW()
);

-- 7. Transaksi Absensi Bulanan
CREATE TABLE IF NOT EXISTS tb_absensi_summary (
    id_absensi_summary SERIAL PRIMARY KEY,
    id_periode INTEGER NOT NULL REFERENCES tb_periode(id_periode) ON DELETE CASCADE,
    id_pegawai INTEGER NOT NULL REFERENCES tb_pegawai(id_pegawai) ON DELETE CASCADE, 
    id_upload INTEGER REFERENCES tb_upload_absensi(id_upload) ON DELETE CASCADE,
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
    id_pegawai INTEGER NOT NULL REFERENCES tb_pegawai(id_pegawai) ON DELETE CASCADE, -- Diubah ke INTEGER
    tunjangan_kesra NUMERIC(12, 2) DEFAULT 0,
    tunjangan_supervisi NUMERIC(12, 2) DEFAULT 0,
    tunjangan_wali_kelas NUMERIC(12, 2) DEFAULT 0,
    tunjangan_piket NUMERIC(12, 2) DEFAULT 0,
    tunjangan_jurbeng NUMERIC(12, 2) DEFAULT 0,
    honor_bulan NUMERIC(12, 2) DEFAULT 0,
    tunjangan_khusus NUMERIC(12, 2) DEFAULT 0,
    total_jam_lebih NUMERIC(5, 2) DEFAULT 0, 
    UNIQUE (id_periode, id_pegawai)
);

-- 10. Transaksi Potongan Bulanan
CREATE TABLE IF NOT EXISTS tb_potongan_bulanan (
    id_potongan_bulanan SERIAL PRIMARY KEY,
    id_periode INTEGER NOT NULL REFERENCES tb_periode(id_periode) ON DELETE CASCADE,
    id_pegawai INTEGER NOT NULL REFERENCES tb_pegawai(id_pegawai) ON DELETE CASCADE, -- Diubah ke INTEGER
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
    id_pegawai INTEGER NOT NULL REFERENCES tb_pegawai(id_pegawai), -- Diubah ke INTEGER
    
    jabatan_snapshot VARCHAR(50) NOT NULL,
    pangkat_golongan_snapshot VARCHAR(50) NOT NULL, -- Diubah ke VARCHAR(50) agar pas dengan master
    
    gaji_pokok_snapshot NUMERIC(12, 2) DEFAULT 0,
    tunjangan_istri_snapshot NUMERIC(12, 2) DEFAULT 0,
    tunjangan_anak_snapshot NUMERIC(12, 2) DEFAULT 0,
    tunjangan_struktural_snapshot NUMERIC(12, 2) DEFAULT 0,
    total_tunjangan_dinamis_snapshot NUMERIC(12, 2) DEFAULT 0,
    transport_makan_snapshot NUMERIC(12, 2) DEFAULT 0,
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