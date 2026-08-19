import { Router } from "express";
import * as gajiController from "./gaji.controller";

const router = Router();

router.post("/process/periode/:id_periode", gajiController.processPayroll);

router.get(
  "/periode/:id_periode/pegawai/:id_pegawai",
  gajiController.getSlipGajiPegawai,
);

router.get("/periode/:id_periode", gajiController.getRekapByPeriode);

router.get("/rekap/:id_rekap/download-pdf", gajiController.downloadSlipPdf);

router.get("/rekap/:id_rekap", gajiController.getDetailRekap);

export default router;
