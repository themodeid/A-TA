import { Request, Response, NextFunction } from "express";

export class AppError extends Error {
  statusCode: number;
  status: "fail" | "error";

  constructor(message: string, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.status = statusCode >= 400 && statusCode < 500 ? "fail" : "error";
    Error.captureStackTrace(this, this.constructor);
  }
}

export const globalErrorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (!(err instanceof AppError)) {
    console.error("💥 CRITICAL UNHANDLED ERROR:", err);
  }

  const error =
    err instanceof AppError ? err : new AppError("Internal Server Error", 500);

  res.status(error.statusCode).json({
    status: error.status,
    message: error.message,
  });
};

type AsyncFn = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;

export const catchAsync =
  (fn: AsyncFn) => (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);