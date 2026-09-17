# Sistem Informasi Penggajian Guru & Karyawan SMK PSKD 3 Jakarta (A-TA)

Enterprise-grade Payroll Information System dirancang khusus untuk operasional penggajian guru dan staf di SMK PSKD 3 Jakarta dengan kepatuhan penuh terhadap standar akademik dan industri.

---

## 🏛️ Profil Sistem
- **Institusi**: SMK PSKD 3 Jakarta Utara (Jl. Tanjung Wangi No. 1, Pluit, Penjaringan)
- **Basis Aturan**: Cut-off tanggal 16 s.d. 15 bulan berjalan, Tunjangan Keluarga (Istri 10%, Anak 2% max 2), Honor Jam Mengajar Lebih (Wajib 72 jam, Rp 35.000/jam lebih), Tunjangan Kehadiran (Rp 25.000/hari WFO), Pemotongan Koperasi & Kasbon, serta Slip Gaji Digital ber-QR Code.
- **Standar Rekayasa**: Clean Architecture, Pure Domain Logic Engine, Automated Unit Testing (Jest), Local & GitHub Actions CI Pipeline.

---

## 🛠️ Tech Stack & Arsitektur

| Komponen | Teknologi | Keterangan |
|---|---|---|
| **Backend (be)** | Express.js, TypeScript, Prisma ORM | RESTful API, Domain Engine, JWT Auth, RBAC |
| **Frontend (fe)** | Next.js 16 (App Router), React 19, Tailwind CSS | Dashboard modern, Slip Gaji, Manajemen Absensi |
| **Database** | PostgreSQL 16 | Relasional ACID, Prisma Schema Migrations |
| **Testing Engine** | Jest, ts-jest, TypeScript Runner | 100% Deterministic Pure Functions Unit Tests |
| **CI/CD** | GitHub Actions & `verify-local.bat` | Automated Test & Build Pipeline |
| **Container** | Docker & Docker Compose | Multi-container setup (Database, Backend, Frontend) |

---

## 📁 Struktur Monorepo

```
A-TA/
├── .github/workflows/
│   └── ci.yml               # Pipeline CI GitHub Actions (Unit Tests & Build)
├── be/                      # Backend Express + TypeScript
│   ├── src/
│   │   ├── modules/
│   │   │   ├── payroll/     # Modul Penggajian & Pure Domain Logic
│   │   │   ├── auth/        # Otentikasi & RBAC
│   │   │   ├── attendance/  # Rekap Kehadiran & Jam Mengajar
│   │   │   └── employees/   # Data Induk Pegawai & Tarif
│   │   └── __tests__/       # Automated Test Suites (Jest & Runner)
│   ├── prisma/              # Schema & Migrasi PostgreSQL
│   ├── jest.config.js       # Konfigurasi Jest Test Runner
│   └── package.json
├── fe/                      # Frontend Next.js 16 + Tailwind
│   ├── src/app/             # Pages, Components, & Layouts
│   └── package.json
├── skripsi/                 # Naskah Skripsi Lengkap FTIK UNINDRA
│   ├── skripsi-lengkap.docx # Dokumen Word Resmi Format UNINDRA (4-4-3-3)
│   ├── skripsi-lengkap.html # Web Preview Standar Cetak A4
│   └── *.md                 # Source Naskah Bab I s.d. Bab V
├── docker-compose.yml       # Orkes Kontainer Produksi
├── verify-local.bat         # 1-Click Script Verifikasi CI Lokal
├── start-local.bat          # 1-Click Script Menjalankan Environment Dev
└── README.md
```

---

## 🚀 Panduan Memulai Cepat

### 1. Inisialisasi Environment
Jalankan script untuk menggenerasi file `.env` dari `.env.example`:
```bash
npm run env:init
```

### 2. Verifikasi Kualitas Kode & Automated Tests (CI Lokal)
Sebelum commit atau deploy, jalankan verifikasi lokal:
```bash
# Melalui npm root:
npm run verify

# Atau jalankan batch script langsung:
.\verify-local.bat
```
*Script ini otomatis mengeksekusi seluruh 17 unit test suite payroll/auth dan menguji kompilasi TypeScript.*

### 3. Menjalankan Server Pengembangan

**Opsi A: Jalankan Menggunakan Script 1-Click**
```bash
.\start-local.bat
```

**Opsi B: Jalankan Manual**
```bash
# 1. Jalankan Backend (Port 3050)
cd be
npm install
npm run dev

# 2. Jalankan Frontend (Port 3000) di terminal lain
cd fe
npm install
npm run dev
```

**Opsi C: Jalankan Menggunakan Docker**
```bash
npm run docker:up
```

---

## 🧪 Pengujian Otomasi (Unit Testing)

Sistem menggunakan pengujian White Box berbasis unit testing pada pure function kalkulasi gaji:
- **`calculateTunjanganKeluarga`**: Menghitung hak tunjangan istri dan anak sesuai aturan pembatasan maksimal.
- **`calculateHonorJamLebih`**: Validasi batasan jam wajib mengajar (72 jam) dan tarif kelebihan jam.
- **`calculateTunjanganKehadiran`**: Kalkulasi tunjangan berbasis kehadiran riil fisik (WFO).
- **`calculateTotalPotongan`**: Agregasi potongan pinjaman koperasi, kasbon, dan iuran wajib.
- **`calculatePayrollSummary`**: Formulasi gaji bruto, total potongan, dan Take Home Pay (netto).
- **`isDateWithinCutoff`**: Validasi siklus penggajian tanggal 16 bulan lalu s.d. 15 bulan berjalan.
- **`applyKoreksiJam`**: Logika audit penyesuaian jam kerja sebelum disetujui.
- **`RBAC Matrix`**: Validasi hak akses Admin, Petugas Absen, Approver (Kepala Sekolah), dan Staf Gaji.

Untuk menjalankan unit test secara terisolasi:
```bash
cd be
npm test
```

---

## 📑 Naskah Skripsi & Dokumentasi Akademik

Naskah skripsi sistem informasi ini telah disusun lengkap memenuhi pedoman skripsi FTIK UNINDRA:
- **Lokasi File Word**: `skripsi/skripsi-lengkap.docx`
- **Lokasi File Web**: `skripsi/skripsi-lengkap.html`
- **Cakupan Bab**:
  - **BAB I**: Pendahuluan (Latar Belakang Masalah SMK PSKD 3, Identifikasi Masalah, Batasan Masalah, Rumusan Masalah, Tujuan & Manfaat Penelitian).
  - **BAB II**: Landasan Teori (Tinjauan Pustaka Sistem Informasi, Penggajian, Aturan Siklus Cut-off, Next.js, Express, PostgreSQL, Jest White-Box Testing).
  - **BAB III**: Metodologi Penelitian (Tahapan Waterfall, Analisis Sistem Berjalan, Use Case, Activity Diagram, ERD, Kamus Data).
  - **BAB IV**: Hasil dan Pembahasan (Implementasi Antarmuka, Arsitektur Sistem, Pengujian Black Box, dan Pengujian Otomasi Unit Testing).
  - **BAB V**: Penutup (Kesimpulan & Saran Pengembangan Masa Depan).

---

## 👨‍💻 Pengembang
**Adam Wahyu Kurniawan**  
Program Studi Teknik Informatika  
Fakultas Teknik dan Ilmu Komputer  
Universitas Indraprasta PGRI (UNINDRA)
