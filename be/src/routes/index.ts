import { Router } from "express";

// Modules: Core / Common
import absensiRoutes from "../modules/absensi/absensi.routes";

// Modules: Master Data
import pegawaiRoutes from "../modules/master-data/pegawai/pegawai.routes";
import jabatanRoutes from "../modules/master-data/jabatan/jabatan.routes";
import golonganRoutes from "../modules/master-data/golongan/golongan.routes";

// Modules: Payroll
import konfigurasiRoutes from "../modules/payroll/konfigurasi/konfigurasi.routes";
import gajiRoutes from "../modules/payroll/gaji/gaji.routes";
import potonganRoutes from "../modules/payroll/potongan/potongan_bulanan/potongan.routes";
import tunjanganRoutes from "../modules/payroll/tunjangan/tunjangan.routes";
import tunjanganBulananRoutes from "../modules/payroll/tunjangan-bulanan/tunjangan-bulanan.routes";
import periodeRoutes from "../modules/payroll/periode/periode.routes";
import potonganMasterRoutes from "../modules/payroll/potongan/potongan_master/master-potongan.routes";

const router = Router();

// 1. Core & Absensi Routes
router.use("/absensi", absensiRoutes);

// 2. Master Data Routes
router.use("/master/pegawai", pegawaiRoutes);
router.use("/master/jabatan", jabatanRoutes);
router.use("/master/golongan", golonganRoutes);

// 3. Payroll Routes
router.use("/payroll/konfigurasi", konfigurasiRoutes);
router.use("/payroll/gaji", gajiRoutes);
router.use("/payroll/potongan", potonganRoutes);
router.use("/payroll/potongan-master", potonganMasterRoutes);
router.use("/payroll/tunjangan", tunjanganRoutes);
router.use("/payroll/tunjangan-bulanan", tunjanganBulananRoutes);
router.use("/payroll/periode", periodeRoutes);

export default router;
