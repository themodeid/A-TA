Oke Dam, untuk mengelola `tb_rekap_gaji` dan `tb_rekap_gaji_detail` (yang sifatnya sebagai data _snapshot_ / _read-only reporting_ setelah payroll selesai), kamu tidak butuh route `POST`, `PUT`, atau `DELETE` biasa. Data ini dibuat otomatis oleh Payroll Engine dan **harus terkunci dari perubahan manual**.

Berikut adalah daftar **Routes RESTful API** yang paling ideal, efektif, dan fleksibel untuk modul Rekap & Slip Gaji:

---

## 🛣️ Daftar Routes Modul Rekap Gaji

### 1. Execute Process Payroll (Trigger Snapshot)

- **Method & Path:** `POST /api/rekap-gaji/process/:id_periode`
- **Deskripsi:** Memproses kalkulasi gaji untuk satu periode tertentu dan menyimpan _snapshot_-nya ke `tb_rekap_gaji` & `tb_rekap_gaji_detail`.
- **Request Params:** `id_periode` (misal: `2`)

---

### 2. Get All Rekap Gaji (Daftar Rekap per Periode)

- **Method & Path:** `GET /api/rekap-gaji/periode/:id_periode`
- **Deskripsi:** Mengambil semua rekap gaji pegawai pada suatu periode tertentu (biasanya untuk tampilan tabel ringkasan Staf Gaji/Admin).
- **Query Params (Opsional):** `?search=nama_pegawai`
- **Response:** Array ringkasan berisi `nama_pegawai`, `jabatan_snapshot`, `total_penghasilan_bruto`, `total_potongan`, `total_penerimaan_clean`.

---

### 3. Get Detail Rekap / Slip Gaji Individual

- **Method & Path:** `GET /api/rekap-gaji/:id_rekap`
- **Deskripsi:** Mengambil detail lengkap rekap gaji untuk 1 record (digunakan untuk menampilkan **Slip Gaji** pegawai beserta _breakdown_ tunjangan dan potongannya).
- **Response:**
- Header data dari `tb_rekap_gaji`
- Array detail dari `tb_rekap_gaji_detail` (komponen `TUNJANGAN` & `POTONGAN`)

---

### 4. Get Slip Gaji Specific Pegawai & Periode

- **Method & Path:** `GET /api/rekap-gaji/periode/:id_periode/pegawai/:id_pegawai`
- **Deskripsi:** Alternative endpoint jika frontend / aplikasi pegawai ingin mengambil Slip Gaji berdasarkan kombinasi `id_periode` dan `id_pegawai`.

---

### 5. Export Slip Gaji / Rekap (PDF / Excel) — _Opsional_

- **Method & Path:** `GET /api/rekap-gaji/:id_rekap/download-pdf`
- **Deskripsi:** Generate file PDF Slip Gaji pegawai untuk dicetak atau di-download.

---

## 💻 Contoh Implementasi Express Router (`rekap.router.ts`)

```typescript
import { Router } from "express";
import * as rekapController from "./rekap.controller";

const router = Router();

// 1. Eksekusi Kalkulasi & Freeze Snapshot (Payroll Engine)
router.post("/process/:id_periode", rekapController.processPayroll);

// 2. Ambil Daftar Rekap Gaji per Periode (Tabel Summary Admin/Staf Gaji)
router.get("/periode/:id_periode", rekapController.getRekapByPeriode);

// 3. Ambil Detail Slip Gaji berdasarkan ID Rekap
router.get("/:id_rekap", rekapController.getDetailRekap);

// 4. Ambil Slip Gaji berdasarkan Periode & ID Pegawai
router.get(
  "/periode/:id_periode/pegawai/:id_pegawai",
  rekapController.getSlipGajiPegawai,
);

// 5. Download PDF Slip Gaji (Optional)
router.get("/:id_rekap/download-pdf", rekapController.downloadSlipPdf);

export default router;
```

---

## 📌 Contoh Response JSON `GET /api/rekap-gaji/:id_rekap` (Slip Gaji)

Satu query SQL JOIN antara `tb_rekap_gaji` dan `tb_rekap_gaji_detail` akan menghasilkan struktur data seperti ini di frontend:

```json
{
  "status": "success",
  "data": {
    "id_rekap": 1,
    "id_periode": 2,
    "id_pegawai": 3,
    "jabatan_snapshot": "Kepala Sekolah",
    "pangkat_golongan_snapshot": "Golongan IV/a (Pembina)",
    "gaji_pokok_snapshot": 3500000.0,
    "total_penghasilan_bruto": 6710000.0,
    "total_potongan": 600000.0,
    "total_penerimaan_clean": 6110000.0,
    "created_at": "2026-08-04T10:00:00.000Z",
    "details": [
      {
        "id_rekap_detail": 101,
        "jenis_komponen": "TUNJANGAN",
        "nama_komponen_snapshot": "Tunjangan Struktural Kepala Sekolah",
        "nilai_snapshot": 2000000.0,
        "kode_kondisi_snapshot": "TUNJ_STRUKTURAL"
      },
      {
        "id_rekap_detail": 102,
        "jenis_komponen": "TUNJANGAN",
        "nama_komponen_snapshot": "Uang Transport WFO",
        "nilai_snapshot": 720000.0,
        "kode_kondisi_snapshot": "TRN_WFO"
      },
      {
        "id_rekap_detail": 103,
        "jenis_komponen": "POTONGAN",
        "nama_komponen_snapshot": "Potongan Angsuran",
        "nilai_snapshot": 500000.0,
        "kode_kondisi_snapshot": "POT_ANGSURAN"
      }
    ]
  }
}
```

Struktur routes ini sudah ringkas, aman (_read-only_ setelah proses), dan mencakup semua kebutuhan dari laporan dashboard Admin sampai cetak slip gaji pegawai!
