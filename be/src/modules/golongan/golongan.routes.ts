import { Router } from "express";
import * as golonganController from "./golongan.controller";

const router = Router();

router.get("/", golonganController.getAllGolongan);
router.get("/:id", golonganController.getGolonganById);
router.post("/", golonganController.createGolongan);
router.put("/:id", golonganController.updateGolongan);
router.delete("/:id", golonganController.deleteGolongan);

export default router;
