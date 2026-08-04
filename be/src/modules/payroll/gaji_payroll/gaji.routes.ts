import { Router } from "express";
import * as gajiController from "./gaji.controller";

const router = Router();

// 1. Eksekusi Kalkulasi & Freeze Snapshot (Payroll Engine)
router.post("/process/:id_periode", gajiController.processPayroll);

// 2. Ambil Daftar Rekap Gaji per Periode (Tabel Summary)
router.get("/periode/:id_periode", gajiController.getRekapByPeriode);

// 3. Ambil Detail Slip Gaji berdasarkan ID Rekap
router.get("/:id_rekap", gajiController.getDetailRekap);

// 4. Ambil Slip Gaji spesifik berdasarkan Periode & ID Pegawai
router.get(
  "/periode/:id_periode/pegawai/:id_pegawai",
  gajiController.getSlipGajiPegawai,
);

// 5. Download PDF Slip Gaji (Optional)
router.get("/:id_rekap/download-pdf", gajiController.downloadSlipPdf);

export default router;
