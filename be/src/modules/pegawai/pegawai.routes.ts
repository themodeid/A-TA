import { Router } from "express";
import { uploadExcel } from "../../middlewares/upload";
import * as controller from "./pegawai.controller";

const router = Router();

// 1. Upload & Sync Data via Excel
router.post(
  "/upload",
  uploadExcel.single("file"),
  controller.syncMasterPegawai,
);

// 2. Get All Pegawai (Hanya data aktif / belum di-soft delete)
router.get("/", controller.getMasterPegawai);

// 3. Create Single Pegawai secara manual
router.post("/", controller.createPegawai);

// 4. Get Detail Pegawai berdasarkan ID
router.get("/:id", controller.getPegawaiById);

// 5. Update Data Pegawai berdasarkan ID
router.put("/:id", controller.updatePegawai);

// 6. Soft Delete Pegawai berdasarkan ID
router.delete("/:id", controller.deletePegawai);

export default router;
