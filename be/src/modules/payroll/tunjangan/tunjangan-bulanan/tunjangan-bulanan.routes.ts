import { Router } from "express";
import * as tunjanganController from "./tunjangan-bulanan.controller";

const router = Router();

// GET data grid per periode
router.get("/periode/:id_periode", tunjanganController.getByPeriode);

// Menggunakan URL param /initialize/:id_periode
router.post("/initialize/:id_periode", tunjanganController.initialize);
// POST save bulk (header + detail)
router.post("/bulk-save", tunjanganController.saveBulk);

// DELETE
router.delete("/periode/:id_periode", tunjanganController.deleteByPeriode);

export default router;
