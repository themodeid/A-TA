import { Router } from "express";
import * as tunjanganController from "./tunjangan-bulanan.controller";

const router = Router();

// GET: Ambil daftar tunjangan bulanan per periode
router.get("/periode/:id_periode", tunjanganController.getByPeriode);

// POST: Inisialisasi tunjangan bulanan untuk periode baru (support body atau route param)
router.post("/initialize", tunjanganController.initialize);
router.post("/initialize/:id_periode", tunjanganController.initialize);
router.post("/init", tunjanganController.initialize);

// POST: Rekalkulasi tunjangan bulanan
router.post("/calculate", tunjanganController.calculate);
router.post("/calculate/:id_periode", tunjanganController.calculate);

// POST: Simpan massal tunjangan bulanan (jam lembur, honor, detail)
router.post("/bulk-save", tunjanganController.saveBulk);

// DELETE: Hapus data tunjangan bulanan per periode
router.delete("/periode/:id_periode", tunjanganController.deleteByPeriode);

export default router;
