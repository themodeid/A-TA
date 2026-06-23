import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";
import { AppError } from "../utils/appError";

export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error: any) {
      if (error.errors) {
        const errorMessages = error.errors.map(
          (err: any) => `${err.path.join(".")}: ${err.message}`,
        );

        // Create detailed validation error information
        const validationDetails = error.errors.map((err: any) => ({
          path: err.path.join("."),
          message: err.message,
          code: err.code,
          received: err.received,
          expected: err.expected,
        }));

        return next(
          new AppError(`Validation error: ${errorMessages.join(", ")}`, 400, {
            validationErrors: validationDetails,
          }),
        );
      }
      next(
        new AppError("Validation error", 400, { originalError: error.message }),
      );
    }
  };
};
