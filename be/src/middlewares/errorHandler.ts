import { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError";

const isDevelopment = process.env.NODE_ENV === "development";

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  console.error("Error occurred:", {
    message: err.message,
    name: err.name,
    stack: err.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  if (err instanceof AppError) {
    const errorResponse: any = {
      status: err.status,
      message: err.message,
      statusCode: err.statusCode,
    };

    // Include details if available (e.g., validation errors)
    if (err.details) {
      errorResponse.details = err.details;
    }

    // Add detailed information in development mode
    if (isDevelopment) {
      errorResponse.stack = err.stack;
      errorResponse.name = err.name;
      errorResponse.path = req.path;
      errorResponse.method = req.method;
      errorResponse.timestamp = new Date().toISOString();
    }

    return res.status(err.statusCode).json(errorResponse);
  }

  // Handle unexpected errors
  const errorResponse: any = {
    status: "error",
    message: isDevelopment
      ? err.message || "Internal server error"
      : "Internal server error",
    statusCode: 500,
  };

  // Add detailed information in development mode
  if (isDevelopment) {
    errorResponse.name = err.name;
    errorResponse.stack = err.stack;
    errorResponse.path = req.path;
    errorResponse.method = req.method;
    errorResponse.timestamp = new Date().toISOString();

    // Include additional error properties if available
    if ((err as any).code) {
      errorResponse.code = (err as any).code;
    }
    if ((err as any).keyValue) {
      errorResponse.keyValue = (err as any).keyValue;
    }
    if ((err as any).errors) {
      errorResponse.errors = (err as any).errors;
    }
  }

  return res.status(500).json(errorResponse);
};
