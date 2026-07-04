import { RequestHandler } from 'express';
import { verifyAccessToken } from '../lib/jwt';

// Sama seperti requireAuth tapi tidak menolak request tanpa/ dengan token invalid —
// dipakai di endpoint yang mendukung guest (mis. recently viewed).
export const optionalAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      req.user = verifyAccessToken(header.slice(7));
    } catch {
      // token invalid/expired — perlakukan sebagai guest, jangan block.
    }
  }
  next();
};
