
---

### Phase 1: Data Input Operasional Bulanan

Ini data-data "mentah" yang **wajib diisi/di-upload** oleh petugas (Petugas Absensi / Staf Gaji) sebelum rekap gaji bisa dihitung.

#### 1. Data Absensi Summary (`tb_absensi_summary`)

_Diproses dari mesin absensi / log presensi bulanan._

- `id_periode` & `id_pegawai`
- `total_hadir_ops_wfo` (untuk hitung Tunjangan Transport WFO)
- `total_hadir_ops_wfh`
- `total_izin`, `total_sakit`, `total_alpha` (kalau ada logic denda/potongan absensi)

#### 2. Data Variable Tunjangan Header (`tb_tunjangan_bulanan`)

_Data lembur dan honor kondisional bulan berjalan._

- `id_periode` & `id_pegawai`
- `total_jam_lebih` (Jumlah jam lembur bulan ini)
- `honor_bulan` (Honor manual/tambahan khusus bulan ini jika ada)

#### 3. Data Detail Tunjangan Variabel (`tb_tunjangan_bulanan_detail`)

_Hasil kalkulasi tunjangan berdasar formula (misal: transport = hari hadir $\times$ rate)._

- `id_periode` & `id_pegawai`
- `id_tunjangan` (FK ke master tunjangan)
- `nilai_terhitung` (Nominal hasil kalkulasi backend/sistem)

#### 4. Data Potongan Header & Detail (`tb_potongan_bulanan` & `tb_potongan_bulanan_detail`)

_Potongan rutin atau temporer pegawai pada periode berjalan._

- `id_periode` & `id_pegawai`
- `id_master_potongan` (Angsuran, Dana Wajib, Pelkes, dll)
- `nilai_potongan` (Nominal potongan bulan ini)
- `total_potongan_terhitung` (Total sum dari semua potongan pegawai tersebut)

---

### Phase 2: Data Output / Frozen Snapshot

Ini data yang **di-insert/di-generate oleh sistem Backend** saat proses penutupan periode (seperti script query yang dibahas sebelumnya).

#### 1. Header Rekap Gaji (`tb_rekap_gaji`)

_Ringkasan akhir penerimaan bersih pegawai._

- `jabatan_snapshot` & `pangkat_golongan_snapshot` _(Menjaga historis posisi pegawai)_
- `gaji_pokok_snapshot`
- `total_penghasilan_bruto`
- `total_potongan`
- `total_penerimaan_clean` _(Gaji bersih / Net pay)_

#### 2. Detail Slip Gaji (`tb_rekap_gaji_detail`)

_Rincian item di slip gaji agar pegawai bisa lihat breakdown-nya._

- `jenis_komponen` (`'TUNJANGAN'` / `'POTONGAN'`)
- `nama_komponen_snapshot` (misal: "Uang Transport WFO", "Tunjangan Istri", "Potongan Angsuran")
- `nilai_snapshot`
- `kode_kondisi_snapshot`

---

### Ringkasan Check-List Sebelum Hitung Rekap Gaji:

```
[ ] 1. Periode baru sudah dibuka di tb_periode (Status: 'Pengisian Absensi')
[ ] 2. Rekap Absensi sudah di-submit (tb_absensi_summary)
[ ] 3. Data jam lembur & honor tambahan di-input (tb_tunjangan_bulanan)
[ ] 4. Tunjangan harian/formula terhitung (tb_tunjangan_bulanan_detail)
[ ] 5. Potongan bulanan pegawai ter-input (tb_potongan_bulanan_detail)
[ ] 6. Status periode naik ke 'Menunggu Approval' -> 'Disetujui'
[ ] 7. RUN PROCESS GAJI -> Insert ke tb_rekap_gaji & tb_rekap_gaji_detail
[ ] 8. Status periode diset ke 'Selesai'

```
