import { Router } from "express";
import * as dashboardController from "./dashboard.controller";

const router = Router();

// GET /api/dashboard/summary/periode/:id_periode
router.get("/summary/periode/:idPeriode", dashboardController.getSummary);

export default router;
