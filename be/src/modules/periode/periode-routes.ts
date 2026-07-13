// src/routes/periode.routes.ts
import { Router } from "express";
import * as controller from "./periode-controller";

const router = Router();

// Base URL: /
router.route("/").get(controller.getAllPeriode).post(controller.createPeriode);

// Base URL: /:idPeriode
router
  .route("/:idPeriode")
  .get(controller.getPeriodeById)
  .put(controller.updatePeriode)
  .delete(controller.deletePeriode);

// Base URL: /:idPeriode/rekap
router.get("//:idPeriode/rekap", controller.getRekapByPeriode);

export default router;
