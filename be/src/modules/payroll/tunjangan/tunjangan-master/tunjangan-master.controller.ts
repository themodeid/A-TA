import { Request, Response, NextFunction } from "express";
import * as TunjanganMasterService from "./tunjangan-master.service";

/**
 * GET /api/tunjangan-master
 */
export const getAll = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = await TunjanganMasterService.getAllMaster();
    res.status(200).json({
      status: "success",
      message: "Berhasil mengambil data master tunjangan",
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/tunjangan-master/:id
 */
export const getById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res
        .status(400)
        .json({ status: "error", message: "ID harus berupa angka" });
    }

    const data = await TunjanganMasterService.getMasterById(id);
    res.status(200).json({
      status: "success",
      message: "Berhasil mengambil detail master tunjangan",
      data,
    });
  } catch (error: any) {
    if (error.message.startsWith("NOT_FOUND")) {
      return res
        .status(404)
        .json({ status: "error", message: error.message.split(": ")[1] });
    }
    next(error);
  }
};

/**
 * POST /api/tunjangan-master
 */
export const create = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = await TunjanganMasterService.createMaster(req.body);
    res.status(201).json({
      status: "success",
      message: "Berhasil menambahkan master tunjangan baru",
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/tunjangan-master/:id
 */
export const update = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res
        .status(400)
        .json({ status: "error", message: "ID harus berupa angka" });
    }

    const data = await TunjanganMasterService.updateMaster(id, req.body);
    res.status(200).json({
      status: "success",
      message: "Berhasil memperbarui master tunjangan",
      data,
    });
  } catch (error: any) {
    if (error.message.startsWith("NOT_FOUND")) {
      return res
        .status(404)
        .json({ status: "error", message: error.message.split(": ")[1] });
    }
    next(error);
  }
};

/**
 * DELETE /api/tunjangan-master/:id
 */
export const remove = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res
        .status(400)
        .json({ status: "error", message: "ID harus berupa angka" });
    }

    await TunjanganMasterService.deleteMaster(id);
    res.status(200).json({
      status: "success",
      message: "Berhasil menghapus master tunjangan",
    });
  } catch (error: any) {
    if (error.message.startsWith("NOT_FOUND")) {
      return res
        .status(404)
        .json({ status: "error", message: error.message.split(": ")[1] });
    }
    next(error);
  }
};
