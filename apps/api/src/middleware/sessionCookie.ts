import { RequestHandler } from 'express';
import { randomUUID } from 'crypto';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      sessionKey?: string;
    }
  }
}

const COOKIE_NAME = 'tk_session';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// Pastikan setiap request punya session key stabil (guest tracking, mis. recently viewed).
export const sessionCookie: RequestHandler = (req, res, next) => {
  let key = req.cookies?.[COOKIE_NAME] as string | undefined;
  if (!key) {
    key = randomUUID();
    res.cookie(COOKIE_NAME, key, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: THIRTY_DAYS_MS,
    });
  }
  req.sessionKey = key;
  next();
};
