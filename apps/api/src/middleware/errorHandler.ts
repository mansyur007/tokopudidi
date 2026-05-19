import { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../lib/errors';
import { logger } from '../lib/logger';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  // Validasi Zod
  if (err instanceof ZodError) {
    const errors: Record<string, string[]> = {};
    for (const issue of err.errors) {
      const key = issue.path.join('.') || '_';
      if (!errors[key]) errors[key] = [];
      errors[key].push(issue.message);
    }
    return res.status(400).json({
      success: false,
      message: 'Datanya kurang valid nih',
      errors,
    });
  }

  if (err instanceof HttpError) {
    return res.status(err.status).json({
      success: false,
      message: err.message,
      ...(err.errors && { errors: err.errors }),
    });
  }

  logger.error({ err }, 'Unhandled error');
  return res.status(500).json({
    success: false,
    message: 'Yah, ada masalah di server. Coba lagi sebentar ya.',
  });
};
