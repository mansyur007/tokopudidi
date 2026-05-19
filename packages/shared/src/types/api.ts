// Format respons API standar Tokopudidi.
export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserPublic {
  id: string;
  phone: string;
  email: string | null;
  fullName: string;
  role: 'BUYER' | 'SELLER' | 'ADMIN';
  isPhoneVerified: boolean;
  avatarUrl: string | null;
  referralCode: string;
}
