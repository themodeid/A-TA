import { Router } from "express";
import * as masterController from "./jabatan.controller";

const router = Router();

// ==========================================
// ROUTES: MASTER JABATAN
// ==========================================
router
  .route("/")
  .get(masterController.getAllJabatan)
  .post(masterController.createJabatan);

router
  .route("/:id")
  .get(masterController.getJabatanById)
  .put(masterController.updateJabatan)
  .delete(masterController.deleteJabatan);

export default router;
