import { Router } from "express";
import * as controller from "./jabatan.controller";

const router = Router();

router.get("/", controller.getAllJabatan);
router.post("/", controller.createJabatan);
router.get("/:id", controller.getJabatanById);
router.put("/:id", controller.updateJabatan);
router.delete("/:id", controller.deleteJabatan);

export default router;
