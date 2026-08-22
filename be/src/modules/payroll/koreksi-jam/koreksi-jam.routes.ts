import { Router } from "express";
import * as koreksiJamController from "./koreksi-jam.controller";

const router = Router();

router.get("/", koreksiJamController.getKoreksiJam);
router.post("/", koreksiJamController.createKoreksiJam);
router.delete("/:id", koreksiJamController.deleteKoreksiJam);

export default router;
