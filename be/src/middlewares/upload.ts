import multer from "multer";
import { AppError } from "../utils/appError";

export const uploadExcel = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel", // .xls
    ];
    if (!allowed.includes(file.mimetype)) {
      return cb(new AppError("File harus berformat .xlsx atau .xls", 400));
    }
    cb(null, true);
  },
});
