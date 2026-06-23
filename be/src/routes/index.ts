import { Router } from "express";
import absensiRoutes from "../modules/absensi/absensi.route";

const router = Router();

router.use("/absensi", absensiRoutes);

export default router;
