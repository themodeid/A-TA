import { Router } from "express";
import * as controller from "./pegawai.controller";
// import { uploadExcel } from "../../middlewares/upload"; // Buka jika rute import Excel sudah siap

const router = Router();

// Endpoint dasar pegawai
router
  .route("/")
  .get(controller.getAllMasterPegawai) // Get All Pegawai
  .post(controller.createPegawai); // Create Single Pegawai (Raw JSON)

// Endpoint pegawai spesifik berdasarkan ID
router
  .route("/:id")
  .get(controller.getMasterPegawai) // Get All Pegawai
  .get(controller.getPegawaiById) // Get Detail Pegawai
  .put(controller.updatePegawai) // Update Data Pegawai
  .delete(controller.deletePegawai); // Soft Delete Pegawai

export default router;
