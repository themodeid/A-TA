import express from "express";
const router = express.Router();
import * as controller from "./tunjanganBulananController";

// 1. Inisialisasi wadah data kosong untuk semua pegawai di awal periode
// URL Target: POST /api/v1/tunjangan-bulanan/initialize
router.post("/initialize", controller.initializeTunjangan);

// 2. Ambil semua data tunjangan bulanan (Header) berdasarkan id_periode yang dikirim via query
// URL Target: GET /api/v1/tunjangan-bulanan?id_periode=1
router.get("/:id_periode", controller.getAllTunjanganByPeriode);

// 3. Simpan/Update massal jam lembur & honor bulanan (Header + Sinkronisasi otomatis ke Detail)
// URL Target: PUT /api/v1/tunjangan-bulanan/save-bulk
router.put("/save-bulk", controller.saveBulkTunjangan);
export default router;
