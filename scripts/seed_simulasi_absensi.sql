-- ====================================================================
-- SIMULASI ABSENSI REALISTIS PERIODE OKTOBER 2026 (id_periode = 3)
-- Rentang: 2026-09-16 s/d 2026-10-15 (22 Hari Kerja Senin-Jumat)
-- ====================================================================

-- 1. Pastikan Semua Pegawai Masuk ke tb_absensi_summary Periode 3
INSERT INTO tb_absensi_summary (id_periode, id_pegawai, total_hadir_ops_wfo, total_hadir_ops_wfh, total_izin, total_sakit, total_alpha)
SELECT 
  3,
  p.id_pegawai,
  22, 0, 0, 0, 0
FROM tb_pegawai p
WHERE NOT EXISTS (
  SELECT 1 FROM tb_absensi_summary WHERE id_periode = 3 AND id_pegawai = p.id_pegawai
);

-- 2. Update Variasi Absensi Summary Periode 3 (Realistis)
UPDATE tb_absensi_summary s
SET 
  total_hadir_ops_wfo = CASE 
    -- Pegawai Tertentu Izin 1 hari (Hadir 21)
    WHEN p.id_pegawai IN (6, 12, 18, 24, 30) THEN 21
    -- Pegawai Tertentu Sakit 1 hari (Hadir 21)
    WHEN p.id_pegawai IN (8, 14, 20, 26, 32) THEN 21
    -- Pegawai Tertentu Izin 2 hari (Hadir 20)
    WHEN p.id_pegawai IN (16, 28) THEN 20
    -- Sisanya hadir penuh 22 hari WFO
    ELSE 22
  END,
  total_hadir_ops_wfh = 0,
  total_izin = CASE 
    WHEN p.id_pegawai IN (6, 12, 18, 24, 30) THEN 1
    WHEN p.id_pegawai IN (16, 28) THEN 2
    ELSE 0
  END,
  total_sakit = CASE 
    WHEN p.id_pegawai IN (8, 14, 20, 26, 32) THEN 1
    ELSE 0
  END,
  total_alpha = 0
FROM tb_pegawai p
WHERE s.id_pegawai = p.id_pegawai AND s.id_periode = 3;

-- 3. Hapus data harian lama periode 3 jika ada
DELETE FROM tb_absensi WHERE id_periode = 3;

-- 4. Generate Kehadiran Harian tb_absensi (Tanggal per Tanggal untuk 22 Hari Kerja)
-- Hari Kerja: Senin s.d. Jumat antara 2026-09-16 s/d 2026-10-15
WITH hari_kerja AS (
  SELECT d::DATE AS tanggal
  FROM generate_series('2026-09-16'::DATE, '2026-10-15'::DATE, '1 day'::INTERVAL) AS d
  WHERE EXTRACT(DOW FROM d) NOT IN (0, 6) -- 0 = Minggu, 6 = Sabtu
)
INSERT INTO tb_absensi (
  id_pegawai,
  id_periode,
  tanggal,
  jam_masuk,
  jam_keluar,
  status,
  keterangan,
  diinput_oleh
)
SELECT 
  p.id_pegawai,
  3 AS id_periode,
  hk.tanggal,
  -- Jam masuk acak antara 06:40:00 dan 07:10:00
  CASE 
    WHEN p.id_pegawai IN (6, 12, 18, 24, 30) AND hk.tanggal = '2026-09-23' THEN NULL
    WHEN p.id_pegawai IN (8, 14, 20, 26, 32) AND hk.tanggal = '2026-09-28' THEN NULL
    WHEN p.id_pegawai IN (16, 28) AND hk.tanggal IN ('2026-10-01', '2026-10-02') THEN NULL
    ELSE ('06:40:00'::TIME + (MOD(p.id_pegawai * 7 + EXTRACT(DAY FROM hk.tanggal)::INT, 25) || ' minutes')::INTERVAL)
  END AS jam_masuk,
  -- Jam keluar acak antara 15:15:00 dan 16:30:00
  CASE 
    WHEN p.id_pegawai IN (6, 12, 18, 24, 30) AND hk.tanggal = '2026-09-23' THEN NULL
    WHEN p.id_pegawai IN (8, 14, 20, 26, 32) AND hk.tanggal = '2026-09-28' THEN NULL
    WHEN p.id_pegawai IN (16, 28) AND hk.tanggal IN ('2026-10-01', '2026-10-02') THEN NULL
    ELSE ('15:15:00'::TIME + (MOD(p.id_pegawai * 13 + EXTRACT(DAY FROM hk.tanggal)::INT, 60) || ' minutes')::INTERVAL)
  END AS jam_keluar,
  -- Status Kehadiran
  CASE 
    WHEN p.id_pegawai IN (6, 12, 18, 24, 30) AND hk.tanggal = '2026-09-23' THEN 'Izin'
    WHEN p.id_pegawai IN (8, 14, 20, 26, 32) AND hk.tanggal = '2026-09-28' THEN 'Sakit'
    WHEN p.id_pegawai IN (16, 28) AND hk.tanggal IN ('2026-10-01', '2026-10-02') THEN 'Izin'
    ELSE 'Hadir'
  END AS status,
  -- Keterangan
  CASE 
    WHEN p.id_pegawai IN (6, 12, 18, 24, 30) AND hk.tanggal = '2026-09-23' THEN 'Izin urusan keluarga'
    WHEN p.id_pegawai IN (8, 14, 20, 26, 32) AND hk.tanggal = '2026-09-28' THEN 'Surat dokter / demam'
    WHEN p.id_pegawai IN (16, 28) AND hk.tanggal IN ('2026-10-01', '2026-10-02') THEN 'Izin dinas luar / pelatihan MGMP'
    ELSE 'Tepat waktu WFO'
  END AS keterangan,
  1 AS diinput_oleh
FROM tb_pegawai p
CROSS JOIN hari_kerja hk
WHERE p.deleted_at IS NULL
ON CONFLICT (id_pegawai, id_periode, tanggal) DO UPDATE SET
  jam_masuk = EXCLUDED.jam_masuk,
  jam_keluar = EXCLUDED.jam_keluar,
  status = EXCLUDED.status,
  keterangan = EXCLUDED.keterangan;

-- 5. Seed / Sync tb_jam_mengajar untuk Seluruh Dewan Guru pada Periode 3
INSERT INTO tb_jam_mengajar (
  id_periode,
  id_pegawai,
  keterangan_tugas,
  total_jam,
  jam_wajib,
  jam_lebih,
  jam_tidak_hadir,
  hari_hadir_honor
)
SELECT 
  3 AS id_periode,
  p.id_pegawai,
  'Guru ' || j.nama_jabatan,
  (24.00 + (MOD(p.id_pegawai * 3, 10)))::NUMERIC(6,2) AS total_jam,
  24.00 AS jam_wajib,
  (MOD(p.id_pegawai * 3, 10))::NUMERIC(6,2) AS jam_lebih,
  0.00 AS jam_tidak_hadir,
  s.total_hadir_ops_wfo AS hari_hadir_honor
FROM tb_pegawai p
JOIN tb_jabatan j ON p.id_jabatan = j.id_jabatan
JOIN tb_absensi_summary s ON s.id_pegawai = p.id_pegawai AND s.id_periode = 3
WHERE j.nama_jabatan LIKE 'Guru%' 
   OR j.nama_jabatan = 'Wali Kelas' 
   OR j.nama_jabatan LIKE 'Software%'
ON CONFLICT (id_periode, id_pegawai) DO UPDATE SET
  total_jam = EXCLUDED.total_jam,
  jam_lebih = EXCLUDED.jam_lebih,
  hari_hadir_honor = EXCLUDED.hari_hadir_honor;
