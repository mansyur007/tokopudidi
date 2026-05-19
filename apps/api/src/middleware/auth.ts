import { RequestHandler } from 'express';
import { UnauthorizedError, ForbiddenError } from '../lib/errors';
import { verifyAccessToken, JwtPayload } from '../lib/jwt';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new UnauthorizedError());
  }
  const token = header.slice(7);
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    next(new UnauthorizedError('Sesi kamu sudah habis, silakan login lagi'));
  }
};

export const requireRole = (...roles: Array<JwtPayload['role']>): RequestHandler => {
  return (req, _res, next) => {
    if (!req.user) return next(new UnauthorizedError());
    if (!roles.includes(req.user.role)) return next(new ForbiddenError());
    next();
  };
};
