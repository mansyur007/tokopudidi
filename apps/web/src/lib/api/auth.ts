import { apiFetch } from './client';
import type { AuthTokens, UserPublic } from '@tokopudidi/shared';

export interface AuthResult {
  user: UserPublic;
  tokens: AuthTokens;
}

export function apiRegister(input: {
  phone: string;
  password: string;
  fullName: string;
  referralCode?: string;
}) {
  return apiFetch<AuthResult>('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function apiLogin(phone: string, password: string) {
  return apiFetch<AuthResult>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ phone, password }),
  });
}

export function apiSendOtp(phone: string, purpose: 'REGISTER' | 'LOGIN' | 'RESET_PASSWORD') {
  return apiFetch<null>('/api/v1/auth/otp/send', {
    method: 'POST',
    body: JSON.stringify({ phone, purpose }),
  });
}

export function apiVerifyOtp(phone: string, code: string, purpose: 'REGISTER' | 'LOGIN' | 'RESET_PASSWORD') {
  return apiFetch<{ verified: boolean }>('/api/v1/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify({ phone, code, purpose }),
  });
}

export function apiMe(token: string) {
  return apiFetch<UserPublic>('/api/v1/auth/me', { token });
}
