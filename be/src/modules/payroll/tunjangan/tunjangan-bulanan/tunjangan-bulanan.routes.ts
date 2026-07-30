import { Router } from "express";
import * as tunjanganController from "./tunjangan-bulanan.controller";

const router = Router();

// GET data grid per periode
router.get("/periode/:id_periode", tunjanganController.getByPeriode);

// POST inisialisasi awal periode
router.post("/initialize", tunjanganController.initializePeriode);

// POST save bulk (header + detail)
router.post("/bulk-save", tunjanganController.saveBulkData);

export default router;
