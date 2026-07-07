import { Router } from "express";
import * as masterController from "./jabatan.controller";

const router = Router();

// ==========================================
// ROUTES: MASTER JABATAN
// ==========================================
router
  .route("/jabatan")
  .get(masterController.getAllJabatan)
  .post(masterController.createJabatan);

router
  .route("/jabatan/:id")
  .get(masterController.getJabatanById)
  .put(masterController.updateJabatan)
  .delete(masterController.deleteJabatan);

export default router;
