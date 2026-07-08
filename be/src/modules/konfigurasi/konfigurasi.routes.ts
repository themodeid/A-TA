import { Router } from "express";
import * as controller from "./konfigurasi.controller";

const router = Router();

router.route("/").get(controller.getKonfigurasi); // Menampilkan daftar seluruh parameter settingan aplikasi

router.route("/:id").put(controller.updateKonfigurasi); // Mengubah nilai konstanta/rumus penggajian

export default router;
