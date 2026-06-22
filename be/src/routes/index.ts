import { Router } from "express";
import absensiRoutes from "./absensi";

const router = Router();

router.use("/absensi", absensiRoutes);

export default router;
