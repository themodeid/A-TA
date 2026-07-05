import multer from "multer";
import path from "path";

export const uploadExcel = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "application/octet-stream",
      "application/vnd.ms-excel.sheet.macroEnabled.12",
      "application/vnd.ms-excel.addin.macroEnabled.12",
      "application/vnd.ms-excel.sheet.binary.macroEnabled.12",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.template",
    ];

    const ext = path.extname(file.originalname).toLowerCase();
    const isAllowedExt =
      ext === ".xlsx" ||
      ext === ".xls" ||
      ext === ".xlsm" ||
      ext === ".xlsb" ||
      ext === ".xltx";
    const isAllowedMime = allowedMimeTypes.includes(file.mimetype);

    if (isAllowedExt || isAllowedMime) {
      return cb(null, true);
    }

    return cb(new Error("File harus berformat .xlsx atau .xls"));
  },
});
