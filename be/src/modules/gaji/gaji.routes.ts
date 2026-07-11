import { Router } from "express";
import { RekapGajiController } from "./gaji.controller";
// import { requireRole } from '../middlewares/auth.middleware'; // Contoh jika kamu punya middleware auth

const router = Router();
const rekapGajiController = new RekapGajiController();

/**
 * @route   POST /api/rekap-gaji/kalkulasi
 * @desc    Memicu kalkulasi komponen gaji pegawai dan menyimpannya ke snapshot rekap gaji
 * @access  Private (Admin & Staf Gaji)
 */
router.post("/rekap-gaji/kalkulasi", rekapGajiController.hitungGajiBulanan);

export default router;
