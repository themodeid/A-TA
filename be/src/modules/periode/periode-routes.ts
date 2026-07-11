// src/routes/periode.routes.ts
import { Router } from "express";
import { PeriodeController } from "./periode-controller";

const router = Router();
const controller = new PeriodeController();

router.post("/periode", controller.create);
router.get("/periode", controller.getAll);
router.get("/periode/:id", controller.getById);
router.put("/periode/:id", controller.update);
router.delete("/periode/:id", controller.delete);

export default router;
