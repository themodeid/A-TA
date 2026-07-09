import { Router } from "express";
import absensiRoutes from "../modules/absensi/absensi.route";
import pegawaiRoutes from "../modules/pegawai/pegawai.routes";
import jabatanRoutes from "../modules/jabatan/jabatan.routes";
// import authRoutes from "../modules/auth/auth.routes";
import golonganRoutes from "../modules/golongan/golongan.routes";
import konfigurasiRoutes from "../modules/konfigurasi/konfigurasi.routes";

const router = Router();

router.use("/absensi", absensiRoutes);
router.use("/pegawai", pegawaiRoutes);
router.use("/jabatan", jabatanRoutes);
router.use("/golongan", golonganRoutes);
router.use("/konfigurasi", konfigurasiRoutes);

export default router;
