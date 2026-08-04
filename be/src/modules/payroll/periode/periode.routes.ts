import { Router } from "express";
import * as controller from "./periode.controller";

const router = Router();

// Base URL: /api/periode/

// 1. Root Collection Routes
router.route("/").get(controller.getAllPeriode).post(controller.createPeriode);

// 2. Lifecycle & Approval Actions
router.post("/:id/submit-approval", controller.submitApproval);
router.post("/:id/approve", controller.approve);
router.post("/:id/reject", controller.reject);

// 3. Snapshot Rekap
router.get("/:id/rekap", controller.getRekapByPeriode);

// 4. Single Resource Routes (CRUD)
router
  .route("/:id")
  .get(controller.getPeriodeById)
  .patch(controller.updatePeriode)
  .delete(controller.deletePeriode);

export default router;
