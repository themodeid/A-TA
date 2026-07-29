import { Router } from "express";
import * as masterPotonganController from "./master-potongan.controller";

const router = Router();

router.get("/", masterPotonganController.getAllMaster);
router.get("/:id", masterPotonganController.getMasterById);
router.post("/", masterPotonganController.createMaster);
router.put("/:id", masterPotonganController.updateMaster);
router.delete("/:id", masterPotonganController.deleteMaster);

export default router;
