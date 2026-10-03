-- ====================================================================
-- MIGRATION: 1782132168431_seed_40_karyawan_institusi_up.sql
-- SEED DATA 40 KARYAWAN INSTITUSI SMK PSKD 3 JAKARTA (LENGKAP 6 DIVISI)
-- Divisi: Pimpinan, TU, Sapras/Teknisi, Security, Kebersihan, Dewan Guru
-- ====================================================================

-- 1. Pastikan Master Jabatan Lengkap
INSERT INTO tb_jabatan (nama_jabatan, tunjangan_jabatan_struktural) VALUES
('Wakil Kepala Sekolah Bidang Kurikulum', 1200000.00),
('Wakil Kepala Sekolah Bidang Kesiswaan', 1200000.00),
('Wakil Kepala Sekolah Bidang Sarana & Prasarana', 1200000.00),
('Staf Tata Usaha & Administrasi', 0.00),
('Staf Keuangan & Pembukuan', 200000.00),
('Petugas Operator Dapodik & Absensi', 150000.00),
('Koordinator Sarana & Prasarana', 400000.00),
('Teknisi Lab Komputer & Jaringan', 300000.00),
('Teknisi Sarpras & Kelistrikan', 250000.00),
('Petugas Keamanan (Security)', 100000.00),
('Petugas Kebersihan (Caraka)', 50000.00),
('Guru Produktif Rekayasa Perangkat Lunak', 400000.00),
('Guru Produktif Jaringan Komputer', 400000.00),
('Guru Produktif Desain Komunikasi Visual', 400000.00),
('Guru Normatif / Adaptif', 0.00),
('Guru Bimbingan Konseling (BK)', 300000.00)
ON CONFLICT (nama_jabatan) DO NOTHING;

-- 2. Pastikan Master Golongan Lengkap
INSERT INTO tb_golongan (nama_golongan, gaji_pokok_standar) VALUES
('Golongan II/b (Pengatur Muda Tk. I)', 2100000.00),
('Golongan II/c (Pengatur)', 2300000.00)
ON CONFLICT (nama_golongan) DO NOTHING;

-- 3. Seed 40 Pegawai (Menggunakan Data Sintetis Profesional Anti-Bocor Privasi)
-- Format: nama_lengkap, tgl_lahir, nip, status_kepegawaian, kontak, jabatan_nama, golongan_nama, status_kawin, anak, gaji_dasar
INSERT INTO tb_pegawai (
    nama,
    tanggal_lahir,
    nip,
    status_kepegawaian,
    kontak,
    nama_dan_tanggal_lahir,
    id_jabatan,
    id_golongan,
    status_perkawinan,
    jumlah_anak,
    gaji_pokok_dasar
)
SELECT 
    d.nama,
    d.tanggal_lahir::DATE,
    d.nip,
    d.status_kepegawaian,
    d.kontak,
    d.nama || ' - ' || d.tanggal_lahir,
    j.id_jabatan,
    g.id_golongan,
    d.status_perkawinan,
    d.jumlah_anak,
    d.gaji_dasar
FROM (
    VALUES
    -- A. Pimpinan Sekolah (4 Orang)
    ('Drs. Thomas S.Pd., M.M.', '1975-05-12', '197505122001', 'GTY', '081211110001', 'Kepala Sekolah', 'Golongan IV/a (Pembina)', 'K', 2, 4500000.00),
    ('Hendra Gunawan S.Pd.', '1978-03-10', '197803102003', 'GTY', '081211110002', 'Wakil Kepala Sekolah Bidang Kurikulum', 'Golongan III/d (Penata Tk. I)', 'K', 2, 3800000.00),
    ('Maria Fransisca S.Pd.', '1981-08-19', '198108192006', 'GTY', '081211110003', 'Wakil Kepala Sekolah Bidang Kesiswaan', 'Golongan III/c (Penata)', 'K', 1, 3500000.00),
    ('Bambang Prakoso S.T.', '1979-11-24', '197911242004', 'GTY', '081211110004', 'Wakil Kepala Sekolah Bidang Sarana & Prasarana', 'Golongan III/c (Penata)', 'K', 3, 3500000.00),

    -- B. Tata Usaha / TU (5 Orang)
    ('Yohanes Rendy A.Md.', '1982-08-20', '198208202005', 'PTY', '081211110005', 'Kepala Tata Usaha (TU)', 'Golongan III/b (Penata Muda Tk. I)', 'K', 2, 3200000.00),
    ('Agnes Widya S.Kom.', '1993-02-14', '199302142017', 'PTY', '081211110006', 'Staf Tata Usaha & Administrasi', 'Golongan III/a (Penata Muda)', 'TK', 0, 2700000.00),
    ('Natalia Sari S.E.', '1990-11-03', '199011032015', 'PTY', '081211110007', 'Staf Keuangan & Pembukuan', 'Golongan III/a (Penata Muda)', 'K', 1, 2800000.00),
    ('Andreas Pratama', '1996-09-12', '199609122019', 'PTT', '081211110008', 'Staf Tata Usaha & Administrasi', 'Golongan II/c (Pengatur)', 'TK', 0, 2300000.00),
    ('Stefanus Ricky', '1997-12-28', '199712282020', 'PTT', '081211110009', 'Petugas Operator Dapodik & Absensi', 'Golongan II/b (Pengatur Muda Tk. I)', 'TK', 0, 2200000.00),

    -- C. Sarana, Prasarana & Teknisi Lab (4 Orang)
    ('Dedi Kurniawan S.T.', '1984-07-22', '198407222008', 'PTY', '081211110010', 'Koordinator Sarana & Prasarana', 'Golongan III/a (Penata Muda)', 'K', 2, 3000000.00),
    ('Fajar Ramadhan', '1994-01-17', '199401172018', 'PTT', '081211110011', 'Teknisi Lab Komputer & Jaringan', 'Golongan II/c (Pengatur)', 'TK', 0, 2400000.00),
    ('Eko Wahyudi', '1989-10-08', '198910082013', 'PTT', '081211110012', 'Teknisi Sarpras & Kelistrikan', 'Golongan II/b (Pengatur Muda Tk. I)', 'K', 1, 2300000.00),
    ('Dani Hermawan', '1995-04-03', '199504032019', 'PTT', '081211110013', 'Teknisi Sarpras & Kelistrikan', 'Golongan II/b (Pengatur Muda Tk. I)', 'TK', 0, 2200000.00),

    -- D. Petugas Keamanan / Security (4 Orang)
    ('Joko Susilo', '1985-04-12', '198504122010', 'PTT', '081211110014', 'Petugas Keamanan (Security)', 'GTT/PTT (Guru/Pegawai Tidak Tetap)', 'K', 2, 2200000.00),
    ('Agus Setiawan', '1988-09-25', '198809252012', 'PTT', '081211110015', 'Petugas Keamanan (Security)', 'GTT/PTT (Guru/Pegawai Tidak Tetap)', 'K', 1, 2100000.00),
    ('Rahmat Hidayat', '1991-03-18', '199103182016', 'PTT', '081211110016', 'Petugas Keamanan (Security)', 'GTT/PTT (Guru/Pegawai Tidak Tetap)', 'TK', 0, 2000000.00),
    ('Slamet Riyadi', '1986-11-05', '198611052011', 'PTT', '081211110017', 'Petugas Keamanan (Security)', 'GTT/PTT (Guru/Pegawai Tidak Tetap)', 'K', 2, 2100000.00),

    -- E. Petugas Kebersihan / Caraka (4 Orang)
    ('Mulyadi', '1980-06-15', '198006152007', 'PTT', '081211110018', 'Petugas Kebersihan (Caraka)', 'GTT/PTT (Guru/Pegawai Tidak Tetap)', 'K', 3, 2200000.00),
    ('Supardi', '1983-08-20', '198308202009', 'PTT', '081211110019', 'Petugas Kebersihan (Caraka)', 'GTT/PTT (Guru/Pegawai Tidak Tetap)', 'K', 2, 2100000.00),
    ('Wawan Sutrisno', '1987-12-10', '198712102013', 'PTT', '081211110020', 'Petugas Kebersihan (Caraka)', 'GTT/PTT (Guru/Pegawai Tidak Tetap)', 'K', 1, 2050000.00),
    ('Deni Saputra', '1992-05-30', '199205302017', 'PTT', '081211110021', 'Petugas Kebersihan (Caraka)', 'GTT/PTT (Guru/Pegawai Tidak Tetap)', 'TK', 0, 2000000.00),

    -- F. Tenaga Pendidik / Dewan Guru (19 Orang)
    ('Adam Wahyu Kurniawan S.Kom.', '2005-01-01', '202343500510', 'GTY', '081211110022', 'Software Engineer & AI Specialist', 'Golongan Specialist / Lead', 'TK', 0, 5000000.00),
    ('Siti Nurhaliza S.Kom.', '1991-07-14', '199107142016', 'GTY', '081211110023', 'Guru Produktif Rekayasa Perangkat Lunak', 'Golongan III/b (Penata Muda Tk. I)', 'K', 1, 3100000.00),
    ('Reza Aditya S.Kom.', '1993-06-20', '199306202018', 'GTY', '081211110024', 'Guru Produktif Jaringan Komputer', 'Golongan III/a (Penata Muda)', 'TK', 0, 2800000.00),
    ('Dimas Arya S.Ds.', '1992-09-08', '199209082017', 'GTY', '081211110025', 'Guru Produktif Desain Komunikasi Visual', 'Golongan III/a (Penata Muda)', 'K', 1, 2900000.00),
    ('Maya Anggraini S.Pd.', '1987-04-16', '198704162012', 'GTY', '081211110026', 'Wali Kelas', 'Golongan III/c (Penata)', 'K', 2, 3300000.00),
    ('Ratna Dewi S.Pd.', '1989-12-05', '198912052014', 'GTY', '081211110027', 'Wali Kelas', 'Golongan III/b (Penata Muda Tk. I)', 'K', 1, 3000000.00),
    ('David Sinaga S.Pd.', '1985-02-28', '198502282010', 'GTY', '081211110028', 'Wali Kelas', 'Golongan III/c (Penata)', 'K', 2, 3300000.00),
    ('Antonius Wijaya S.Pd.', '1986-10-12', '198610122011', 'GTY', '081211110029', 'Guru Normatif / Adaptif', 'Golongan III/b (Penata Muda Tk. I)', 'K', 2, 3100000.00),
    ('Surya Darmawan S.Pd.', '1990-05-22', '199005222015', 'GTY', '081211110030', 'Guru Normatif / Adaptif', 'Golongan III/a (Penata Muda)', 'TK', 0, 2750000.00),
    ('Lestari Indah S.Pd.', '1988-08-30', '198808302013', 'GTY', '081211110031', 'Guru Bimbingan Konseling (BK)', 'Golongan III/b (Penata Muda Tk. I)', 'K', 1, 3100000.00),
    ('Budi Hermanto S.Si.', '1984-01-19', '198401192009', 'GTY', '081211110032', 'Guru Normatif / Adaptif', 'Golongan III/a (Penata Muda)', 'K', 2, 2900000.00),
    ('Yulia Citra S.Pd.', '1991-11-11', '199111112016', 'GTY', '081211110033', 'Guru Normatif / Adaptif', 'Golongan III/a (Penata Muda)', 'TK', 0, 2700000.00),
    ('Farhan Maulana S.T.', '1992-03-25', '199203252017', 'GTY', '081211110034', 'Guru Produktif Jaringan Komputer', 'Golongan III/a (Penata Muda)', 'TK', 0, 2800000.00),
    ('Cindy Claudia S.E.', '1990-09-17', '199009172015', 'GTY', '081211110035', 'Guru Normatif / Adaptif', 'Golongan III/b (Penata Muda Tk. I)', 'K', 1, 3000000.00),
    ('Denny Siregar S.Pd.', '1988-07-07', '198807072013', 'GTY', '081211110036', 'Guru Normatif / Adaptif', 'Golongan III/a (Penata Muda)', 'K', 2, 2850000.00),
    ('Arif Rahman S.Kom.', '1994-08-15', '199408152019', 'GTT', '081211110037', 'Guru Produktif Rekayasa Perangkat Lunak', 'GTT/PTT (Guru/Pegawai Tidak Tetap)', 'TK', 0, 2400000.00),
    ('Nurul Hidayah S.Pd.', '1993-10-02', '199310022018', 'GTT', '081211110038', 'Guru Normatif / Adaptif', 'GTT/PTT (Guru/Pegawai Tidak Tetap)', 'TK', 0, 2300000.00),
    ('Tommy Simanjuntak S.Pd.', '1986-06-18', '198606182011', 'GTY', '081211110039', 'Guru Bimbingan Konseling (BK)', 'Golongan III/b (Penata Muda Tk. I)', 'K', 3, 3200000.00),
    ('Fransiska Dewi S.Pd.', '1992-12-21', '199212212017', 'GTT', '081211110040', 'Guru Normatif / Adaptif', 'GTT/PTT (Guru/Pegawai Tidak Tetap)', 'TK', 0, 2350000.00)
) AS d(nama, tanggal_lahir, nip, status_kepegawaian, kontak, jabatan_nama, golongan_nama, status_perkawinan, jumlah_anak, gaji_dasar)
JOIN tb_jabatan j ON j.nama_jabatan = d.jabatan_nama
JOIN tb_golongan g ON g.nama_golongan = d.golongan_nama
WHERE NOT EXISTS (
    SELECT 1 FROM tb_pegawai p WHERE p.nip = d.nip OR p.nama = d.nama
);

-- 4. Seed tb_gaji_pokok untuk Semua Pegawai Baru yang Belum Ada
INSERT INTO tb_gaji_pokok (
    id_pegawai,
    golongan_ruang,
    status_kawin,
    jumlah_anak,
    gaji_pokok_pp,
    tunjangan_suami_istri,
    tunjangan_anak,
    tunjangan_kesra_dasar,
    tunjangan_jabatan_struktural,
    tunjangan_jabatan_fungsional,
    tunjangan_jabatan_25_pp85,
    sumbangan_dana_chuk_2,
    sumbangan_dana_chuk_8,
    tunjangan_perbaikan_penghasilan,
    pembulatan,
    jumlah_bruto,
    potongan_angsuran_pinjaman,
    potongan_simpanan_wajib,
    potongan_dana_chuk,
    potongan_premi_kesehatan,
    total_potongan_tetap,
    gaji_bersih_tetap
)
SELECT 
    p.id_pegawai,
    COALESCE(g.nama_golongan, 'GTT/PTT'),
    COALESCE(p.status_perkawinan, 'TK'),
    COALESCE(p.jumlah_anak, 0),
    p.gaji_pokok_dasar AS gaji_pokok_pp,
    -- Tunjangan Suami/Istri (10% jika K)
    CASE WHEN p.status_perkawinan = 'K' THEN (p.gaji_pokok_dasar * 0.10) ELSE 0 END AS tunjangan_suami_istri,
    -- Tunjangan Anak (2% per anak, max 3)
    (p.gaji_pokok_dasar * 0.02 * LEAST(COALESCE(p.jumlah_anak, 0), 3)) AS tunjangan_anak,
    150000.00 AS tunjangan_kesra_dasar,
    COALESCE(j.tunjangan_jabatan_struktural, 0) AS tunjangan_jabatan_struktural,
    0.00 AS tunjangan_jabatan_fungsional,
    (p.gaji_pokok_dasar * 0.25) AS tunjangan_jabatan_25_pp85,
    (p.gaji_pokok_dasar * 0.02) AS sumbangan_dana_chuk_2,
    (p.gaji_pokok_dasar * 0.08) AS sumbangan_dana_chuk_8,
    200000.00 AS tunjangan_perbaikan_penghasilan,
    500.00 AS pembulatan,
    -- Bruto
    (p.gaji_pokok_dasar 
        + CASE WHEN p.status_perkawinan = 'K' THEN (p.gaji_pokok_dasar * 0.10) ELSE 0 END
        + (p.gaji_pokok_dasar * 0.02 * LEAST(COALESCE(p.jumlah_anak, 0), 3))
        + 150000.00
        + COALESCE(j.tunjangan_jabatan_struktural, 0)
        + (p.gaji_pokok_dasar * 0.25)
        + 200000.00
    ) AS jumlah_bruto,
    0.00 AS potongan_angsuran_pinjaman,
    50000.00 AS potongan_simpanan_wajib,
    (p.gaji_pokok_dasar * 0.02) AS potongan_dana_chuk,
    100000.00 AS potongan_premi_kesehatan,
    (150000.00 + (p.gaji_pokok_dasar * 0.02)) AS total_potongan_tetap,
    -- Gaji Bersih Tetap
    ((p.gaji_pokok_dasar 
        + CASE WHEN p.status_perkawinan = 'K' THEN (p.gaji_pokok_dasar * 0.10) ELSE 0 END
        + (p.gaji_pokok_dasar * 0.02 * LEAST(COALESCE(p.jumlah_anak, 0), 3))
        + 150000.00
        + COALESCE(j.tunjangan_jabatan_struktural, 0)
        + (p.gaji_pokok_dasar * 0.25)
        + 200000.00
    ) - (150000.00 + (p.gaji_pokok_dasar * 0.02))) AS gaji_bersih_tetap
FROM tb_pegawai p
LEFT JOIN tb_jabatan j ON p.id_jabatan = j.id_jabatan
LEFT JOIN tb_golongan g ON p.id_golongan = g.id_golongan
ON CONFLICT (id_pegawai) DO NOTHING;

-- 5. Seed Absensi Summary untuk Semua 40 Pegawai pada Periode Juli 2026
INSERT INTO tb_absensi_summary (id_periode, id_pegawai, total_hadir_ops_wfo, total_hadir_ops_wfh, total_izin, total_sakit, total_alpha)
SELECT 
    per.id_periode,
    p.id_pegawai,
    22 AS total_hadir_ops_wfo,
    0 AS total_hadir_ops_wfh,
    CASE WHEN p.id_pegawai % 5 = 0 THEN 1 ELSE 0 END AS total_izin,
    CASE WHEN p.id_pegawai % 7 = 0 THEN 1 ELSE 0 END AS total_sakit,
    0 AS total_alpha
FROM tb_pegawai p
CROSS JOIN tb_periode per
WHERE per.bulan_gaji = 'Juli 2026'
ON CONFLICT (id_periode, id_pegawai) DO NOTHING;

-- 6. Seed Jam Mengajar untuk Seluruh Dewan Guru (GTY & GTT)
INSERT INTO tb_jam_mengajar (id_periode, id_pegawai, keterangan_tugas, total_jam, jam_wajib, jam_lebih, jam_tidak_hadir, hari_hadir_honor)
SELECT 
    per.id_periode,
    p.id_pegawai,
    'Guru ' || j.nama_jabatan,
    28.00 AS total_jam,
    24.00 AS jam_wajib,
    4.00 AS jam_lebih,
    0.00 AS jam_tidak_hadir,
    22 AS hari_hadir_honor
FROM tb_pegawai p
JOIN tb_jabatan j ON p.id_jabatan = j.id_jabatan
CROSS JOIN tb_periode per
WHERE per.bulan_gaji = 'Juli 2026'
  AND (j.nama_jabatan LIKE 'Guru%' OR j.nama_jabatan = 'Wali Kelas' OR j.nama_jabatan LIKE 'Software%')
ON CONFLICT (id_periode, id_pegawai) DO NOTHING;
