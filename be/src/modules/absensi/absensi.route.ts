import { Router } from "express";
import * as absensiController from "./absensi.controller";

const router = Router();

// Urutan Routing CRUD Lengkap
router.post("/periode/:idPeriode/bulk", absensiController.createAbsensiBulk); // C - Massal per Perioderouter.post("/", absensiController.createAbsensiSingle); // C - Satuan
router.get("/:id", absensiController.getAbsensiById); // R - Detail baris
router.put("/:id", absensiController.updateAbsensi); // U - Edit & Auto-sync Tunjangan
router.delete("/:id", absensiController.deleteAbsensi); // D - Hapus

export default router;
