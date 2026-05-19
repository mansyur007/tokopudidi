import jwt, { SignOptions } from 'jsonwebtoken';
import { randomBytes } from 'crypto';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret';
const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES ?? '15m';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES ?? '7d';

export interface JwtPayload {
  sub: string;       // user id
  role: 'BUYER' | 'SELLER' | 'ADMIN';
}

// jti = unique token ID. Tanpa ini, dua token yang dibuat dalam 1 detik untuk
// user yang sama akan identik (iat/exp di JWT punya resolusi detik) dan kena
// unique constraint di tabel RefreshToken.
function jti(): string {
  return randomBytes(8).toString('hex');
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign({ ...payload, jti: jti() }, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES } as SignOptions);
}

export function signRefreshToken(payload: JwtPayload): string {
  return jwt.sign({ ...payload, jti: jti() }, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES } as SignOptions);
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, ACCESS_SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, REFRESH_SECRET) as JwtPayload;
}
