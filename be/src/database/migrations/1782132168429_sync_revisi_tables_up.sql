-- ====================================================================
-- MIGRATION: 1782132168429_sync_revisi_tables_up.sql
-- SINKRONISASI 13 TABEL DOKUMEN REVISI TA (SMK PSKD 3 JAKARTA)
-- ====================================================================

-- 1. Penyesuaian Kolom pada tb_pegawai
ALTER TABLE tb_pegawai 
    ADD COLUMN IF NOT EXISTS nama VARCHAR(150),
    ADD COLUMN IF NOT EXISTS tanggal_lahir DATE,
    ADD COLUMN IF NOT EXISTS nip VARCHAR(50),
    ADD COLUMN IF NOT EXISTS status_kepegawaian VARCHAR(20) DEFAULT 'GTY',
    ADD COLUMN IF NOT EXISTS kontak VARCHAR(50);

-- Update data nama jika kolom lama nama_dan_tanggal_lahir berisi data
UPDATE tb_pegawai 
SET nama = SPLIT_PART(nama_dan_tanggal_lahir, ' - ', 1)
WHERE nama IS NULL AND nama_dan_tanggal_lahir IS NOT NULL;

-- 2. Penyesuaian Kolom pada tb_jabatan
ALTER TABLE tb_jabatan
    ADD COLUMN IF NOT EXISTS tunjangan_jabatan_fungsional NUMERIC(12, 2) DEFAULT 0;

-- 3. Penyesuaian Kolom pada tb_periode
ALTER TABLE tb_periode
    ADD COLUMN IF NOT EXISTS bulan INTEGER,
    ADD COLUMN IF NOT EXISTS tahun INTEGER;

-- 4. Tabel tb_absensi (Form Grid Kehadiran Harian Per Pegawai Per Periode)
CREATE TABLE IF NOT EXISTS tb_absensi (
    id_absensi SERIAL PRIMARY KEY,
    id_pegawai INTEGER NOT NULL REFERENCES tb_pegawai(id_pegawai) ON DELETE CASCADE,
    id_periode INTEGER NOT NULL REFERENCES tb_periode(id_periode) ON DELETE CASCADE,
    tanggal DATE NOT NULL,
    jam_masuk TIME,
    jam_keluar TIME,
    status VARCHAR(20) NOT NULL DEFAULT 'Hadir' CHECK (status IN ('Hadir', 'Izin', 'Sakit', 'Alpha', 'Libur', 'WFH', 'WFO')),
    keterangan TEXT,
    diinput_oleh INTEGER REFERENCES tb_pengguna(id_pengguna) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_pegawai_periode_tanggal UNIQUE (id_pegawai, id_periode, tanggal)
);

-- 5. Tabel tb_jam_mengajar (Hasil Hitung Otomatis Rekap Jam dari tb_absensi)
CREATE TABLE IF NOT EXISTS tb_jam_mengajar (
    id_jam_mengajar SERIAL PRIMARY KEY,
    id_pegawai INTEGER NOT NULL REFERENCES tb_pegawai(id_pegawai) ON DELETE CASCADE,
    id_periode INTEGER NOT NULL REFERENCES tb_periode(id_periode) ON DELETE CASCADE,
    keterangan_tugas VARCHAR(50) DEFAULT 'Guru',
    total_jam NUMERIC(6, 2) DEFAULT 0,
    jam_wajib NUMERIC(6, 2) DEFAULT 0,
    jam_lebih NUMERIC(6, 2) DEFAULT 0,
    jam_tidak_hadir NUMERIC(6, 2) DEFAULT 0,
    hari_hadir_honor INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_periode_pegawai_jam UNIQUE (id_periode, id_pegawai)
);

-- 6. Tabel tb_gaji_pokok (Master Komponen Gaji Pokok PP 1985/1997 & Potongan Tetap)
CREATE TABLE IF NOT EXISTS tb_gaji_pokok (
    id_gaji_pokok SERIAL PRIMARY KEY,
    id_pegawai INTEGER NOT NULL UNIQUE REFERENCES tb_pegawai(id_pegawai) ON DELETE CASCADE,
    golongan_ruang VARCHAR(100),
    status_kawin VARCHAR(10) DEFAULT 'TK',
    jumlah_anak INTEGER DEFAULT 0,
    gaji_pokok_pp NUMERIC(12, 2) DEFAULT 0,
    tunjangan_suami_istri NUMERIC(12, 2) DEFAULT 0,
    tunjangan_anak NUMERIC(12, 2) DEFAULT 0,
    tunjangan_kesra_dasar NUMERIC(12, 2) DEFAULT 0,
    tunjangan_jabatan_struktural NUMERIC(12, 2) DEFAULT 0,
    tunjangan_jabatan_fungsional NUMERIC(12, 2) DEFAULT 0,
    tunjangan_jabatan_25_pp85 NUMERIC(12, 2) DEFAULT 0,
    sumbangan_dana_chuk_2 NUMERIC(12, 2) DEFAULT 0,
    sumbangan_dana_chuk_8 NUMERIC(12, 2) DEFAULT 0,
    tunjangan_perbaikan_penghasilan NUMERIC(12, 2) DEFAULT 0,
    pembulatan NUMERIC(12, 2) DEFAULT 0,
    jumlah_bruto NUMERIC(12, 2) DEFAULT 0,
    potongan_angsuran_pinjaman NUMERIC(12, 2) DEFAULT 0,
    potongan_simpanan_wajib NUMERIC(12, 2) DEFAULT 0,
    potongan_dana_chuk NUMERIC(12, 2) DEFAULT 0,
    potongan_premi_kesehatan NUMERIC(12, 2) DEFAULT 0,
    total_potongan_tetap NUMERIC(12, 2) DEFAULT 0,
    gaji_bersih_tetap NUMERIC(12, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Tabel tb_tunjangan_periode (Komponen Tunjangan Bulanan & Hadir Operasional Pak Thomas)
CREATE TABLE IF NOT EXISTS tb_tunjangan_periode (
    id_tunjangan_periode SERIAL PRIMARY KEY,
    id_periode INTEGER NOT NULL REFERENCES tb_periode(id_periode) ON DELETE CASCADE,
    id_pegawai INTEGER NOT NULL REFERENCES tb_pegawai(id_pegawai) ON DELETE CASCADE,
    tunjangan_kesra NUMERIC(12, 2) DEFAULT 0,
    supervisi_kasek NUMERIC(12, 2) DEFAULT 0,
    tunjangan_jabatan_kasek NUMERIC(12, 2) DEFAULT 0,
    wali_kelas NUMERIC(12, 2) DEFAULT 0,
    piket NUMERIC(12, 2) DEFAULT 0,
    rumpun_jurusan NUMERIC(12, 2) DEFAULT 0,
    honor_bulan NUMERIC(12, 2) DEFAULT 0,
    jumlah_wfh INTEGER DEFAULT 0,
    nominal_potongan_wfh NUMERIC(12, 2) DEFAULT 0,
    jumlah_wfo INTEGER DEFAULT 0,
    transport_wfo NUMERIC(12, 2) DEFAULT 0,
    tunjangan_khusus NUMERIC(12, 2) DEFAULT 0,
    total_tunjangan NUMERIC(12, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_periode_pegawai_tunjangan_periode UNIQUE (id_periode, id_pegawai)
);

-- 8. Penyesuaian Kolom pada tb_approval
ALTER TABLE tb_approval
    ADD COLUMN IF NOT EXISTS id_approver INTEGER REFERENCES tb_pengguna(id_pengguna) ON DELETE SET NULL;

-- 9. Penyesuaian Kolom pada tb_rekap_gaji
ALTER TABLE tb_rekap_gaji
    ADD COLUMN IF NOT EXISTS hari_hadir INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS gaji_kompetensi NUMERIC(12, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tunjangan_jabatan_dll NUMERIC(12, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS transport_uang_makan NUMERIC(12, 2) DEFAULT 0;

-- 10. Tabel tb_permintaan_pembayaran (Dokumen Resmi Penggajian untuk Kasek & Bendahara)
CREATE TABLE IF NOT EXISTS tb_permintaan_pembayaran (
    id_permintaan SERIAL PRIMARY KEY,
    id_periode INTEGER NOT NULL UNIQUE REFERENCES tb_periode(id_periode) ON DELETE CASCADE,
    nomor_dokumen VARCHAR(100),
    status VARCHAR(30) DEFAULT 'Draft' CHECK (status IN ('Draft', 'Final', 'Disetujui Bendahara')),
    total_gaji_pokok NUMERIC(15, 2) DEFAULT 0,
    total_tunjangan NUMERIC(15, 2) DEFAULT 0,
    total_honorarium NUMERIC(15, 2) DEFAULT 0,
    total_transport NUMERIC(15, 2) DEFAULT 0,
    total_penghasilan_kotor NUMERIC(15, 2) DEFAULT 0,
    total_potongan NUMERIC(15, 2) DEFAULT 0,
    total_dana_dibayarkan NUMERIC(15, 2) DEFAULT 0,
    ditandatangani_kasek VARCHAR(100),
    ditandatangani_bendahara VARCHAR(100),
    tanggal_generate TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Detail Dokumen Permintaan Pembayaran Per Pegawai
CREATE TABLE IF NOT EXISTS tb_permintaan_pembayaran_detail (
    id_permintaan_detail SERIAL PRIMARY KEY,
    id_permintaan INTEGER NOT NULL REFERENCES tb_permintaan_pembayaran(id_permintaan) ON DELETE CASCADE,
    id_pegawai INTEGER NOT NULL REFERENCES tb_pegawai(id_pegawai) ON DELETE RESTRICT,
    nama_pegawai VARCHAR(150) NOT NULL,
    jabatan VARCHAR(100),
    gaji_pokok NUMERIC(12, 2) DEFAULT 0,
    tunjangan NUMERIC(12, 2) DEFAULT 0,
    honorarium NUMERIC(12, 2) DEFAULT 0,
    transport NUMERIC(12, 2) DEFAULT 0,
    total_penghasilan NUMERIC(12, 2) DEFAULT 0,
    potongan NUMERIC(12, 2) DEFAULT 0,
    jumlah_diterima NUMERIC(12, 2) DEFAULT 0
);

-- 12. Tabel tb_notifikasi (In-App Notification & Scheduled Reminder)
CREATE TABLE IF NOT EXISTS tb_notifikasi (
    id_notifikasi SERIAL PRIMARY KEY,
    id_pengguna INTEGER NOT NULL REFERENCES tb_pengguna(id_pengguna) ON DELETE CASCADE,
    judul VARCHAR(150) NOT NULL,
    pesan TEXT NOT NULL,
    tipe VARCHAR(50) DEFAULT 'INFO',
    tautan VARCHAR(255),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Indeks Kinerja
CREATE INDEX IF NOT EXISTS idx_absensi_pegawai_periode ON tb_absensi(id_periode, id_pegawai);
CREATE INDEX IF NOT EXISTS idx_absensi_tanggal ON tb_absensi(tanggal);
CREATE INDEX IF NOT EXISTS idx_jam_mengajar_periode ON tb_jam_mengajar(id_periode);
CREATE INDEX IF NOT EXISTS idx_tunjangan_periode_lookup ON tb_tunjangan_periode(id_periode, id_pegawai);
CREATE INDEX IF NOT EXISTS idx_notifikasi_user_unread ON tb_notifikasi(id_pengguna, is_read);
CREATE INDEX IF NOT EXISTS idx_permintaan_periode ON tb_permintaan_pembayaran(id_periode);
