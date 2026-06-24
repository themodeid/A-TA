import { Router } from "express";

import { uploadExcel } from "../../middlewares/upload";
import * as controller from "./pegawai.controller";

const router = Router();

router.post("/", uploadExcel.single("file"), controller.uploadMasterPegawai);

export default router;
