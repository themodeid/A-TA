import { Router } from "express";
import * as TunjanganMasterController from "./tunjangan-master.controller";

const router = Router();

// Endpoints RESTful
router.get("/", TunjanganMasterController.getAll);
router.get("/:id", TunjanganMasterController.getById);
router.post("/", TunjanganMasterController.create);
router.put("/:id", TunjanganMasterController.update);
router.delete("/:id", TunjanganMasterController.remove);

export default router;
