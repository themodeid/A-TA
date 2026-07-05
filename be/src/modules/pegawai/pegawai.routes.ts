import { Router } from "express";
import { uploadExcel } from "../../middlewares/upload";
import * as controller from "./pegawai.controller";

const router = Router();

// 1. Endpoint khusus sync via Excel (Gunakan ini di Postman: POST /api/pegawai/sync)
router.post("/sync", uploadExcel.single("file"), controller.syncMasterPegawai);

// 2. Get All Pegawai
router.get("/", controller.getMasterPegawai);

// 3. Create Single Pegawai (Hanya menerima raw JSON, tidak dicampur dengan unggah berkas)
router.post("/", controller.createPegawai);

// 4. Get Detail Pegawai berdasarkan ID
router.get("/:id", controller.getPegawaiById);

// 5. Update Data Pegawai berdasarkan ID
router.put("/:id", controller.updatePegawai);

// 6. Soft Delete Pegawai berdasarkan ID
router.delete("/:id", controller.deletePegawai);

export default router;
