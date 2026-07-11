// src/routes/periode.routes.ts
import { Router } from "express";
import * as controller from "./periode-controller"; // Sesuaikan path relative ke file controller-mu

const router = Router();

// Endpoint untuk manajemen periode
router.get("/periode", controller.getAllPeriode);
router.get("/periode/:idPeriode", controller.getPeriodeById); // Menggunakan :idPeriode biar sinkron dengan params controller

// Catatan: Pastikan fungsi create, update, dan delete sudah di-export di file controller sebelum diaktifkan
router.post("/periode", controller.createPeriode);
router.put("/periode/:idPeriode", controller.updatePeriode);
router.delete("/periode/:idPeriode", controller.deletePeriode);

// Endpoint Tambahan untuk Rekap Gaji berdasarkan Periode
router.get("/periode/:idPeriode/rekap", controller.getRekapByPeriode);

export default router;
