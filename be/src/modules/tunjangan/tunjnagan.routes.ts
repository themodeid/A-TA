import { Router } from "express";
import * as controller from "./tunjangan.controller";

const router = Router();

// Endpoint utama tunjangan bulanan berdasarkan periode tertentu
router
  .route("/")
  // 1. Get data tunjangan semua pegawai pada periode tertentu (Query params: ?id_periode=X)
  .get(controller.getTunjanganByPeriode)
  // 2. Bulk upsert atau single insert tunjangan bulanan pegawai
  .post(controller.saveTunjanganBulanan);

router
  .route("/:id_tunjangan_bulanan")
  // 3. Get detail tunjangan bulanan spesifik berdasarkan ID Transaksi
  .get(controller.getTunjanganById)
  // 4. Update data tunjangan bulanan spesifik (jika ada revisi sebelum approval)
  .put(controller.updateTunjanganBulanan);

// 5. Get data tunjangan spesifik untuk 1 pegawai di periode tertentu (Query params: ?id_periode=X)
router.get("/pegawai/:id_pegawai", controller.getTunjanganPegawaiByPeriode);

export default router;
