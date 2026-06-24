import { Router } from "express";
// import absensiRoutes from "../modules/absensi/absensi.route";
import pegawaiRoutes from "../modules/pegawai/pegawai.routes";

const router = Router();

// router.use("/absensi", absensiRoutes);
router.use("/pegawai", pegawaiRoutes);

export default router;
