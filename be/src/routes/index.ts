import { Router } from "express";

// ==========================================
// 1. MODULES: CORE & ABSENSI
// ==========================================
import absensiRoutes from "../modules/absensi/absensi.routes";

// dashboard
import dashboardRoutes from "../modules/dashboard/dashboard.routes";

// ==========================================
// 2. MODULES: MASTER DATA
// ==========================================
import pegawaiRoutes from "../modules/master-data/pegawai/pegawai.routes";
import jabatanRoutes from "../modules/master-data/jabatan/jabatan.routes";
import golonganRoutes from "../modules/master-data/golongan/golongan.routes";

// ==========================================
// 3. MODULES: PAYROLL
// ==========================================
import periodeRoutes from "../modules/payroll/periode/periode.routes";
import konfigurasiRoutes from "../modules/payroll/konfigurasi/konfigurasi.routes";
import gajiRoutes from "../modules/payroll/gaji_payroll/gaji.routes";

// Tunjangan
import tunjanganMasterRoutes from "../modules/payroll/tunjangan/tunjangan-master/tunjangan-master.routes";
import tunjanganBulananRoutes from "../modules/payroll/tunjangan/tunjangan-bulanan/tunjangan-bulanan.routes";

// Potongan
import potonganMasterRoutes from "../modules/payroll/potongan/potongan_master/master-potongan.routes";
import potonganBulananRoutes from "../modules/payroll/potongan/potongan_bulanan/potongan-bulanan.routes";

const router = Router();

// ------------------------------------------
// ROUTE REGISTRATION
// ------------------------------------------

// Core & Absensi
router.use("/absensi", absensiRoutes);

// dashboard
router.use("/dashboard", dashboardRoutes);

// Master Data
router.use("/master/pegawai", pegawaiRoutes);
router.use("/master/jabatan", jabatanRoutes);
router.use("/master/golongan", golonganRoutes);

// Payroll System
router.use("/payroll/periode", periodeRoutes);
router.use("/payroll/konfigurasi", konfigurasiRoutes);
router.use("/payroll/gaji", gajiRoutes);

// Payroll: Tunjangan
router.use("/payroll/tunjangan-master", tunjanganMasterRoutes);
router.use("/payroll/tunjangan-bulanan", tunjanganBulananRoutes);

// Payroll: Potongan
router.use("/payroll/potongan-master", potonganMasterRoutes);
router.use("/payroll/potongan-bulanan", potonganBulananRoutes);

export default router;
