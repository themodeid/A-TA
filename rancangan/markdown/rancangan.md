**RANCANGAN SISTEM (REVISI)**

**Sistem Informasi Penggajian Guru & Karyawan**

_Berbasis Web dengan Notifikasi In-App (Tanpa n8n & Tanpa Upload/Parsing
Excel)_

**SMK PSKD 3 Jakarta**

_Adam Wahyu Kurniawan \| NPM 202343500510 \| Kelas Y6D \| UNINDRA_

1\. Latar Belakang Sistem

Proses penggajian guru dan karyawan di SMK PSKD 3 Jakarta saat ini masih
dilakukan secara manual menggunakan beberapa template Excel terpisah:
rekap absensi/jam mengajar, rincian tunjangan, gaji pokok (mengikuti
pola PP 1985/1997), rekap gaji gabungan, hingga daftar permintaan
pembayaran untuk bendahara. Alur prosesnya melibatkan tiga pihak utama:
Pak Rendy sebagai petugas rekap absensi (sumber data dari mesin
fingerprint), Pak Thomas sebagai penyetuju (approver), dan staf
penggajian sebagai pengolah data gaji.

Proses manual lintas-file ini memiliki beberapa kelemahan: tidak adanya
notifikasi otomatis antar pihak, risiko kesalahan perhitungan saat
memindahkan angka antar sheet, komponen gaji yang tersebar dan rawan
tidak sinkron, serta tidak adanya riwayat data yang tersimpan dengan
rapi. Sistem informasi berbasis web ini dirancang untuk menyatukan
seluruh komponen tersebut dalam satu basis data terstruktur, sekaligus
mengotomatisasi perhitungan dan notifikasi antar pihak --- sepenuhnya di
dalam aplikasi itu sendiri, tanpa bergantung pada layanan automation
eksternal maupun proses upload/parsing file Excel.

2\. Tech Stack yang Digunakan

Sistem ini dibangun menggunakan teknologi modern, tanpa komponen
automation eksternal (n8n dihapus dari arsitektur):

---

**Layer** **Teknologi** **Fungsi**

---

Frontend Next.js (React) Tampilan antarmuka website,
SSR/SSG untuk performa optimal

Backend Node.js + Express.js Logika bisnis, REST API,
(TypeScript) + node-cron kalkulasi gaji, notifikasi
in-app, dan reminder terjadwal
(built-in di backend, tanpa
engine eksternal)

Database PostgreSQL (raw query, Penyimpanan seluruh data sistem
tanpa ORM) secara relasional, termasuk log
notifikasi

---

> _Perubahan dari rancangan awal: layer \"Otomatisasi (n8n)\" dihapus
> sepenuhnya. Reminder terjadwal (dulu Workflow 3 n8n) kini berjalan
> sebagai scheduled job internal memakai node-cron di dalam backend
> Express._

3\. Hak Akses Pengguna (Role)

Sistem memiliki empat role pengguna dengan hak akses yang berbeda-beda:

---

**Role** **Pengguna** **Hak Akses**

---

Admin Admin Sekolah Kelola data master guru/karyawan (status kawin,
jumlah anak, golongan/ruang), kelola komponen
gaji pokok & tunjangan jabatan, kelola akun
pengguna

Petugas Pak Rendy Input manual rekap absensi/jam mengajar per
Absensi pegawai per periode (form grid jam masuk-keluar
untuk seluruh tanggal dalam satu periode,
disimpan sekaligus), submit rekap ke Pak Thomas

Approver Pak Thomas Lihat rekap absensi & jam mengajar, approve
atau tolak rekap, kelola komponen tunjangan
bulanan (Kesra, Piket, Honor, dll.)

Staf Gaji Maria / Staf Koreksi jam lebih bila ada anomali, proses
rekap gaji, generate daftar permintaan
pembayaran, export ke Excel

---

4\. Modul & Fitur Website

4.1 Modul Login & Autentikasi

- Halaman login dengan username dan password

- Sistem redirect otomatis ke dashboard sesuai role

- Session management dan logout

4.2 Modul Data Master (Admin)

- CRUD data guru dan karyawan: nama, tanggal lahir, status kepegawaian
  (GTY/GTT/PTY/PTT), jabatan, golongan/ruang, status kawin (K/TK),
  jumlah anak, kontak

- CRUD data jabatan dan besaran tunjangan jabatan per jabatan
  (struktural & fungsional)

- CRUD komponen gaji pokok per golongan/ruang, mengikuti acuan PP
  1985/1997

- Data master hanya diinput sekali, diupdate jika ada perubahan
  (kenaikan golongan, status kawin, dsb.)

4.3 Modul Absensi & Jam Mengajar (Pak Rendy) --- Direvisi

- Pak Rendy memilih pegawai dan periode aktif (cut-off tanggal 16 s.d.
  tanggal 15 bulan berikutnya)

- Sistem menampilkan form grid berisi seluruh tanggal dalam periode
  tersebut, dengan kolom jam masuk dan jam keluar per tanggal untuk
  pegawai yang dipilih

- Pak Rendy mengisi jam masuk & jam keluar tiap tanggal secara manual,
  lalu menyimpan seluruh periode sekaligus dalam satu kali submit per
  pegawai (bulk save) --- menggantikan cara lama upload file
  fingerprint sekaligus proses parsing-nya

- Proses input ini diulang satu per satu untuk tiap pegawai hingga
  seluruh pegawai dalam periode tersebut terisi

- Begitu data satu pegawai untuk satu periode disimpan, sistem
  otomatis menghitung: total jam, jam wajib vs. jam lebih, jam tidak
  hadir, dan hari hadir honor

- Preview hasil hitung ditampilkan untuk dicek ulang sebelum Pak Rendy
  klik tombol Submit Rekap periode

- Tombol Submit Rekap mengirim notifikasi in-app ke Pak Thomas

- Riwayat input & rekap absensi/jam mengajar tersimpan per periode,
  per pegawai

> _Perubahan dari rancangan awal: tidak ada lagi upload file Excel/CSV
> maupun proses parsing & validasi format file. Input tetap efisien
> karena satu pegawai bisa diisi untuk seluruh tanggal dalam satu
> periode sekaligus, bukan satu baris per hari._

4.4 Modul Approval (Pak Thomas)

- Lihat rekap absensi dan rekap jam mengajar yang dikirim Pak Rendy

- Tombol Approve atau Tolak rekap

- Jika ditolak, Pak Rendy menerima notifikasi in-app untuk perbaikan

- Riwayat approval per periode

4.5 Modul Koreksi Jam Lebih (Staf)

- Jam lebih hasil hitung otomatis dapat dikoreksi/ditambah secara
  manual oleh Staf, untuk kasus anomali seperti lupa tap, dinas luar,
  atau izin khusus

- Setiap koreksi manual wajib disertai keterangan, dan tercatat
  sebagai entri terpisah dari hasil hitung otomatis (audit trail)

- Hanya bisa diakses setelah rekap absensi & jam mengajar di-approve
  oleh Pak Thomas

4.6 Modul Gaji Pokok (Data Master Otomatis)

- Sistem menghitung otomatis komponen gaji pokok per pegawai
  berdasarkan data master: gaji pokok sesuai golongan/ruang (PP
  1985/1997), tunjangan keluarga (istri 10%, anak 2% per anak),
  tunjangan kesra dasar, tunjangan jabatan 25% PP 1985, sumbangan dana
  Chuk (2% dan 8% PP\'85), dan tunjangan perbaikan penghasilan

- Potongan tetap (angsuran pinjaman, simpanan dana wajib, dana Chuk,
  premi kesehatan) dikelola sebagai data master per pegawai, diupdate
  manual oleh Admin bila ada perubahan

- Hasil hitung otomatis ini menjadi salah satu input ke Modul Rekap
  Gaji --- bukan diinput ulang

4.7 Modul Tunjangan Bulanan (Pak Thomas)

- Kelola komponen tunjangan bulanan/operasional yang bisa berubah tiap
  periode: tunjangan kesra, supervisi Kepala Sekolah, tunjangan
  jabatan Kepala Sekolah, wali kelas, piket, rumpun jurusan/bidang,
  dan honor bulanan

- Komponen WFH (dengan nominal potongan per hari WFH) dan WFO
  (transport per hari WFO) dihitung otomatis berdasarkan data jam
  mengajar dari Modul 4.3

- Tunjangan khusus dapat ditambahkan manual oleh Pak Thomas bila
  diperlukan

4.8 Modul Rekap Gaji (Staf)

- Sistem menggabungkan otomatis: gaji pokok & potongan tetap (4.6) +
  tunjangan bulanan (4.7) + jam lebih (4.3/4.5) + transport/uang makan
  (dari hari WFO)

- Tampil rekap gaji per individu dan per periode: total penghasilan,
  jumlah potongan, total penerimaan

- Export rekap ke format Excel

4.9 Modul Daftar Permintaan Pembayaran (Staf)

- Generate dokumen permintaan pembayaran gaji per periode, berisi
  ringkasan per pegawai: gaji pokok, tunjangan, honorarium, transport,
  total penghasilan, potongan, jumlah diterima

- Dokumen dapat diexport ke Excel/PDF dengan format siap cetak untuk
  ditandatangani Kepala Sekolah dan Bendahara

- Riwayat permintaan pembayaran tersimpan per periode untuk keperluan
  audit/pelaporan ke pusat

4.10 Dashboard & Notifikasi In-App

- Ringkasan periode aktif yang sedang berjalan

- Status rekap (Belum Diinput / Menunggu Approval / Sudah Approve /
  Sudah Diproses)

- Lonceng notifikasi in-app untuk tiap role --- sepenuhnya berjalan di
  dalam aplikasi, tanpa WhatsApp/n8n

5\. Rancangan Notifikasi In-App

Layanan automation eksternal (n8n) dan WhatsApp dihapus dari arsitektur.
Seluruh notifikasi disimpan pada tabel tb_notifikasi dan tampil pada
dashboard/lonceng notifikasi tiap role, dipicu langsung oleh backend
Express saat event tertentu terjadi.

---

**No** **Event Pemicu** **Penerima** **Isi Notifikasi**

---

1 Pak Rendy klik Submit Rekap Pak Thomas Ada rekap absensi baru
periode \[X\], silakan
dicek dan disetujui.

2 Pak Thomas klik Approve Staf/Maria Rekap absensi periode
\[X\] telah disetujui.
Silakan proses
penggajian.

3 Pak Thomas klik Tolak Pak Rendy Rekap periode \[X\]
ditolak, mohon
diperbaiki.

4 Reminder cut-off Pak Rendy Besok tanggal 16,
(terjadwal, node-cron, tiap mohon mulai input
tanggal 15 pukul 08:00) rekap absensi periode
ini.

---

> _Reminder terjadwal (dulu Workflow 3 di n8n) kini dijalankan sebagai
> scheduled job internal di dalam backend Express menggunakan library
> node-cron, tanpa workflow engine eksternal._

6\. Struktur Database (PostgreSQL)

Struktur tabel disesuaikan dengan data riil yang tersedia (rekap gaji,
tunjangan, jam lebih, gaji pokok, dan daftar permintaan pembayaran),
serta dengan modul absensi yang kini berupa input manual per periode
(tanpa tabel riwayat upload file):

---

**No.** **Nama Tabel** **Isi Data**

---

1 tb_pengguna Data akun login: username, password, role

2 tb_pegawai Data master guru & karyawan: nama, tanggal
lahir, status kepegawaian (GTY/GTT/PTY/PTT),
jabatan, golongan/ruang, status kawin, jumlah
anak, kontak

3 tb_jabatan Daftar jabatan dan besaran tunjangan jabatan
struktural/fungsional per jabatan

4 tb_periode Data periode cut-off: tanggal awal, tanggal
akhir, bulan, tahun

5 tb_absensi Data kehadiran harian, diinput manual oleh
Pak Rendy per pegawai per periode: id
pegawai, id periode, tanggal, jam masuk, jam
keluar, status, diinput oleh, tanggal input

6 tb_jam_mengajar Rekap jam mengajar per pegawai per periode
(hasil hitung otomatis dari tb_absensi):
keterangan (Ka.Sek/Wakasek/Guru/Staf), total
jam, jam wajib, jam lebih, jam tidak hadir,
hari hadir honor

7 tb_koreksi_jam Koreksi/tambahan jam lebih manual oleh Staf:
id pegawai, id periode, jumlah jam,
keterangan, diinput oleh, tanggal input

8 tb_gaji_pokok Data master gaji pokok per pegawai: status
kawin & jumlah anak, golongan/ruang, gaji
pokok PP 1985/1997, tunjangan keluarga
(istri/anak), tunjangan kesra, tunjangan
jabatan struktural/fungsional, tunjangan
jabatan 25% PP 1985, sumbangan dana Chuk 2% &
8% PP\'85, tunjangan perbaikan penghasilan,
pembulatan, jumlah bruto, dan potongan tetap
(angsuran pinjaman, simpanan wajib, dana
Chuk, premi kesehatan)

9 tb_tunjangan_periode Komponen tunjangan bulanan per pegawai per
periode: tunjangan kesra, supervisi Ka.Sek,
tunjangan jabatan Ka.Sek, wali kelas, piket,
rumpun jurusan/bidang, honor bulan, jumlah
WFH & nominal potongannya, jumlah WFO &
transport WFO, tunjangan khusus, total
tunjangan

10 tb_rekap_gaji Hasil rekap gabungan per pegawai per periode:
hari hadir, gaji kompetensi, tunjangan
jabatan dll, transport/uang makan, total
penghasilan, jumlah potongan, total
penerimaan

11 tb_permintaan_pembayaran Riwayat dokumen permintaan pembayaran per
periode: id periode, ringkasan per pegawai
(gaji pokok, tunjangan, honorarium,
transport, total penghasilan, potongan,
jumlah diterima), status (draft/final),
tanggal generate, ditandatangani oleh

12 tb_approval Riwayat approval: id periode, approver,
status, tanggal approve

13 tb_notifikasi Log notifikasi in-app: id pengguna penerima,
judul, pesan, status dibaca, tanggal dibuat

---

> _Perubahan dari rancangan awal: tb_upload_absensi dihapus (tidak ada
> lagi file yang diupload/diparse). Sebagai gantinya ditambahkan
> tb_notifikasi untuk mencatat notifikasi in-app. tb_gaji_pokok dan
> tb_tunjangan_periode diperinci mengikuti kolom-kolom yang benar-benar
> ada pada data riil sekolah._

7\. Alur Sistem Lengkap

- Admin input data master pegawai, data jabatan, dan data gaji pokok
  per golongan (sekali di awal, diupdate bila ada perubahan)

- Sistem otomatis set periode cut-off tanggal 16 setiap bulan

- Tanggal 15 pukul 08:00: backend (node-cron) membuat notifikasi
  in-app reminder untuk Pak Rendy

- Mulai tanggal 16: Pak Rendy memilih pegawai & periode, mengisi form
  grid jam masuk/keluar untuk seluruh tanggal dalam periode itu, lalu
  menyimpan sekaligus per pegawai --- diulang untuk semua pegawai

- Sistem otomatis menghitung rekap jam mengajar begitu data tiap
  pegawai disimpan, dan menampilkan preview untuk dicek ulang

- Setelah semua pegawai dalam periode selesai diinput, Pak Rendy klik
  Submit Rekap

- Sistem membuat notifikasi in-app untuk Pak Thomas

- Pak Thomas buka website, cek rekap absensi & jam mengajar, klik
  Approve (atau Tolak jika ada kejanggalan)

- Pak Thomas melengkapi/menyesuaikan komponen tunjangan bulanan
  periode tersebut bila diperlukan

- Sistem membuat notifikasi in-app untuk Staf/Maria

- Maria melakukan koreksi jam lebih bila ada anomali (opsional)

- Sistem menghitung otomatis rekap gaji: gaji pokok + tunjangan
  bulanan + jam lebih (otomatis + koreksi) + transport

- Maria generate Daftar Permintaan Pembayaran dari rekap gaji periode
  tersebut, export ke Excel/PDF untuk ditandatangani Kepala Sekolah
  dan Bendahara, lalu diserahkan ke pusat

_Dokumen Rancangan Sistem (Revisi: Tanpa n8n & Tanpa Upload/Parsing
Excel) \| Tugas Akhir \| Adam Wahyu Kurniawan \| UNINDRA 2025/2026_
