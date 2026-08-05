## 1. Peta Halaman (Sitemap) & Hak Akses (Role Base)

Berdasarkan enum `role` di `tb_pengguna` (`Admin`, `Petugas Absensi`, `Approver`, `Staf Gaji`), berikut pembagian pagenya:

| Halaman / Route        | Deskripsi / Fungsi Utama                                          | Role yang Dapat Mengakses        |
| ---------------------- | ----------------------------------------------------------------- | -------------------------------- |
| `/login`               | Authentication JWT (Username & Password)                          | Semua Role                       |
| `/dashboard`           | Ringkasan statistik periode berjalan, status approval, & alert    | Semua Role                       |
| `/master/pegawai`      | CRUD Data Pegawai, Jabatan, Golongan, Status Perkawinan           | Admin                            |
| `/master/komponen`     | Kelola Formula/Master Tunjangan & Potongan                        | Admin                            |
| `/periode`             | Buka periode baru (`fungsi_buka_periode_baru`), monitoring status | Admin, Staf Gaji                 |
| `/transaksi/absensi`   | Input & rekap rekapitulasi absensi pegawai per periode            | Petugas Absensi, Staf Gaji       |
| `/transaksi/tunjangan` | Input jam lembur (`total_jam_lebih`) & honor manual               | Staf Gaji                        |
| `/transaksi/potongan`  | Input potongan bulanan (Bulk / Per-pegawai)                       | Staf Gaji                        |
| `/approval`            | Verifikasi & pengesahan periode gaji (Approve / Reject)           | Approver                         |
| `/rekap-gaji`          | Kalkulasi massal, tabel rekapitulasi, & detail slip               | Staf Gaji, Admin                 |
| `/rekap-gaji/slip/:id` | Tampilan bersih Slip Gaji siap cetak / simpan PDF                 | Semua Role (Terisolasi per user) |
| `/audit/koreksi-jam`   | Histori & log koreksi jam mengajar/lembur (`tb_koreksi_jam`)      | Staf Gaji, Admin                 |

---

## 2. Bedah Fitur Utama per Halaman

### A. Modul Periode Gaji (`/periode`)

Halaman kontrol utama untuk mengunci dan membuka siklus penggajian.

- **Fitur Utama:**
- **Modal "Buka Periode Baru":** Form input `bulan_gaji`, `tanggal_awal`, dan `tanggal_akhir` yang memanggil `fungsi_buka_periode_baru()`.
- **Status Stepper:** Visualisasi progress status periode (`Pengisian Absensi` $\rightarrow$ `Menunggu Approval` $\rightarrow$ `Disetujui` $\rightarrow$ `Diproses Gaji` $\rightarrow$ `Selesai`).
- **Kunci Transaksi:** Jika status sudah `Menunggu Approval` atau `Selesai`, form input di modul lain otomatis _disabled_ (read-only).

### B. Modul Transaksi Potongan & Tunjangan (`/transaksi/*`)

Halaman operasional bulanan tempat kamu menerapkan fungsi `saveBulk` di backend.

- **Fitur Utama:**
- **Bulk Matrix Table:** Tabel interaktif tempat Staf Gaji bisa mengedit potongan/tunjangan beberapa pegawai sekaligus dalam satu layar.
- **Auto-Calculate Total:** Perhitungan live di UI sebelum tombol _"Simpan Bulk"_ diklik.
- **Modal Audit Log Koreksi Jam:** Ketika Staf Gaji mengubah `total_jam_lebih`, sistem memunculkan pop-up wajib isi `keterangan` dan upload `bukti_dokumen` untuk dicatat ke `tb_koreksi_jam`.

### C. Modul Approval (`/approval`)

Halaman khusus untuk Pimpinan/Approver.

- **Fitur Utama:**
- **Summary Dashboard:** Menampilkan ringkasan total kehadiran, total lembur, dan proyeksi anggaran gaji sebelum disetujui.
- **Action Box:** Tombol "Setujui Periode" atau "Tolak" disertai input catatan (`tb_approval`).

### D. Modul Rekap & Slip Gaji (`/rekap-gaji`)

Puncak dari seluruh alur data backend.

- **Fitur Utama:**
- **Tombol "Proses & Lock Rekap Gaji":** Memicu pencatatan snapshot ke `tb_rekap_gaji` dan `tb_rekap_gaji_detail`.
- **Datatable Rekap:** Kolom Nama, Jabatan Snapshot, Golongan Snapshot, Gaji Pokok, Total Bruto, Total Potongan, dan Netto Clean.
- **Filter & Export:** Export tabel rekap ke Excel / CSV per periode.

---

## 3. Desain Komponen Slip Gaji (`/rekap-gaji/slip/:id`)

Karena data di `tb_rekap_gaji_detail` sudah tersimpan dalam struktur snapshot (`TUNJANGAN` vs `POTONGAN`), komponen UI Slip Gaji dibuat dengan layout **Dua Kolom Kiri-Kanan Standard Payroll**:

```text
+-----------------------------------------------------------------------+
|                         SLIP GAJI PEGAWAI                             |
| Periode: Agustus 2026                                                 |
| Nama   : Siti Aminah S.Pd                 Jabatan  : Wali Kelas       |
| Gol.   : Golongan III/b                   Tgl Lahir: 1990-08-20      |
+-----------------------------------+-----------------------------------+
| PENERIMAAN (BRUTO)                | POTONGAN                          |
+-----------------------------------+-----------------------------------+
| Gaji Pokok         : Rp 2.900.000 | Potongan Dana Wajib : Rp   50.000 |
| Tunj. Wali Kelas   : Rp   500.000 | Potongan Lainnya    : Rp   75.000 |
| Tunjangan Istri    : Rp   100.000 |                                   |
| Honor Lembur       : Rp    75.000 |                                   |
| Honor Tambahan     : Rp   250.000 |                                   |
+-----------------------------------+-----------------------------------+
| Total Penerimaan   : Rp 3.825.000 | Total Potongan      : Rp  125.000 |
+-----------------------------------+-----------------------------------+
|                       GAJI BERSIH (NETTO)                             |
|                           Rp 3.700.000                                |
+-----------------------------------------------------------------------+
|                                           [ Tombol Cetak PDF / Print ]|
+-----------------------------------------------------------------------+

```

---

## 4. Rekomendasi Struktur Folder Frontend (React / Next.js)

Gunakan struktur folder terorganisir berarsitektur _Feature-based_:

```text
src/
├── assets/                  # Logos, icons, CSS global
├── components/              # Komponen re-usable UI
│   ├── ui/                  # Button, Input, Modal, Table, Badge
│   └── layout/              # Sidebar, Header, PageContainer
├── features/                # Modul Spesifik Bisnis
│   ├── absensi/             # Component, hooks, & api absensi
│   ├── periode/             # Component, hooks, & api periode
│   ├── potongan/            # Component, hooks, & api potongan (Termasuk Bulk Input)
│   └── rekap/               # Component Slip Gaji, Tabel Rekap
├── hooks/                   # Custom hooks (e.g., useAuth, useDebounce)
├── services/                # Axios instance & API interceptors
├── types/                   # TypeScript interfaces (Menyesuaikan DTO Backend)
└── pages/ (atau app/)       # Routing Halaman

```
