-- ====================================================================
-- SIMULASI LEMBUR & TUNJANGAN BULANAN PERIODE OKTOBER 2026 (id_periode = 3)
-- Mengisi data lembur realistis ke tb_koreksi_jam untuk memicu kalkulasi
-- ====================================================================

-- 1. Hapus lembur lama periode 3 jika ada
DELETE FROM tb_koreksi_jam WHERE id_periode = 3;

-- 2. Insert Data Lembur Realistis ke tb_koreksi_jam
INSERT INTO tb_koreksi_jam (
  id_periode,
  id_pegawai,
  id_staf_gaji,
  jam_awal,
  jam_koreksi,
  jam_akhir,
  jenis_koreksi,
  keterangan,
  bukti_dokumen
)
SELECT 
  3 AS id_periode,
  p.id_pegawai,
  4 AS id_staf_gaji,
  0.00 AS jam_awal,
  d.jam AS jam_koreksi,
  d.jam AS jam_akhir,
  'ADD' AS jenis_koreksi,
  d.keterangan,
  'SURAT_TUGAS_LEMBUR_OKT_2026.pdf' AS bukti_dokumen
FROM (
  VALUES
    -- A. Petugas Keamanan / Security
    ('Joko Susilo', 16.00, 'Lembur Piket Pengamanan Malam & Patroli Gerbang Weekend'),
    ('Agus Setiawan', 12.00, 'Lembur Pengamanan Event Kegiatan Ekstrakurikuler Sekolah'),
    ('Rahmat Hidayat', 14.00, 'Lembur Pengganti Shift Malam Patroli Gedung Lab'),
    ('Slamet Riyadi', 10.00, 'Lembur Pengamanan Pagi Acara Rapat Yayasan PSKD'),

    -- B. Petugas Kebersihan / Caraka
    ('Mulyadi', 8.00, 'Lembur Pembersihan Menyeluruh Gedung A Pasca Kegiatan OSIS'),
    ('Deni Saputra', 6.00, 'Lembur Penataan Meja Kursi & Kebersihan Ruang Pertemuan'),

    -- C. Sarana, Prasarana & Teknisi
    ('Dedi Kurniawan S.T.', 8.00, 'Lembur Maintenance Rutin Genset & Panel Listrik Utama'),
    ('Fajar Ramadhan', 12.00, 'Lembur Konfigurasi Server Mikrotik & Instalasi Lab Komputer'),
    ('Eko Wahyudi', 10.00, 'Lembur Pemasangan Jalur Kelistrikan Baru Lab Komputer'),
    ('Dani Hermawan', 8.00, 'Lembur Tata Suara & Dokumentasi Acara Pertemuan Orang Tua'),

    -- D. Tata Usaha & Administrasi
    ('Yohanes Rendy A.Md.', 6.00, 'Lembur Rekapitulasi Laporan Bulanan & Evaluasi Manajemen'),
    ('Agnes Widya S.Kom.', 8.00, 'Lembur Pemberkasan Dokumen Kesiswaan & Arsip Buku Induk'),
    ('Stefanus Ricky', 10.00, 'Lembur Sinkronisasi Server Dapodik Kemendikbud & Backup Data'),

    -- E. Dewan Guru & Tenaga Pendidik
    ('Adam Wahyu Kurniawan S.Kom.', 12.00, 'Lembur Implementasi Sistem Penggajian & Hardening Database'),
    ('Adam Wahyu Kurniawan', 12.00, 'Lembur Implementasi Sistem Penggajian & Hardening Database'),
    ('Siti Nurhaliza S.Kom.', 8.00, 'Lembur Bimbingan Jam Tambahan Uji Kompetensi Kejuruan RPL'),
    ('Reza Aditya S.Kom.', 8.00, 'Lembur Pendampingan Sertifikasi Jaringan Komputer Siswa TKJ'),
    ('Dimas Arya S.Ds.', 6.00, 'Lembur Kurasi Karya Portofolio & Pameran Desain Siswa DKV'),
    ('Maya Anggraini S.Pd.', 4.00, 'Lembur Bimbingan Tambahan Siswa Menghadapi Ujian'),
    ('Ratna Dewi S.Pd.', 4.00, 'Lembur Bimbingan English Club & Persiapan Lomba Debat'),
    ('David Sinaga S.Pd.', 6.00, 'Lembur Jam Pengayaan Materi Matematika Terapan Kelas XII'),
    ('Farhan Maulana S.T.', 8.00, 'Lembur Pendampingan Siswa Perakitan Proyek Robotika')
) AS d(nama_pegawai, jam, keterangan)
JOIN tb_pegawai p ON (p.nama = d.nama_pegawai OR p.nama_dan_tanggal_lahir LIKE d.nama_pegawai || '%')
WHERE p.deleted_at IS NULL;
