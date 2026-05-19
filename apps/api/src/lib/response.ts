import { Response } from 'express';

export function ok<T>(res: Response, data: T, message?: string) {
  return res.json({ success: true, data, ...(message && { message }) });
}

export function created<T>(res: Response, data: T, message?: string) {
  return res.status(201).json({ success: true, data, ...(message && { message }) });
}
