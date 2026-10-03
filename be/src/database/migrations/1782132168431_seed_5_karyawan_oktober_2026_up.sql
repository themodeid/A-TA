-- ====================================================================
-- MIGRATION: 1782132168431_seed_5_karyawan_oktober_2026_up.sql
-- RESET TOTAL MASTER DATA & SEED 5 KARYAWAN REPRESENTATIF (OKTOBER 2026)
-- ====================================================================

-- 1. Bersihkan transaksi lama dan data uji sebelumnya
DELETE FROM tb_rekap_gaji_detail;
DELETE FROM tb_rekap_gaji;
DELETE FROM tb_tunjangan_bulanan_detail;
DELETE FROM tb_tunjangan_bulanan;
DELETE FROM tb_potongan_bulanan_detail;
DELETE FROM tb_potongan_bulanan;
DELETE FROM tb_koreksi_jam;
DELETE FROM tb_jam_mengajar;
DELETE FROM tb_absensi;
DELETE FROM tb_absensi_summary;
DELETE FROM tb_approval;
DELETE FROM tb_notifikasi;
DELETE FROM tb_gaji_pokok;
DELETE FROM tb_periode;
DELETE FROM tb_pegawai;

-- 2. Reset Master Jabatan Menjadi 5 Jabatan Esensial
DELETE FROM tb_jabatan;
INSERT INTO tb_jabatan (id_jabatan, nama_jabatan, tunjangan_jabatan_struktural) VALUES
  (1, 'Software Engineer & AI Specialist', 2500000.00),
  (2, 'Kepala Sekolah', 2000000.00),
  (3, 'Kepala Tata Usaha (TU)', 800000.00),
  (4, 'Wali Kelas', 500000.00),
  (5, 'Petugas Keamanan (Security)', 100000.00)
ON CONFLICT (id_jabatan) DO UPDATE SET 
  nama_jabatan = EXCLUDED.nama_jabatan,
  tunjangan_jabatan_struktural = EXCLUDED.tunjangan_jabatan_struktural;

SELECT setval('tb_jabatan_id_jabatan_seq', (SELECT MAX(id_jabatan) FROM tb_jabatan));

-- 3. Reset Master Golongan Menjadi 5 Golongan Esensial
DELETE FROM tb_golongan;
INSERT INTO tb_golongan (id_golongan, nama_golongan, gaji_pokok_standar) VALUES
  (1, 'Golongan Specialist / Lead', 5000000.00),
  (2, 'Golongan IV/a (Pembina)', 4500000.00),
  (3, 'Golongan III/b (Penata Muda Tk. I)', 3200000.00),
  (4, 'Golongan III/a (Penata Muda)', 2900000.00),
  (5, 'Golongan II/a (Pengatur Muda)', 2200000.00)
ON CONFLICT (id_golongan) DO UPDATE SET
  nama_golongan = EXCLUDED.nama_golongan,
  gaji_pokok_standar = EXCLUDED.gaji_pokok_standar;

SELECT setval('tb_golongan_id_golongan_seq', (SELECT MAX(id_golongan) FROM tb_golongan));

-- 4. Seed 5 Karyawan Representatif SMK PSKD 3
INSERT INTO tb_pegawai (
  id_pegawai, nama, nama_dan_tanggal_lahir, tanggal_lahir, nip,
  id_jabatan, id_golongan, status_kepegawaian, status_perkawinan, jumlah_anak,
  gaji_pokok_dasar, kontak
) VALUES
  (1, 'Adam Wahyu Kurniawan', 'Adam Wahyu Kurniawan - 2005-01-01', '2005-01-01', '202343500510', 1, 1, 'GTY', 'TK', 0, 5000000.00, '081234567890'),
  (2, 'Drs. Thomas S.Pd., M.M.', 'Drs. Thomas S.Pd., M.M. - 1975-05-12', '1975-05-12', '197505122001', 2, 2, 'GTY', 'K', 2, 4500000.00, '081234567891'),
  (3, 'Yohanes Rendy A.Md.', 'Yohanes Rendy A.Md. - 1982-08-20', '1982-08-20', '198208202005', 3, 3, 'PTY', 'K', 1, 3200000.00, '081234567892'),
  (4, 'Siti Aminah S.Pd.', 'Siti Aminah S.Pd. - 1990-08-20', '1990-08-20', '199008202015', 4, 4, 'GTY', 'K', 0, 2900000.00, '081234567893'),
  (5, 'Joko Susilo', 'Joko Susilo - 1985-04-12', '1985-04-12', '198504122010', 5, 5, 'PTT', 'TK', 0, 2200000.00, '081234567894');

SELECT setval('tb_pegawai_id_pegawai_seq', (SELECT MAX(id_pegawai) FROM tb_pegawai));

-- 5. Seed Snapshot Tabel Gaji Pokok untuk 5 Pegawai
INSERT INTO tb_gaji_pokok (
  id_pegawai, golongan_ruang, status_kawin, jumlah_anak, gaji_pokok_pp,
  tunjangan_suami_istri, tunjangan_anak, tunjangan_kesra_dasar, tunjangan_jabatan_struktural,
  tunjangan_jabatan_fungsional, tunjangan_jabatan_25_pp85, sumbangan_dana_chuk_2, sumbangan_dana_chuk_8,
  tunjangan_perbaikan_penghasilan, pembulatan, jumlah_bruto, potongan_angsuran_pinjaman,
  potongan_simpanan_wajib, potongan_dana_chuk, potongan_premi_kesehatan, total_potongan_tetap, gaji_bersih_tetap
)
SELECT 
  p.id_pegawai,
  g.nama_golongan,
  p.status_perkawinan,
  p.jumlah_anak,
  p.gaji_pokok_dasar,
  CASE WHEN p.status_perkawinan = 'K' THEN (p.gaji_pokok_dasar * 0.10) ELSE 0 END,
  (p.gaji_pokok_dasar * 0.02 * LEAST(p.jumlah_anak, 3)),
  150000.00,
  j.tunjangan_jabatan_struktural,
  0.00,
  (p.gaji_pokok_dasar * 0.25),
  (p.gaji_pokok_dasar * 0.02),
  (p.gaji_pokok_dasar * 0.08),
  200000.00,
  500.00,
  (p.gaji_pokok_dasar + (CASE WHEN p.status_perkawinan = 'K' THEN (p.gaji_pokok_dasar * 0.10) ELSE 0 END) + (p.gaji_pokok_dasar * 0.02 * LEAST(p.jumlah_anak, 3)) + 150000.00 + j.tunjangan_jabatan_struktural + (p.gaji_pokok_dasar * 0.25) + 200000.00),
  0.00, 50000.00, 20000.00, 100000.00, 170000.00,
  ((p.gaji_pokok_dasar + (CASE WHEN p.status_perkawinan = 'K' THEN (p.gaji_pokok_dasar * 0.10) ELSE 0 END) + (p.gaji_pokok_dasar * 0.02 * LEAST(p.jumlah_anak, 3)) + 150000.00 + j.tunjangan_jabatan_struktural + (p.gaji_pokok_dasar * 0.25) + 200000.00) - 170000.00)
FROM tb_pegawai p
JOIN tb_jabatan j ON p.id_jabatan = j.id_jabatan
JOIN tb_golongan g ON p.id_golongan = g.id_golongan;

-- 6. Periode Aktif Tunggal: OKTOBER 2026 (Status: Pengisian Absensi)
INSERT INTO tb_periode (id_periode, bulan_gaji, tanggal_awal, tanggal_akhir, status, bulan, tahun)
VALUES (1, 'Oktober 2026', '2026-09-16', '2026-10-15', 'Pengisian Absensi', 10, 2026);

SELECT setval('tb_periode_id_periode_seq', (SELECT MAX(id_periode) FROM tb_periode));

-- 7. Transaksi Absensi Summary Periode Oktober 2026
INSERT INTO tb_absensi_summary (id_periode, id_pegawai, total_hadir_ops_wfo, total_hadir_ops_wfh, total_izin, total_sakit, total_alpha) VALUES
  (1, 1, 21, 0, 0, 0, 0), -- Adam (21 hari WFO)
  (1, 2, 22, 0, 0, 0, 0), -- Thomas (22 hari WFO penuh)
  (1, 3, 22, 0, 0, 0, 0), -- Rendy (22 hari WFO penuh)
  (1, 4, 20, 0, 1, 1, 0), -- Siti Aminah (20 hari WFO, 1 izin, 1 sakit)
  (1, 5, 22, 0, 0, 0, 0); -- Joko Susilo (22 hari WFO penuh)

-- 8. Transaksi Presensi Harian tb_absensi (22 Hari Kerja: 16 Sept - 15 Okt 2026)
DO $$
DECLARE
  v_pegawai_id INT;
  v_curr_date DATE;
  v_day_of_week INT;
  v_status VARCHAR(10);
  v_jam_masuk TIME;
  v_jam_keluar TIME;
BEGIN
  FOR v_pegawai_id IN 1..5 LOOP
    v_curr_date := '2026-09-16'::DATE;
    WHILE v_curr_date <= '2026-10-15'::DATE LOOP
      v_day_of_week := EXTRACT(ISODOW FROM v_curr_date);
      IF v_day_of_week BETWEEN 1 AND 5 THEN
        -- Default: Hadir WFO
        v_status := 'Hadir';
        v_jam_masuk := '06:45:00'::TIME + (TRUNC(RANDOM() * 20) || ' minutes')::INTERVAL;
        v_jam_keluar := '15:30:00'::TIME + (TRUNC(RANDOM() * 45) || ' minutes')::INTERVAL;

        -- Variasi khusus Siti Aminah (izin pada 25 Sept, sakit pada 5 Okt)
        IF v_pegawai_id = 4 AND v_curr_date = '2026-09-25'::DATE THEN
          v_status := 'Izin';
          v_jam_masuk := NULL;
          v_jam_keluar := NULL;
        ELSIF v_pegawai_id = 4 AND v_curr_date = '2026-10-05'::DATE THEN
          v_status := 'Sakit';
          v_jam_masuk := NULL;
          v_jam_keluar := NULL;
        -- Variasi Adam (cuti/izin 1 hari pada 30 Sept)
        ELSIF v_pegawai_id = 1 AND v_curr_date = '2026-09-30'::DATE THEN
          v_status := 'Izin';
          v_jam_masuk := NULL;
          v_jam_keluar := NULL;
        END IF;

        INSERT INTO tb_absensi (id_pegawai, id_periode, tanggal, jam_masuk, jam_keluar, status, keterangan)
        VALUES (v_pegawai_id, 1, v_curr_date, v_jam_masuk, v_jam_keluar, v_status, 'Mesin Fingerprint');
      END IF;
      v_curr_date := v_curr_date + INTERVAL '1 day';
    END LOOP;
  END LOOP;
END $$;

-- 9. Transaksi Jam Mengajar Guru (Siti Aminah)
INSERT INTO tb_jam_mengajar (id_pegawai, id_periode, keterangan_tugas, total_jam, jam_wajib, jam_lebih, jam_tidak_hadir, hari_hadir_honor) VALUES
  (4, 1, 'Guru Normatif / Wali Kelas', 28.00, 24.00, 4.00, 0.00, 20);

-- 10. Transaksi Koreksi Jam Lembur (tb_koreksi_jam)
INSERT INTO tb_koreksi_jam (id_periode, id_pegawai, id_staf_gaji, jam_awal, jam_koreksi, jam_akhir, jenis_koreksi, keterangan) VALUES
  (1, 1, 4, 0.00, 12.00, 12.00, 'ADD', 'Maintenance server dan otomatisasi sistem A-TA'),
  (1, 3, 4, 0.00, 8.00, 8.00, 'ADD', 'Closing data administrasi kesiswaan TU'),
  (1, 5, 4, 0.00, 16.00, 16.00, 'ADD', 'Shift malam pengamanan event dan gedung sekolah');

-- 11. Potongan Bulanan (tb_potongan_bulanan & detail)
INSERT INTO tb_potongan_bulanan (id_periode, id_pegawai, total_potongan_terhitung) VALUES
  (1, 1, 0.00),
  (1, 2, 0.00),
  (1, 3, 0.00),
  (1, 4, 200000.00), -- Siti Aminah pinjam kasbon Rp 200.000
  (1, 5, 0.00);

INSERT INTO tb_potongan_bulanan_detail (id_periode, id_pegawai, id_master_potongan, nilai_potongan)
SELECT 1, 4, id_master_potongan, 200000.00
FROM tb_master_potongan
WHERE kode_potongan = 'POT_TAKEN_LIST';

-- 12. Tunjangan Bulanan (tb_tunjangan_bulanan & detail)
-- Hitung Honor Lembur / Jam Lebih
-- Adam: 300rb, Rendy: 200rb, Siti: 100rb (4 jam x 25rb), Joko: 400rb
INSERT INTO tb_tunjangan_bulanan (id_periode, id_pegawai, total_jam_lebih, honor_bulan, total_tunjangan_terhitung) VALUES
  (1, 1, 12.00, 300000.00, 930000.00),    -- Transp: 630rb + Honor: 300rb
  (1, 2, 0.00,  0.00,      1290000.00),   -- Transp: 660rb + Istri: 450rb + Anak: 180rb
  (1, 3, 8.00,  200000.00, 1244000.00),   -- Transp: 660rb + Istri: 320rb + Anak: 64rb + Honor: 200rb
  (1, 4, 4.00,  100000.00, 990000.00),    -- Transp: 600rb + Istri: 290rb + Honor: 100rb
  (1, 5, 16.00, 400000.00, 1060000.00);   -- Transp: 660rb + Honor: 400rb

-- Detail Vertikal Tunjangan
-- Transport WFO
INSERT INTO tb_tunjangan_bulanan_detail (id_periode, id_pegawai, id_tunjangan, nilai_terhitung)
SELECT 1, p.id_pegawai, t.id_tunjangan, 
  CASE 
    WHEN p.id_pegawai = 1 THEN 630000.00
    WHEN p.id_pegawai = 4 THEN 600000.00
    ELSE 660000.00
  END
FROM tb_pegawai p
CROSS JOIN tb_tunjangan t
WHERE t.kode_kondisi = 'TRN_WFO';

-- Tunjangan Istri (Thomas: 450rb, Rendy: 320rb, Siti Aminah: 290rb)
INSERT INTO tb_tunjangan_bulanan_detail (id_periode, id_pegawai, id_tunjangan, nilai_terhitung)
SELECT 1, p.id_pegawai, t.id_tunjangan, 
  CASE 
    WHEN p.id_pegawai = 2 THEN 450000.00
    WHEN p.id_pegawai = 3 THEN 320000.00
    WHEN p.id_pegawai = 4 THEN 290000.00
    ELSE 0.00
  END
FROM tb_pegawai p
CROSS JOIN tb_tunjangan t
WHERE t.kode_kondisi = 'TUNJ_ISTRI' AND p.id_pegawai IN (2, 3, 4);

-- Tunjangan Anak (Thomas: 180rb, Rendy: 64rb)
INSERT INTO tb_tunjangan_bulanan_detail (id_periode, id_pegawai, id_tunjangan, nilai_terhitung)
SELECT 1, p.id_pegawai, t.id_tunjangan, 
  CASE 
    WHEN p.id_pegawai = 2 THEN 180000.00
    WHEN p.id_pegawai = 3 THEN 64000.00
    ELSE 0.00
  END
FROM tb_pegawai p
CROSS JOIN tb_tunjangan t
WHERE t.kode_kondisi = 'TUNJ_ANAK' AND p.id_pegawai IN (2, 3);
