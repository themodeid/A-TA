import { Router } from "express";
import * as golonganController from "./golongan.controller";

const router = Router();

// ==========================================
// ROUTES: MASTER GOLONGAN
// ==========================================

router
  .route("/")
  .get(golonganController.getAllGolongan)
  .post(golonganController.createGolongan);

router
  .route("/:id")
  .get(golonganController.getGolonganById)
  .put(golonganController.updateGolongan)
  .delete(golonganController.deleteGolongan);

export default router;
