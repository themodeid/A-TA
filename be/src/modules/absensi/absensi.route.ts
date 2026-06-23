import { Router } from "express";
import { uploadExcel } from "../../middlewares/upload";
import { uploadAbsensi } from "./absensi.controller";

const router = Router();

router.post("/upload", uploadExcel.single("file"), uploadAbsensi);
router.post("/", uploadExcel.single("file"), uploadAbsensi);

export default router;
