// Custom error classes — pesan ditulis dalam Bahasa Indonesia santai untuk ditampilkan ke user.
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export class BadRequestError extends HttpError {
  constructor(message = 'Permintaannya kurang lengkap nih', errors?: Record<string, string[]>) {
    super(400, message, errors);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = 'Kamu harus login dulu ya') {
    super(401, message);
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = 'Maaf, kamu tidak punya akses ke sini') {
    super(403, message);
  }
}

export class NotFoundError extends HttpError {
  constructor(message = 'Yang kamu cari tidak ditemukan') {
    super(404, message);
  }
}

export class ConflictError extends HttpError {
  constructor(message = 'Datanya sudah ada') {
    super(409, message);
  }
}

export class TooManyRequestsError extends HttpError {
  constructor(message = 'Sabar dulu ya, terlalu banyak percobaan') {
    super(429, message);
  }
}
