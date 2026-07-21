// modules/tunjangan/tunjangan.routes.ts
import { Router } from "express";
import * as controller from "./konfigurasi.controller";

const router = Router();

router.get("/", controller.getTunjangan);
router.post("/", controller.createTunjangan);
router.put("/:id", controller.updateTunjangan);
router.delete("/:id", controller.deleteTunjangan);

export default router;
