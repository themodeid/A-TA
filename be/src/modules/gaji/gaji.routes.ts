import { Router } from "express";
import * as rekapController from "./gaji.controller";

const router = Router();

router.post("/hitung", rekapController.hitungGajiBulanan);
router.get("/", rekapController.getAllRekapGaji); // Ambil semua data rekap semua pegawai
router.post("/", rekapController.createRekapGaji); // Insert / Upsert Rekap Gaji beserta detailnya
router.get("/periode/list", rekapController.getAllPeriode);
router.get("/:idPeriode", rekapController.getRekapByPeriode); // Ambil rekap per periode
router.get("/pegawai/:idPegawai", rekapController.getRekapByPegawai); // Ambil rekap individu/per pegawai
router.delete("/:idRekap", rekapController.deleteRekapGaji); // Hapus rekap spesifik beserta detailnya

export default router;
