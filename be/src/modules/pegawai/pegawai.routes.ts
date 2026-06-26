import { Router } from "express";
import { uploadExcel } from "../../middlewares/upload";
import * as controller from "./pegawai.controller";

const router = Router();

router.post(
  "/upload",
  uploadExcel.single("file"),
  controller.uploadMasterPegawai,
);

router.get("/", controller.getMasterPegawai);

export default router;
