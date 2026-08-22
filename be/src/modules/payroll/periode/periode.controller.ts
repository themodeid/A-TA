import { Request, Response, NextFunction } from "express";
import * as periodeService from "./periode.service";

/**
 * GET /api/periode/:id/readiness
 * Cek kelengkapan data absensi, tunjangan, dan potongan sebelum diajukan approval
 */
export const getReadiness = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsedId = parseInt(req.params.id as string, 10);
    if (isNaN(parsedId)) {
      res.status(400).json({
        status: "fail",
        message: "ID Periode harus berupa angka yang valid.",
      });
      return;
    }

    const readiness = await periodeService.checkPeriodeReadiness(parsedId);

    res.status(200).json({
      status: "success",
      message: "Berhasil memeriksa kesiapan data periode.",
      data: readiness,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/periode/:id/submit-approval
 * Mengajukan periode dari 'Pengisian Absensi'/'Ditolak' -> 'Menunggu Approval'
 */
export const submitApproval = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsedId = parseInt(req.params.id as string, 10);
    if (isNaN(parsedId)) {
      res.status(400).json({
        status: "fail",
        message: "ID Periode harus berupa angka yang valid.",
      });
      return;
    }

    const result = await periodeService.submitApprovalPeriode(parsedId);

    res.status(200).json({
      status: "success",
      message: "Periode berhasil diajukan untuk approval.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/periode/:id/approve
 * Menyetujui periode (Status -> 'Disetujui' & Insert Log Audit)
 */
export const approve = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsedId = parseInt(req.params.id as string, 10);
    if (isNaN(parsedId)) {
      res.status(400).json({
        status: "fail",
        message: "ID Periode harus berupa angka yang valid.",
      });
      return;
    }

    // Cukup ambil catatan dari req.body
    const { catatan } = req.body;

    const result = await periodeService.approvePeriode(parsedId, {
      catatan,
    });

    res.status(200).json({
      status: "success",
      message: "Periode berhasil disetujui (Approved).",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/periode/:id/reject
 * Menolak periode (Status -> 'Ditolak' & Insert Log Audit)
 */
export const reject = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsedId = parseInt(req.params.id as string, 10);
    if (isNaN(parsedId)) {
      res.status(400).json({
        status: "fail",
        message: "ID Periode harus berupa angka yang valid.",
      });
      return;
    }

    const { catatan } = req.body;
    const approver_id = (req as any).user?.id_pengguna || req.body.approver_id;

    if (!approver_id) {
      res.status(400).json({
        status: "fail",
        message: "Approver ID wajib disertakan.",
      });
      return;
    }

    const result = await periodeService.rejectPeriode(parsedId, {
      catatan,
    });

    res.status(200).json({
      status: "success",
      message: "Periode berhasil ditolak (Rejected).",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/periode/:id/auto-init
 * Inisialisasi otomatis semua data transaksi (Absensi, Tunjangan, Potongan)
 */
export const autoInit = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsedId = parseInt(req.params.id as string, 10);
    if (isNaN(parsedId)) {
      res.status(400).json({
        status: "fail",
        message: "ID Periode harus berupa angka yang valid.",
      });
      return;
    }

    const { default_absensi, copy_potongan_from_periode_id } = req.body;

    const result = await periodeService.initializeAllPeriodeData(parsedId, {
      defaultAbsensi: default_absensi !== false,
      copyPotonganFromPeriodeId: copy_potongan_from_periode_id
        ? parseInt(copy_potongan_from_periode_id, 10)
        : undefined,
    });

    res.status(200).json({
      status: "success",
      message: "Berhasil menginisialisasi seluruh data transaksi periode.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/periode
 * Membuka periode baru
 */
export const createPeriode = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      bulan_gaji,
      tanggal_awal,
      tanggal_akhir,
      auto_init,
      copy_potongan_from_periode_id,
    } = req.body;

    if (!bulan_gaji || !tanggal_awal || !tanggal_akhir) {
      res.status(400).json({
        status: "fail",
        message:
          "Data bulan_gaji, tanggal_awal, dan tanggal_akhir wajib diisi.",
      });
      return;
    }

    const newPeriode = await periodeService.createPeriode({
      bulan_gaji,
      tanggal_awal,
      tanggal_akhir,
      auto_init: auto_init === true || auto_init === "true",
      copy_potongan_from_periode_id: copy_potongan_from_periode_id
        ? parseInt(copy_potongan_from_periode_id, 10)
        : undefined,
    });

    res.status(201).json({
      status: "success",
      message: "Berhasil membuka periode baru.",
      data: newPeriode,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/periode
 * Mengambil semua periode aktif
 */
export const getAllPeriode = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const periodeData = await periodeService.getAllPeriode();

    res.status(200).json({
      status: "success",
      message: "Berhasil mengambil data semua periode rekap gaji.",
      count: periodeData.length,
      data: periodeData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/periode/:id
 * Detail satu periode
 */
export const getPeriodeById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsedId = parseInt(req.params.id as string, 10);

    if (isNaN(parsedId)) {
      res.status(400).json({
        status: "fail",
        message: "ID Periode harus berupa angka yang valid.",
      });
      return;
    }

    const data = await periodeService.getPeriodeById(parsedId);

    res.status(200).json({
      status: "success",
      message: "Berhasil mengambil detail periode.",
      data,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("tidak ditemukan")) {
      res.status(404).json({ status: "fail", message: error.message });
      return;
    }
    next(error);
  }
};

/**
 * PATCH /api/periode/:id
 * Update data periode
 */
export const updatePeriode = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsedId = parseInt(req.params.id as string, 10);

    if (isNaN(parsedId)) {
      res.status(400).json({
        status: "fail",
        message: "ID Periode harus berupa angka yang valid.",
      });
      return;
    }

    const { bulan_gaji, tanggal_awal, tanggal_akhir, status } = req.body;

    const updatedPeriode = await periodeService.updatePeriode(parsedId, {
      bulan_gaji,
      tanggal_awal,
      tanggal_akhir,
      status,
    });

    res.status(200).json({
      status: "success",
      message: "Berhasil memperbarui data periode.",
      data: updatedPeriode,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("tidak ditemukan")) {
      res.status(404).json({ status: "fail", message: error.message });
      return;
    }
    if (
      error instanceof Error &&
      error.message.includes("Tidak ada data baru")
    ) {
      res.status(400).json({ status: "fail", message: error.message });
      return;
    }
    next(error);
  }
};

/**
 * DELETE /api/periode/:id
 * Soft delete periode
 */
export const deletePeriode = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsedId = parseInt(req.params.id as string, 10);

    if (isNaN(parsedId)) {
      res.status(400).json({
        status: "fail",
        message: "ID Periode harus berupa angka yang valid.",
      });
      return;
    }

    const deletedData = await periodeService.deletePeriode(parsedId);

    res.status(200).json({
      status: "success",
      message: "Berhasil menghapus (soft-delete) periode.",
      data: deletedData,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("tidak ditemukan")) {
      res.status(404).json({ status: "fail", message: error.message });
      return;
    }
    next(error);
  }
};

/**
 * GET /api/periode/:id/rekap
 * Historical snapshot rekap gaji per periode
 */
export const getRekapByPeriode = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsedId = parseInt(req.params.id as string, 10);

    if (isNaN(parsedId)) {
      res.status(400).json({
        status: "fail",
        message: "ID Periode harus berupa angka yang valid.",
      });
      return;
    }

    const rekapData = await periodeService.getPeriodeById(parsedId);

    if (!rekapData) {
      res.status(404).json({
        status: "success",
        message: `Data rekap gaji untuk periode ID ${parsedId} tidak ditemukan atau masih kosong.`,
        data: [],
      });
      return;
    }

    res.status(200).json({
      status: "success",
      message: "Berhasil mengambil data historical snapshot rekap gaji.",
      data: rekapData,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("tidak ditemukan")) {
      res
        .status(404)
        .json({ status: "success", message: error.message, data: [] });
      return;
    }
    next(error);
  }
};
