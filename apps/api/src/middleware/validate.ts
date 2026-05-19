import { RequestHandler } from 'express';
import { ZodSchema } from 'zod';

// Validasi body dengan Zod schema. Gagal → di-handle oleh errorHandler.
export const validateBody = <T>(schema: ZodSchema<T>): RequestHandler => {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) return next(result.error);
    req.body = result.data;
    next();
  };
};
