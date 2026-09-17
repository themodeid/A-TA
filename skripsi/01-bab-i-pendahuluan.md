# BAB I PENDAHULUAN

## A. Latar Belakang
Perkembangan teknologi informasi saat ini telah mendorong transformasi digital di berbagai sektor, termasuk tata kelola administrasi pendidikan. Era modern menuntut instansi pendidikan untuk mengadopsi sistem informasi yang andal demi mewujudkan proses operasional yang efisien, transparan, dan akurat. Salah satu aspek krusial dalam tata kelola sekolah adalah manajemen sumber daya manusia, yang berkaitan erat dengan sistem penggajian guru dan karyawan. Sistem informasi penggajian yang terkomputerisasi dengan baik menjadi instrumen esensial untuk meminimalisasi kesalahan administratif serta mempercepat alur informasi dalam suatu organisasi.

Dalam konteks meso, pengelolaan penggajian di sekolah swasta memiliki kompleksitas tersendiri. Proses ini tidak hanya melibatkan komponen gaji pokok, melainkan juga mengintegrasikan berbagai variabel yang dinamis seperti jam mengajar wajib, jam mengajar lebih, tunjangan keluarga, tunjangan jabatan, masa kerja, hingga skema yang merujuk pada regulasi standar seperti PP Nomor 85 Tahun 1997 tentang struktur gaji, yang kemudian disesuaikan dengan kebijakan yayasan sekolah. Variabel-variabel tersebut memerlukan perhitungan matematis yang detail; kesalahan pada salah satu komponen dapat berimbas pada ketidaksesuaian nominal yang diterima (*take-home pay*) sehingga berpotensi menimbulkan ketidakpuasan kinerja.

Secara faktual di lingkungan mikro, SMK PSKD 3 Jakarta yang berlokasi di Jl. Tanjung Wangi No. 1, Pluit, Penjaringan, Jakarta Utara, masih menjalankan administrasi penggajiannya secara manual konvensional. Saat ini, sistem yang berjalan mengandalkan aplikasi Microsoft Excel yang terpecah menjadi lima *sheet* terpisah, yakni *sheet* `jam`, `Tunjangan`, `GJ.POKOK`, `RECAP`, dan `DAFTAR PERMINTAAN PEMBAYARAN`. Proses tersebut dikelola secara kolektif namun tidak terintegrasi dengan baik antara Pak Rendy (staf yang mengurus data kehadiran dari mesin *fingerprint*), staf keuangan (yang mengolah rincian gaji), dan Bapak Thomas selaku Kepala Sekolah (yang memberikan *approval* atau persetujuan akhir). Pemindahan data secara manual antar *sheet* memicu risiko *human error* yang tinggi, seperti rusaknya formula sel, kesalahan perhitungan jam lebih, hingga kesalahan pemotongan cicilan pinjaman. Selain itu, tidak adanya sistem notifikasi *real-time* menyebabkan keterlambatan koordinasi; Kepala Sekolah sering kali tidak mengetahui adanya berkas pengajuan gaji yang butuh segera disetujui kecuali jika diingatkan secara langsung. Guru dan karyawan juga mengalami kesulitan karena tidak adanya akses slip gaji mandiri, sehingga rincian penerimaan dan potongan tidak transparan secara langsung.

Berdasarkan uraian permasalahan di atas, diperlukan adanya pembaharuan sistem untuk merampingkan dan mengotomatisasi tata kelola penggajian yang terpecah tersebut. Oleh karena itu, penulis mengangkat penelitian dengan judul **"PENGGAJIAN GURU DAN KARYAWAN SMK PSKD JAKARTA MENGGUNAKAN METODE WATERFALL BERBASIS WEB"** untuk memberikan solusi nyata yang aplikatif bagi instansi.

## B. Identifikasi Masalah

Berdasarkan latar belakang masalah yang telah diuraikan, maka dapat diidentifikasi masalah sebagai berikut:

1. Terpecahnya pengolahan data penggajian ke dalam lima *sheet* Microsoft Excel yang saling terpisah, sehingga menyebabkan redundansi kerja.
2. Tidak adanya fitur notifikasi otomatis (*in-app notification*), sehingga komunikasi antar petugas terkait status penyelesaian rekap dan *approval* sering mengalami keterlambatan.
3. Tingginya risiko kesalahan (*human error*) yang dipicu oleh pemindahan data antar berkas secara manual, seperti rusaknya rumus dan *input* yang terduplikasi.
4. Kalkulasi jam mengajar lebih dan potongan absen yang masih dilakukan secara manual sering menyebabkan ketidaksesuaian jumlah *take-home pay*.
5. Sering terjadinya keterlambatan proses persetujuan (approval) penggajian dari Kepala Sekolah karena tidak ada pengingat sistem.
6. Tidak tersedianya fasilitas pencetakan dan pengunduhan slip gaji secara mandiri, sehingga rincian komponen penggajian kurang transparan bagi para guru dan karyawan.

## C. Batasan Masalah

Agar penelitian ini lebih terarah, fokus, dan tidak menyimpang dari tujuan awal, maka penulis menetapkan batasan masalah sebagai berikut:

1. Ruang lingkup penelitian dan objek implementasi sistem difokuskan pada tata kelola penggajian di lingkungan SMK PSKD 3 Jakarta.
2. Sistem yang dirancang berbasis *web*, dikembangkan menggunakan kerangka kerja (*framework*) modern yakni *Next.js* untuk *front-end*, *Node.js* dan *Express* untuk *back-end*, serta sistem manajemen basis data *PostgreSQL*.
3. Aplikasi difokuskan pada pengolahan gaji yang memuat fitur notifikasi *in-app* dan penjadwalan otomatis (*cron reminder*) antar *role user* (staf, kepala sekolah, guru).
4. Formula perhitungan komponen gaji mengadopsi standar perhitungan yang berlaku di instansi (melibatkan adaptasi struktur PP 85/97) serta kebijakan lokal sekolah tentang jam mengajar dan tunjangan.
5. Sistem ini tidak mencakup integrasi langsung dengan *Payment Gateway* perbankan untuk pencairan atau transfer otomatis ke rekening pegawai (hanya sebatas sistem pencatatan laporan dan persetujuan).
6. Pengujian kelayakan sistem aplikasi ini dilakukan menggunakan metode *Black Box Testing* untuk pengujian antarmuka fungsional serta *White Box Testing* (*Automated Unit Testing* berbasis Jest) untuk pengujian akurasi logika domain komputasi penggajian.

## D. Rumusan Masalah

Berikut adalah sejumlah rumusan masalah yang dapat diangkat dalam penulisan tugas akhir ini:

1. Bagaimana menganalisis dan merancang sistem informasi penggajian guru dan karyawan berbasis web pada SMK PSKD 3 Jakarta yang mengintegrasikan pengolahan absensi, tunjangan, dan gaji pokok?
2. Bagaimana mengimplementasikan fitur notifikasi *in-app* dan penjadwalan otomatis untuk mempercepat alur koordinasi dan persetujuan (*approval*) penggajian antar petugas?
3. Bagaimana menguji kelayakan dan fungsionalitas sistem informasi penggajian yang dibangun menggunakan metode *Black Box Testing* dan *White Box Testing* (*Automated Unit Testing*)?

## E. Tujuan Penelitian

Berdasarkan rumusan masalah di atas, maka tujuan dari pelaksanaan penelitian ini adalah sebagai berikut:

1. Menganalisis dan merancang sistem informasi penggajian guru dan karyawan berbasis web pada SMK PSKD 3 Jakarta yang mengintegrasikan pengolahan absensi, tunjangan, dan gaji pokok.
2. Mengimplementasikan fitur notifikasi *in-app* dan penjadwalan otomatis untuk mempercepat alur koordinasi dan persetujuan (*approval*) penggajian antar petugas.
3. Menguji kelayakan dan fungsionalitas sistem informasi penggajian yang dibangun menggunakan metode *Black Box Testing* dan *White Box Testing* (*Automated Unit Testing*).

## F. Manfaat Penelitian
### 1. Secara Teoritis
Penelitian ini diharapkan dapat memberikan sumbangsih pemikiran dan memperkaya keilmuan di bidang Rekayasa Perangkat Lunak, khususnya pada perancangan *Sistem Informasi Payroll*. Selain itu, penelitian ini dapat menjadi referensi literatur mengenai penerapan teknologi notifikasi *in-app* dan *background scheduler* pada aplikasi perkantoran berbasis *web*.

### 2. Secara Praktis
a. **Bagi SMK PSKD 3 Jakarta:** Menjadi solusi konkret untuk meningkatkan efisiensi waktu, meminimalisasi kesalahan matematis akibat perhitungan manual, serta mempercepat proses persetujuan dan pelaporan tata kelola administrasi keuangan sekolah.
b. **Bagi Guru dan Karyawan:** Memberikan kemudahan dan transparansi dalam memantau komponen penerimaan gaji secara rinci melalui fitur slip gaji digital mandiri.
c. **Bagi Peneliti:** Menjadi wadah bagi penulis untuk mengimplementasikan dan membuktikan kemampuan analitis serta keterampilan teknis pemrograman ilmu teknik informatika secara langsung pada permasalahan nyata di dunia kerja.
