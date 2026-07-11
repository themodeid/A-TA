import { Router } from "express";
import {
  hitungGajiBulanan,
  getRekapByPeriode,
  getAllPeriode,
} from "./gaji.controller";

const router = Router();

router.post("/hitung", hitungGajiBulanan);
router.get("/periode/list", getAllPeriode);
router.get("/:idPeriode", getRekapByPeriode);

export default router;
