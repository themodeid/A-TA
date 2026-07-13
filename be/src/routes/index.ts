import { Router } from "express";
import absensiRoutes from "../modules/absensi/absensi.route";
import pegawaiRoutes from "../modules/pegawai/pegawai.routes";
import jabatanRoutes from "../modules/jabatan/jabatan.routes";
// import authRoutes from "../modules/auth/auth.routes";
import golonganRoutes from "../modules/golongan/golongan.routes";
import konfigurasiRoutes from "../modules/konfigurasi/konfigurasi.routes";
import gajiRoutes from "../modules/gaji/gaji.routes";
import potonganRoutes from "../modules/potongan/potongan-routes";
import periodeRoutes from "../modules/periode/periode-routes";
import tunjanganRoutes from "../modules/tunjangan/tunjnagan.routes";

const router = Router();

router.use("/absensi", absensiRoutes);
router.use("/pegawai", pegawaiRoutes);
router.use("/jabatan", jabatanRoutes);
router.use("/golongan", golonganRoutes);
router.use("/konfigurasi", konfigurasiRoutes);
router.use("/gaji", gajiRoutes);
router.use("/potongan", potonganRoutes);
router.use("/periode", periodeRoutes);
router.use("/tunjangan", tunjanganRoutes);
export default router;
