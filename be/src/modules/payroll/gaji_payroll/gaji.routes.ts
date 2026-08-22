import { Router } from "express";
import * as gajiController from "./gaji.controller";

const router = Router();

// 1. Action / Process Routes (Proses Payroll)
router.post("/process/periode/:id_periode", gajiController.processPayroll);

// 2. Specific Sub-resource Routes (Dahulukan route yang lebih spesifik/panjang)
router.get(
  "/periode/:id_periode/pegawai/:id_pegawai",
  gajiController.getSlipGajiPegawai,
);

router.get("/rekap/:id_rekap/download-pdf", gajiController.downloadSlipPdf);

// 3. Generic Resource / Parameterized Routes (Ditaruh paling bawah)
router.get("/rekap", gajiController.getAllRekap);
router.get("/periode/:id_periode", gajiController.getRekapByPeriode);
router.get("/rekap/:id_rekap", gajiController.getDetailRekap);

export default router;
