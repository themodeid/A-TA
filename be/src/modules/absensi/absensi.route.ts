import { Router } from "express";
import { uploadExcel } from "../../middlewares/upload";
import {
  getPeriodeByTahun,
  getAbsensiByPeriode,
  getAbsensiById,
  updateAbsensi,
  deleteAbsensi,
} from "./absensi.controller";

const router = Router();

// ==========================================
// ENDPOINT PERIODE
// ==========================================

// GET /absensi/periode?tahun=2026
router.get("/periode", getPeriodeByTahun);

// ==========================================
// ENDPOINT REKAP ABSENSI (CRUD)
// ==========================================

// GET /absensi/periode/:idPeriode (Ambil rekap berdasarkan id periode)
router.get("/periode/:idPeriode", getAbsensiByPeriode);

// GET /absensi/:id (Detail rekap per baris summary)
router.get("/:id", getAbsensiById);

// PUT /absensi/:id (Update angka rekap)
router.put("/:id", updateAbsensi);

// DELETE /absensi/:id (Hapus data rekap)
router.delete("/:id", deleteAbsensi);

export default router;
