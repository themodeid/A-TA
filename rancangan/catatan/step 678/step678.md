## 1. Modul Approval & Lifecycle Periode (Tahap 6 & 8)

Modul ini bertanggung jawab mengontrol transisi status di `tb_periode` dan mencatat jejak auditnya.

- **Endpoint / Fitur:**
- `POST /api/periode/:id/submit-approval` $\rightarrow$ Mengubah status dari `'Pengisian Absensi'` ke `'Menunggu Approval'`.
- `POST /api/periode/:id/approve` $\rightarrow$ Mengubah status ke `'Disetujui'` sekaligus membuat record di `tb_approval` (Approver ID, status `'Approved'`, catatan).
- `POST /api/periode/:id/reject` $\rightarrow$ Mengubah status ke `'Ditolak'` jika absensi/data tunjangan perlu dikoreksi ulang oleh Petugas.

- **Validasi Keamanan:**
- Hanya user dengan `role = 'Approver'` yang boleh mengakses endpoint `approve`/`reject`.
- Gunakan **Database Transaction** (`BEGIN ... COMMIT`) agar perubahan status periode dan pencatatan log di `tb_approval` tereksekusi atomik (sukses semua atau gagal semua).

---

## 2. Modul Payroll Engine / Process Gaji (Tahap 7)

Ini adalah core module backend (biasanya diakses oleh `role = 'Staf Gaji'`). Saat status periode sudah `'Disetujui'`, Staf Gaji menekan tombol **"Run Process Gaji"**.

Modul ini akan mengeksekusi fungsi/service kalkulasi dengan urutan sebagai berikut:

```
                  ┌──────────────────────────────┐
                  │ Status Periode: 'Disetujui'  │
                  └──────────────┬───────────────┘
                                 │
                                 ▼
                     ┌───────────────────────┐
                     │   RUN PROCESS GAJI    │
                     └───────────┬───────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Calculate Gross │     │ Calculate Deduct│     │   Take Snapshot │
│ (Gaji Pokok +   │     │ (Potongan Flat  │     │ (Jabatan, Gol,  │
│ Tunjangan/Honor)│     │ & Detail)       │     │ Nilai Komponen) │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                                 ▼
         ┌───────────────────────────────────────────────┐
         │ Insert Batch:                                 │
         │ 1. tb_rekap_gaji                              │
         │ 2. tb_rekap_gaji_detail                       │
         │ 3. Update Status Periode ──► 'Selesai'        │
         └───────────────────────────────────────────────┘

```

### Logika Kalkulasi di Backend Service:

1. **Ambil Data Pegawai Aktif:** Query `tb_pegawai` yang `deleted_at IS NULL`.
2. **Kalkulasi Penghasilan (Bruto):**

- **Gaji Pokok:** Ambil `gaji_pokok_dasar` dari `tb_pegawai` (atau dari `tb_golongan`).
- **Tunjangan Struktural:** Ambil dari `tb_jabatan.tunjangan_jabatan_struktural`.
- **Tunjangan Variabel & Detail:** Query `tb_tunjangan_bulanan` (honor, jam lembur) dan `tb_tunjangan_bulanan_detail`.

3. **Kalkulasi Potongan:**

- Query `tb_potongan_bulanan_detail` dan `tb_potongan_bulanan`.

4. **Hitung Netto:** $\text{Penerimaan Clean} = \text{Total Bruto} - \text{Total Potongan}$.
5. **Freeze / Snapshot (Insert DB):**

- Insert ke `tb_rekap_gaji` untuk baris utama tiap pegawai.
- Insert ke `tb_rekap_gaji_detail` untuk breakdown komponennya (Tunjangan Struktural, Transport, Potongan, dll) dengan menyertakan nama dan nilainya saat detik itu juga.

---

## 3. Aturan Kunci (Immutability Guard)

Begitu proses di Tahap 7 selesai dan status diubah ke `'Selesai'` (Tahap 8):

1. **Lock Database / API Level:**

- Buat middleware atau logic check di backend: Jika `tb_periode.status = 'Selesai'`, **tolak semua request `UPDATE` / `DELETE` / `INSERT**` ke tabel-tabel operasional berikut untuk periode tersebut:
- `tb_absensi_summary`
- `tb_tunjangan_bulanan` & `tb_tunjangan_bulanan_detail`
- `tb_potongan_bulanan` & `tb_potongan_bulanan_detail`
- `tb_koreksi_jam`

2. **Read-Only Reporting:**

- Setelah status `'Selesai'`, kueri slip gaji dan rekap **WAJIB HANYA BISA DIBACA** dari `tb_rekap_gaji` dan `tb_rekap_gaji_detail`, bukan lagi join ke tabel master.

---
