import { Router } from "express";
import {
  getPotonganByPeriode,
  initPotonganPeriode,
  saveBulkPotongan,
  copyPreviousPotongan,
} from "./potongan-bulanan.controller";

const router = Router();

// GET: Ambil daftar potongan pegawai per periode
router.get("/periode/:id_periode", getPotonganByPeriode);

// POST: Inisialisasi wadah potongan periode baru
router.post("/init", initPotonganPeriode);

// POST: Salin komponen potongan dari periode sebelumnya
router.post("/copy-previous", copyPreviousPotongan);

// POST: Simpan/update massal potongan beserta detail komponennya
router.post("/bulk-save", saveBulkPotongan);

export default router;
