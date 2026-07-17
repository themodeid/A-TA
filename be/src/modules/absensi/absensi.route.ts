import { Router } from "express";
import * as absensiController from "./absensi.controller";

const router = Router();

/**
 * =========================================================================
 * RUTE KELOMPOK PERIODE (Operasi Masal / Filter Bulanan)
 * =========================================================================
 */
// 1. Ambil semua daftar master periode (Dropdown/Filter) - *Wajib paling atas*
router.get("/periode/list", absensiController.getAllPeriode);

// 2. Ambil semua data rekap absensi pegawai di satu periode tertentu
router.get("/periode/:idPeriode", absensiController.getAbsensiByPeriode);

// 3. Inisialisasi/Insert massal data absensi per periode
router.post("/periode/:idPeriode/bulk", absensiController.createAbsensiBulk);

/**
 * =========================================================================
 * RUTE KELOMPOK ABSENSI SATUAN (CRUD per Baris Data / per Pegawai)
 * =========================================================================
 */
// 4. Create - Tambah data absensi satuan (single)
router.post("/", absensiController.createAbsensiSingle);

// 5. Read - Ambil detail data satu baris absensi summary - *Ditaruh bawah agar aman*
router.get("/:id", absensiController.getAbsensiById);

// 6. Update - Edit data absensi & sinkronisasi otomatis
router.put("/:id", absensiController.updateAbsensi);

// 7. Delete - Hapus data absensi
router.delete("/:id", absensiController.deleteAbsensi);

export default router;
