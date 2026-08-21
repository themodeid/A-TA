-- ============================================================
-- 1. SEED MASTER DATA
-- ============================================================

-- Seed Master Formula Tunjangan
INSERT INTO tb_formula_tunjangan (kode_formula, nama_formula, keterangan) VALUES
('HARIAN_HADIR_WFO', 'Harian Hadir WFO', 'Perhitungan dikali total kehadiran WFO'),
('PERSEN_GAJI_JIKA_KAWIN', 'Persentase Gaji (Kawin)', 'Persentase dari gaji pokok jika status Kawin'),
('PERSEN_GAJI_PER_ANAK', 'Persentase Gaji per Anak', 'Persentase dari gaji pokok dikali jumlah anak'),
('PER_JAM_LEMBUR', 'Nominal per Jam Lembur', 'Nominal flat dikali total jam lembur')
ON CONFLICT (kode_formula) DO NOTHING;

-- Seed Master Formula Potongan
INSERT INTO tb_formula_potongan (kode_formula, nama_formula, keterangan) VALUES
('NOMINAL_FLAT', 'Nominal Flat', 'Potongan bernilai tetap/flat per bulan')
ON CONFLICT (kode_formula) DO NOTHING;

-- Seed Master Tunjangan
INSERT INTO tb_tunjangan (nama_tunjangan, nilai, jenis_tunjangan, sifat_tunjangan, keterangan, kode_kondisi, formula_type) VALUES 
('Uang Transport WFO', 30000.00, 'NOMINAL', 'HARIAN', 'Uang transport fisik', 'TRN_WFO', 'HARIAN_HADIR_WFO'),
('Tunjangan Istri', 0.10, 'PERSENTASE', 'BULANAN', 'Tunjangan istri 10% dari gaji pokok', 'TUNJ_ISTRI', 'PERSEN_GAJI_JIKA_KAWIN'),
('Tunjangan Anak', 0.02, 'PERSENTASE', 'BULANAN', 'Tunjangan per anak 2% dari gaji pokok', 'TUNJ_ANAK', 'PERSEN_GAJI_PER_ANAK'),
('Honor Lembur Per Jam', 25000.00, 'NOMINAL', 'PER_JAM', 'Rate lembur per jam, flat untuk semua pegawai', 'LEMBUR_PER_JAM', 'PER_JAM_LEMBUR')
ON CONFLICT (kode_kondisi) DO UPDATE SET nilai = EXCLUDED.nilai, formula_type = EXCLUDED.formula_type;

-- Seed Master Potongan
INSERT INTO tb_master_potongan (nama_potongan, kode_potongan, nilai) VALUES
('Potongan Angsuran', 'POT_ANGSURAN', 0.00),
('Potongan Dana Wajib', 'POT_DANA_WAJIB', 50000.00),
('Potongan S_PSKD', 'POT_S_PSKD', 20000.00),
('Potongan Pelkes', 'POT_PELKES', 30000.00),
('Potongan Lainnya', 'POT_LAINNYA', 0.00)
ON CONFLICT (kode_potongan) DO UPDATE SET nilai = EXCLUDED.nilai;

-- Seed Master Jabatan
INSERT INTO tb_jabatan (nama_jabatan, tunjangan_jabatan_struktural) VALUES 
('Software Engineer & AI Specialist', 2500000.00),
('Kepala Sekolah', 2000000.00),
('Wakil Kepala Sekolah', 1200000.00),
('Kepala Tata Usaha (TU)', 800000.00),
('Wali Kelas', 500000.00),
('Guru Penanggung Jawab Lab', 400000.00),
('Guru Tetap / Staf TU', 0.00)
ON CONFLICT (nama_jabatan) DO NOTHING;

-- Seed Master Golongan
INSERT INTO tb_golongan (nama_golongan, gaji_pokok_standar) VALUES 
('Golongan Specialist / Lead', 5000000.00),
('Golongan III/a (Penata Muda)', 2700000.00),
('Golongan III/b (Penata Muda Tk. I)', 2900000.00),
('Golongan III/c (Penata)', 3100000.00),
('Golongan III/d (Penata Tk. I)', 3300000.00),
('Golongan IV/a (Pembina)', 3500000.00),
('GTT/PTT (Guru/Pegawai Tidak Tetap)', 1500000.00)
ON CONFLICT (nama_golongan) DO NOTHING;

-- Periode Juli 2026
INSERT INTO tb_periode (bulan_gaji, tanggal_awal, tanggal_akhir, status) 
VALUES ('Juli 2026', '2026-06-16', '2026-07-15', 'Selesai')
ON CONFLICT (bulan_gaji) DO UPDATE SET tanggal_awal = EXCLUDED.tanggal_awal, tanggal_akhir = EXCLUDED.tanggal_akhir, status = EXCLUDED.status;

-- Seed Master Pegawai (4 Pegawai)
INSERT INTO tb_pegawai (nama_dan_tanggal_lahir, id_jabatan, id_golongan, status_perkawinan, jumlah_anak, gaji_pokok_dasar)
SELECT 'Adam Wahyu Kurniawan - 2005-01-01', (SELECT id_jabatan FROM tb_jabatan WHERE nama_jabatan='Software Engineer & AI Specialist'), (SELECT id_golongan FROM tb_golongan WHERE nama_golongan='Golongan Specialist / Lead'), 'TK', 0, 5000000.00
WHERE NOT EXISTS (SELECT 1 FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Adam Wahyu Kurniawan%');

INSERT INTO tb_pegawai (nama_dan_tanggal_lahir, id_jabatan, id_golongan, status_perkawinan, jumlah_anak, gaji_pokok_dasar)
SELECT 'Drs. Budi Santoso - 1975-05-12', (SELECT id_jabatan FROM tb_jabatan WHERE nama_jabatan='Kepala Sekolah'), (SELECT id_golongan FROM tb_golongan WHERE nama_golongan='Golongan IV/a (Pembina)'), 'K', 2, 3500000.00
WHERE NOT EXISTS (SELECT 1 FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Drs. Budi Santoso%');

INSERT INTO tb_pegawai (nama_dan_tanggal_lahir, id_jabatan, id_golongan, status_perkawinan, jumlah_anak, gaji_pokok_dasar)
SELECT 'Siti Aminah S.Pd - 1990-08-20', (SELECT id_jabatan FROM tb_jabatan WHERE nama_jabatan='Wali Kelas'), (SELECT id_golongan FROM tb_golongan WHERE nama_golongan='Golongan III/b (Penata Muda Tk. I)'), 'TK', 0, 2900000.00
WHERE NOT EXISTS (SELECT 1 FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Siti Aminah%');

INSERT INTO tb_pegawai (nama_dan_tanggal_lahir, id_jabatan, id_golongan, status_perkawinan, jumlah_anak, gaji_pokok_dasar)
SELECT 'Rian Hidayat - 1998-11-02', (SELECT id_jabatan FROM tb_jabatan WHERE nama_jabatan='Guru Tetap / Staf TU'), (SELECT id_golongan FROM tb_golongan WHERE nama_golongan='GTT/PTT (Guru/Pegawai Tidak Tetap)'), 'TK', 0, 1500000.00
WHERE NOT EXISTS (SELECT 1 FROM tb_pegawai WHERE nama_dan_tanggal_lahir LIKE 'Rian Hidayat%');


-- ============================================================
-- 2. SEED TRANSAKSI OPERASIONAL
-- ============================================================

-- Transaksi Absensi
INSERT INTO tb_absensi_summary (id_periode, id_pegawai, total_hadir_ops_wfo, total_hadir_ops_wfh, total_izin, total_sakit, total_alpha)
SELECT 
  per.id_periode,
  p.id_pegawai,
  d.total_hadir_ops_wfo,
  d.total_hadir_ops_wfh,
  d.total_izin,
  d.total_sakit,
  d.total_alpha
FROM (
  VALUES
    ('Adam Wahyu Kurniawan%', 22, 0, 0, 0, 0),
    ('Drs. Budi Santoso%', 24, 0, 1, 0, 0),
    ('Siti Aminah%', 25, 0, 0, 0, 0),
    ('Rian Hidayat%', 22, 0, 0, 3, 0)
) AS d(nama_pattern, total_hadir_ops_wfo, total_hadir_ops_wfh, total_izin, total_sakit, total_alpha)
JOIN tb_pegawai p ON p.nama_dan_tanggal_lahir LIKE d.nama_pattern
JOIN tb_periode per ON per.bulan_gaji = 'Juli 2026'
ON CONFLICT (id_periode, id_pegawai) DO NOTHING;

-- Tunjangan Bulanan Header
INSERT INTO tb_tunjangan_bulanan (id_periode, id_pegawai, total_jam_lebih, honor_bulan, total_tunjangan_terhitung)
SELECT 
  per.id_periode,
  p.id_pegawai,
  d.total_jam_lebih,
  d.honor_bulan,
  d.total_tunjangan_terhitung
FROM (
  VALUES
    ('Adam Wahyu Kurniawan%', 16.00::numeric(5,2), 500000.00::numeric(12,2), 4060000.00::numeric(12,2)),
    ('Drs. Budi Santoso%', 0.00, 0.00, 3210000.00),
    ('Siti Aminah%', 12.50, 0.00, 1562500.00),
    ('Rian Hidayat%', 5.00, 200000.00, 985000.00)
) AS d(nama_pattern, total_jam_lebih, honor_bulan, total_tunjangan_terhitung)
JOIN tb_pegawai p ON p.nama_dan_tanggal_lahir LIKE d.nama_pattern
JOIN tb_periode per ON per.bulan_gaji = 'Juli 2026'
ON CONFLICT (id_periode, id_pegawai) DO NOTHING;

-- Detail Tunjangan Vertikal
INSERT INTO tb_tunjangan_bulanan_detail (id_periode, id_pegawai, id_tunjangan, nilai_terhitung)
SELECT 
  per.id_periode,
  p.id_pegawai,
  t.id_tunjangan,
  d.nilai_terhitung
FROM (
  VALUES
    ('Adam Wahyu Kurniawan%', 'TRN_WFO', 660000.00::numeric(12,2)),
    ('Drs. Budi Santoso%', 'TRN_WFO', 720000.00),
    ('Drs. Budi Santoso%', 'TUNJ_ISTRI', 350000.00),
    ('Drs. Budi Santoso%', 'TUNJ_ANAK', 140000.00),
    ('Siti Aminah%', 'TRN_WFO', 750000.00),
    ('Rian Hidayat%', 'TRN_WFO', 660000.00)
) AS d(nama_pattern, kode_kondisi, nilai_terhitung)
JOIN tb_pegawai p ON p.nama_dan_tanggal_lahir LIKE d.nama_pattern
JOIN tb_periode per ON per.bulan_gaji = 'Juli 2026'
JOIN tb_tunjangan t ON t.kode_kondisi = d.kode_kondisi
ON CONFLICT (id_periode, id_pegawai, id_tunjangan) DO NOTHING;

-- Potongan Bulanan Header
INSERT INTO tb_potongan_bulanan (id_periode, id_pegawai, total_potongan_terhitung)
SELECT 
  per.id_periode,
  p.id_pegawai,
  d.total_potongan_terhitung
FROM (
  VALUES
    ('Adam Wahyu Kurniawan%', 100000.00::numeric(12,2)),
    ('Drs. Budi Santoso%', 600000.00),
    ('Siti Aminah%', 110000.00),
    ('Rian Hidayat%', 450000.00)
) AS d(nama_pattern, total_potongan_terhitung)
JOIN tb_pegawai p ON p.nama_dan_tanggal_lahir LIKE d.nama_pattern
JOIN tb_periode per ON per.bulan_gaji = 'Juli 2026'
ON CONFLICT (id_periode, id_pegawai) DO NOTHING;

-- Detail Potongan Vertikal
INSERT INTO tb_potongan_bulanan_detail (id_periode, id_pegawai, id_master_potongan, nilai_potongan)
SELECT 
  per.id_periode,
  p.id_pegawai,
  mp.id_master_potongan,
  d.nilai_potongan
FROM (
  VALUES
    ('Adam Wahyu Kurniawan%', 'POT_DANA_WAJIB', 50000.00::numeric(12,2)),
    ('Adam Wahyu Kurniawan%', 'POT_PELKES', 50000.00),
    ('Drs. Budi Santoso%', 'POT_ANGSURAN', 500000.00),
    ('Drs. Budi Santoso%', 'POT_DANA_WAJIB', 50000.00),
    ('Drs. Budi Santoso%', 'POT_S_PSKD', 20000.00),
    ('Drs. Budi Santoso%', 'POT_PELKES', 30000.00),
    ('Siti Aminah%', 'POT_DANA_WAJIB', 50000.00),
    ('Siti Aminah%', 'POT_LAINNYA', 60000.00),
    ('Rian Hidayat%', 'POT_LAINNYA', 450000.00)
) AS d(nama_pattern, kode_potongan, nilai_potongan)
JOIN tb_pegawai p ON p.nama_dan_tanggal_lahir LIKE d.nama_pattern
JOIN tb_periode per ON per.bulan_gaji = 'Juli 2026'
JOIN tb_master_potongan mp ON mp.kode_potongan = d.kode_potongan
ON CONFLICT (id_periode, id_pegawai, id_master_potongan) DO NOTHING;


-- ============================================================
-- 3. SEED REKAP GAJI & SLIP GAJI (SNAPSHOT)
-- ============================================================

INSERT INTO public.tb_rekap_gaji 
  (id_periode, id_pegawai, jabatan_snapshot, pangkat_golongan_snapshot, gaji_pokok_snapshot, total_penghasilan_bruto, total_potongan, total_penerimaan_clean)
SELECT 
  per.id_periode,
  p.id_pegawai,
  d.jabatan_snapshot,
  d.pangkat_golongan_snapshot,
  d.gaji_pokok_snapshot,
  d.total_penghasilan_bruto,
  d.total_potongan,
  d.total_penerimaan_clean
FROM (
  VALUES
    ('Adam Wahyu Kurniawan%', 'Software Engineer & AI Specialist', 'Golongan Specialist / Lead', 5000000.00::numeric(12,2), 9060000.00::numeric(12,2), 100000.00::numeric(12,2), 8960000.00::numeric(12,2)),
    ('Drs. Budi Santoso%', 'Kepala Sekolah', 'Golongan IV/a (Pembina)', 3500000.00, 6710000.00, 600000.00, 6110000.00),
    ('Siti Aminah%', 'Wali Kelas', 'Golongan III/b (Penata Muda Tk. I)', 2900000.00, 4462500.00, 110000.00, 4352500.00),
    ('Rian Hidayat%', 'Guru Tetap / Staf TU', 'GTT/PTT (Guru/Pegawai Tidak Tetap)', 1500000.00, 2485000.00, 450000.00, 2035000.00)
) AS d(nama_pattern, jabatan_snapshot, pangkat_golongan_snapshot, gaji_pokok_snapshot, total_penghasilan_bruto, total_potongan, total_penerimaan_clean)
JOIN tb_pegawai p ON p.nama_dan_tanggal_lahir LIKE d.nama_pattern
JOIN tb_periode per ON per.bulan_gaji = 'Juli 2026'
ON CONFLICT (id_periode, id_pegawai) DO UPDATE 
SET 
  total_penghasilan_bruto = EXCLUDED.total_penghasilan_bruto,
  total_potongan = EXCLUDED.total_potongan,
  total_penerimaan_clean = EXCLUDED.total_penerimaan_clean;

-- Clean detail lama periode terkait sebelum insert breakdown baru
DELETE FROM public.tb_rekap_gaji_detail 
WHERE id_rekap IN (SELECT id_rekap FROM public.tb_rekap_gaji WHERE id_periode = (SELECT id_periode FROM tb_periode WHERE bulan_gaji='Juli 2026'));

-- Insert Breakdown Detail
INSERT INTO public.tb_rekap_gaji_detail 
  (id_rekap, jenis_komponen, nama_komponen_snapshot, nilai_snapshot, kode_kondisi_snapshot)
SELECT 
  rg.id_rekap,
  d.jenis_komponen,
  d.nama_komponen_snapshot,
  d.nilai_snapshot,
  d.kode_kondisi_snapshot
FROM (
  VALUES
    -- Detail Adam Wahyu Kurniawan
    ('Adam Wahyu Kurniawan%', 'TUNJANGAN'::varchar(20), 'Tunjangan Jabatan Software Engineer & AI', 2500000.00::numeric(12,2), 'TUNJ_STRUKTURAL'),
    ('Adam Wahyu Kurniawan%', 'TUNJANGAN', 'Uang Transport WFO (22 Hari)', 660000.00, 'TRN_WFO'),
    ('Adam Wahyu Kurniawan%', 'TUNJANGAN', 'Honor Lembur Project AI (16 Jam)', 400000.00, 'LEMBUR_PER_JAM'),
    ('Adam Wahyu Kurniawan%', 'TUNJANGAN', 'Bonus Optimalisasi System', 500000.00, 'HONOR_BULANAN_MANUAL'),
    ('Adam Wahyu Kurniawan%', 'POTONGAN', 'Potongan Dana Wajib', 50000.00, 'POT_DANA_WAJIB'),
    ('Adam Wahyu Kurniawan%', 'POTONGAN', 'Potongan Pelkes', 50000.00, 'POT_PELKES'),

    -- Detail Drs. Budi Santoso
    ('Drs. Budi Santoso%', 'TUNJANGAN', 'Tunjangan Struktural Kepala Sekolah', 2000000.00, 'TUNJ_STRUKTURAL'),
    ('Drs. Budi Santoso%', 'TUNJANGAN', 'Uang Transport WFO', 720000.00, 'TRN_WFO'),
    ('Drs. Budi Santoso%', 'TUNJANGAN', 'Tunjangan Istri', 350000.00, 'TUNJ_ISTRI'),
    ('Drs. Budi Santoso%', 'TUNJANGAN', 'Tunjangan Anak', 140000.00, 'TUNJ_ANAK'),
    ('Drs. Budi Santoso%', 'POTONGAN', 'Potongan Angsuran', 500000.00, 'POT_ANGSURAN'),
    ('Drs. Budi Santoso%', 'POTONGAN', 'Potongan Dana Wajib', 50000.00, 'POT_DANA_WAJIB'),
    ('Drs. Budi Santoso%', 'POTONGAN', 'Potongan S_PSKD', 20000.00, 'POT_S_PSKD'),
    ('Drs. Budi Santoso%', 'POTONGAN', 'Potongan Pelkes', 30000.00, 'POT_PELKES'),

    -- Detail Siti Aminah S.Pd
    ('Siti Aminah%', 'TUNJANGAN', 'Tunjangan Struktural Wali Kelas', 500000.00, 'TUNJ_STRUKTURAL'),
    ('Siti Aminah%', 'TUNJANGAN', 'Uang Transport WFO', 750000.00, 'TRN_WFO'),
    ('Siti Aminah%', 'TUNJANGAN', 'Honor Lembur (12.5 Jam)', 312500.00, 'LEMBUR_PER_JAM'),
    ('Siti Aminah%', 'POTONGAN', 'Potongan Dana Wajib', 50000.00, 'POT_DANA_WAJIB'),
    ('Siti Aminah%', 'POTONGAN', 'Potongan Lainnya / Penyesuaian', 60000.00, 'POT_LAINNYA'),

    -- Detail Rian Hidayat
    ('Rian Hidayat%', 'TUNJANGAN', 'Uang Transport WFO', 660000.00, 'TRN_WFO'),
    ('Rian Hidayat%', 'TUNJANGAN', 'Honor Lembur (5 Jam)', 125000.00, 'LEMBUR_PER_JAM'),
    ('Rian Hidayat%', 'TUNJANGAN', 'Honor Tambahan Bulan Ini', 200000.00, 'HONOR_BULANAN_MANUAL'),
    ('Rian Hidayat%', 'POTONGAN', 'Total Potongan Terhitung', 450000.00, 'POT_LAINNYA')
) AS d(nama_pattern, jenis_komponen, nama_komponen_snapshot, nilai_snapshot, kode_kondisi_snapshot)
JOIN tb_pegawai p ON p.nama_dan_tanggal_lahir LIKE d.nama_pattern
JOIN tb_periode per ON per.bulan_gaji = 'Juli 2026'
JOIN tb_rekap_gaji rg ON rg.id_periode = per.id_periode AND rg.id_pegawai = p.id_pegawai;
