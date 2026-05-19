// Klien fetch untuk API Tokopudidi.
// Dipanggil dari server component (SSR) maupun client component.
import type { ApiResponse } from '@tokopudidi/shared';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface ApiClientOptions extends RequestInit {
  token?: string;
}

export class ApiClientError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors?: Record<string, string[]>,
  ) {
    super(message);
  }
}

export async function apiFetch<T>(path: string, opts: ApiClientOptions = {}): Promise<T> {
  const { token, headers, ...rest } = opts;
  const res = await fetch(`${BASE}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...headers,
    },
    cache: 'no-store',
  });

  let body: ApiResponse<T>;
  try {
    body = (await res.json()) as ApiResponse<T>;
  } catch {
    throw new ApiClientError(res.status, 'Yah, server tidak merespons dengan benar');
  }

  if (!body.success) {
    throw new ApiClientError(res.status, body.message, body.errors);
  }
  return body.data;
}
