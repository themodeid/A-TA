import { Router } from "express";

import { uploadExcel } from "../../middlewares/upload";
import * as controller from "./pegawai.controller";

const router = Router();

// uplod data pegawai
router.post(
  "/upload-pegawai",
  uploadExcel.single("file"),
  controller.uploadMasterPegawai,
);

// get data pegawai
router.get("/get-pegawai", controller.getMasterPegawai);

export default router;
