

## 1. Tata Letak (Layout) & Struktur Komponen Dashboard

Dashboard kita bagi menjadi **4 Zona Utama**:

```text
+-----------------------------------------------------------------------------------+
| [ZONA 1] Header & Selector Periode Aktif                                         |
| Select Periode: [ Agustus 2026 (Aktif) v ]  | Status: [ Pengisian Absensi (Badge) ]|
+-----------------------------------------------------------------------------------+
| [ZONA 2] Metric Cards Summary                                                     |
| +------------------+ +------------------+ +------------------+ +------------------+ |
| | Total Pegawai    | | Total Absensi    | | Proyeksi Bruto   | | Status Approval  | |
| | 42 Pegawai       | | 98.2% Hadir      | | Rp 142.500.000  | | Menunggu        | |
| +------------------+ +------------------+ +------------------+ +------------------+ |
+--------------------------------------------------+--------------------------------+
| [ZONA 3] Visual Progress Workflow (Stepper)       | [ZONA 4] Quick Action & Alert  |
| Pengisian Absensi -> Approval -> Diproses -> Done| - Alert: 3 pegawai jam minus   |
|                                                  | - Tombol: Lanjut ke Absensi    |
| [Tabel Ringkasan Per Departemen / Jabatan]       | - Tombol: Buka Periode Baru    |
+--------------------------------------------------+--------------------------------+

```

---

## 2. Rincian Fitur & Komponen per Zona

### Zona 1: Periode Selector & Status Banner

- **Dropdown Periode:** Mengambil data dari `tb_periode`. Staf Gaji/Admin bisa berpindah antar-periode untuk melihat histori bulan lalu.
- **Badge Status Periode:** Menampilkan status terkini dari enum database:
- `Pengisian Absensi` (Kuning)
- `Menunggu Approval` (Oranye)
- `Disetujui` / `Diproses Gaji` (Biru)
- `Selesai` (Hijau)

---

### Zona 2: Metric Cards (KPI Utama)

Empat kartu ringkasan cepat yang berubah dinamis mengikuti periode yang dipilih:

1. **Total Pegawai Aktif:**

- Query: Count `tb_pegawai` where `deleted_at IS NULL`.

2. **Rekap Kehadiran Periode Ini:**

- Query: Persentase `total_hadir_ops_wfo + total_hadir_ops_wfh` dari `tb_absensi_summary`.

3. **Proyeksi Total Pengeluaran Gaji:**

- Jika periode sudah `Selesai`: Sum `total_penerimaan_clean` dari `tb_rekap_gaji`.
- Jika periode masih berjalan: Estimasi total (Gaji Pokok + Tunjangan Terhitung - Potongan Terhitung).

4. **Status Approval:**

- Menampilkan ringkasan log dari `tb_approval`.

---

### Zona 3: Stepper Workflow & Ringkasan Alur

Menunjukkan _progress_ proses gaji bulan ini agar pengguna tahu langkah mana yang belum diselesaikan.

```text
[1. Absensi & Lembur] ---> [2. Input Potongan] ---> [3. Ajukan Approval] ---> [4. Hitung & Selesai]
     (Selesai)                (Sedang Aktif)              (Locked)                 (Locked)

```

Di bawah stepper, tampilkan **Tabel Ringkasan Cepat** (misal: 5 transaksi koreksi jam terakhir dari `tb_koreksi_jam` atau 5 rekapitulasi gaji pegawai terbaru).

---

### Zona 4: Panel Akses Cepat (Quick Actions) & Alert System

Panel samping kanan untuk navigasi pintar berbasis role pengguna:

- **Quick Actions:**
- Role `Staf Gaji`: Tombol cepat _"Input Potongan Bulk"_, _"Proses Rekap Gaji"_.
- Role `Approver`: Tombol cepat _"Review & Approve Periode"_.
- Role `Admin`: Tombol cepat _"Buka Periode Baru"_.

- **System Alerts / Warnings:**
- _"Ada 2 pegawai yang data absensinya belum diisi pada periode ini."_
- _"Terdapat koreksi jam lembur yang membutuhkan konfirmasi."_

---

## 3. Kontrak Payload API Dashboard (Backend Contract)

Untuk menyuplai data ke Dashboard, kamu cukup membuat 1 endpoint khusus: `GET /api/dashboard/summary?id_periode=2`.

### Response Payload JSON:

```json
{
  "status": "success",
  "data": {
    "periode": {
      "id_periode": 2,
      "bulan_gaji": "Agustus 2026",
      "status": "Pengisian Absensi",
      "tanggal_awal": "2026-08-01",
      "tanggal_akhir": "2026-08-31"
    },
    "metrics": {
      "total_pegawai": 42,
      "persentase_kehadiran": 98.2,
      "estimasi_pengeluaran_gaji": 142500000.0,
      "total_potongan_terkumpul": 4250000.0
    },
    "alerts": [
      {
        "type": "warning",
        "message": "3 pegawai belum memiliki data absensi lengkap."
      }
    ],
    "recent_koreksi_jam": [
      {
        "id_koreksi": 1,
        "nama_pegawai": "Siti Aminah S.Pd",
        "jam_koreksi": 2.0,
        "jenis_koreksi": "ADD",
        "keterangan": "Lembur kegiatan rapat OSIS"
      }
    ]
  }
}
```

---

## 4. Struktur Kode React / Component Mockup

Berikut gambaran struktur komponen React untuk halaman Dashboard:

```tsx
// src/pages/Dashboard.tsx
import React, { useState, useEffect } from "react";
import { StatCard } from "@/components/dashboard/StatCard";
import { WorkflowStepper } from "@/components/dashboard/WorkflowStepper";
import { PeriodeSelector } from "@/components/dashboard/PeriodeSelector";

export const DashboardPage = () => {
  const [selectedPeriodeId, setSelectedPeriodeId] = useState<number>(2);
  const [dashboardData, setDashboardData] = useState<any>(null);

  useEffect(() => {
    // Fetch data dashboard berdasarkan selectedPeriodeId
    // fetchDashboardSummary(selectedPeriodeId).then(setDashboardData);
  }, [selectedPeriodeId]);

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* Zona 1: Header */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Dashboard Penggajian
          </h1>
          <p className="text-slate-500 text-sm">
            Sistem Informasi Payroll & Rekapitulasi
          </p>
        </div>
        <PeriodeSelector
          selectedId={selectedPeriodeId}
          onChange={(id) => setSelectedPeriodeId(id)}
        />
      </div>

      {/* Zona 2: Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Pegawai"
          value={dashboardData?.metrics.total_pegawai}
          unit="Orang"
        />
        <StatCard
          title="Kehadiran"
          value={`${dashboardData?.metrics.persentase_kehadiran}%`}
        />
        <StatCard
          title="Estimasi Gaji"
          value={`Rp ${dashboardData?.metrics.estimasi_pengeluaran_gaji.toLocaleString("id-ID")}`}
        />
        <StatCard
          title="Status Periode"
          value={dashboardData?.periode.status}
          badge
        />
      </div>

      {/* Zona 3 & 4: Workflow Stepper & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm">
          <h2 className="font-semibold text-lg mb-4">
            Progres Siklus Penggajian
          </h2>
          <WorkflowStepper currentStatus={dashboardData?.periode.status} />
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h2 className="font-semibold text-lg mb-4">Aksi Cepat</h2>
          {/* List Tombol Akses & Alert */}
        </div>
      </div>
    </div>
  );
};
```

---

Langkah selanjutnya: setelah rancangan dashboard ini disepakati, mau lanjut buatkan kode komponen React UI-nya, atau langsung masuk ke rancangan UI untuk **Modul Periode / Absensi**?
