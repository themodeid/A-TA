import { Router } from "express";
// import absensiRoutes from "../modules/absensi/absensi.route";
import pegawaiRoutes from "../modules/pegawai/pegawai.routes";
import jabatanRoutes from "../modules/jabatan/jabatan.routes";
const router = Router();

// router.use("/absensi", absensiRoutes);
router.use("/pegawai", pegawaiRoutes);
router.use("/jabatan", jabatanRoutes);

export default router;
