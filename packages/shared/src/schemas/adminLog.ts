import { z } from 'zod';

// Jejak audit aksi tulis admin (M12-C3).
//
// Daftar aksi hidup di sini, bukan sebagai enum Prisma, karena dipakai tiga
// tempat sekaligus: helper `logAdmin` di API (memvalidasi nama aksi), dropdown
// filter di halaman viewer, dan test. Sebagai String di DB, menambah aksi baru
// tidak butuh migration.

export const ADMIN_ACTIONS = [
  // Moderasi user
  'SUSPEND_USER',
  'UNSUSPEND_USER',
  // Moderasi toko
  'VERIFY_KTP',
  'TOGGLE_OFFICIAL_STORE',
  'SUSPEND_SHOP',
  'UNSUSPEND_SHOP',
  // Moderasi produk
  'TAKEDOWN_PRODUCT',
  'RESTORE_PRODUCT',
  // Sengketa
  'RESOLVE_REFUND',
  'RESOLVE_REPORT',
  'DECIDE_COMPLAINT',
  // Voucher platform
  'CREATE_VOUCHER',
  'UPDATE_VOUCHER',
  'DELETE_VOUCHER',
  // Banner
  'CREATE_BANNER',
  'UPDATE_BANNER',
  'DELETE_BANNER',
  // Kategori
  'CREATE_CATEGORY',
  'UPDATE_CATEGORY',
  'DELETE_CATEGORY',
  // Alat admin. Tidak menulis data kita, tapi menjalankan headless browser ke
  // pihak ketiga atas nama platform — justru jenis aksi yang audit log ada
  // untuknya ("siapa yang menghajar Tokopedia jam 3 pagi").
  'SCRAPE_TOKOPEDIA',
] as const;

export type AdminAction = (typeof ADMIN_ACTIONS)[number];

export const ADMIN_ACTION_LABEL: Record<AdminAction, string> = {
  SUSPEND_USER: 'Nonaktifkan user',
  UNSUSPEND_USER: 'Aktifkan user',
  VERIFY_KTP: 'Verifikasi KTP',
  TOGGLE_OFFICIAL_STORE: 'Ubah status official store',
  SUSPEND_SHOP: 'Nonaktifkan toko',
  UNSUSPEND_SHOP: 'Aktifkan toko',
  TAKEDOWN_PRODUCT: 'Turunkan produk',
  RESTORE_PRODUCT: 'Kembalikan produk',
  RESOLVE_REFUND: 'Putuskan refund',
  RESOLVE_REPORT: 'Tindak lanjuti laporan',
  DECIDE_COMPLAINT: 'Putuskan komplain',
  CREATE_VOUCHER: 'Buat voucher',
  UPDATE_VOUCHER: 'Ubah voucher',
  DELETE_VOUCHER: 'Hapus voucher',
  CREATE_BANNER: 'Buat banner',
  UPDATE_BANNER: 'Ubah banner',
  DELETE_BANNER: 'Hapus banner',
  CREATE_CATEGORY: 'Buat kategori',
  UPDATE_CATEGORY: 'Ubah kategori',
  DELETE_CATEGORY: 'Hapus kategori',
  SCRAPE_TOKOPEDIA: 'Scrape Tokopedia',
};

/** Jenis sasaran aksi — dipakai untuk mengelompokkan & menautkan di viewer. */
export const ADMIN_TARGET_TYPES = [
  'USER',
  'SHOP',
  'PRODUCT',
  'REFUND',
  'REPORT',
  'COMPLAINT',
  'VOUCHER',
  'BANNER',
  'CATEGORY',
] as const;
export type AdminTargetType = (typeof ADMIN_TARGET_TYPES)[number];

export const adminActionSchema = z.enum(ADMIN_ACTIONS);

/** Query viewer. Tidak ada schema tulis — tabelnya append-only lewat helper. */
export const adminLogQuerySchema = z.object({
  adminId: z.string().uuid().optional(),
  action: adminActionSchema.optional(),
  targetType: z.enum(ADMIN_TARGET_TYPES).optional(),
  targetId: z.string().optional(),
  /** ISO date, inklusif. */
  from: z.string().optional(),
  /** ISO date, inklusif — sisi server memajukannya ke akhir hari. */
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});
export type AdminLogQuery = z.infer<typeof adminLogQuerySchema>;

// ===== Redaksi payload =====

/** Panjang maksimum satu nilai string di payload sebelum dipotong. */
export const PAYLOAD_MAX_STRING = 300;
/** Kedalaman objek maksimum yang ditelusuri. */
const MAX_DEPTH = 4;

function bytesOf(s: string): string {
  const kb = s.length / 1024;
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)}MB` : `${Math.round(kb)}KB`;
}

/**
 * Bersihkan `req.body` sebelum masuk kolom `payload`.
 *
 * Ini bukan kerapian, ini kebutuhan: `bannerCreateSchema.imageUrl` hanya
 * `z.string().min(5)` dan halaman admin/banner mengunggah lewat
 * `FileReader.readAsDataURL`, jadi mencatat body apa adanya menaruh base64
 * megabyte-an ke setiap baris log — tabel audit yang mestinya murah jadi yang
 * terbesar di database.
 *
 * Aturannya:
 * - data-URI diganti penanda berisi mime + ukuran, isinya dibuang
 * - string lain di atas `PAYLOAD_MAX_STRING` dipotong dengan penanda
 * - array dipangkas ke 20 elemen pertama
 * - kedalaman dibatasi; lebih dalam dari itu diganti penanda
 */
export function redactAdminPayload(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return null;

  if (typeof value === 'string') {
    const m = /^data:([a-z0-9.+/-]+)?[;,]/i.exec(value);
    if (m) return `[data-URI ${m[1] ?? 'tanpa-mime'}, ${bytesOf(value)} dibuang]`;
    if (value.length > PAYLOAD_MAX_STRING) {
      return `${value.slice(0, PAYLOAD_MAX_STRING)}… [dipotong dari ${value.length} karakter]`;
    }
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') return value;

  if (depth >= MAX_DEPTH) return '[terlalu dalam]';

  if (Array.isArray(value)) {
    const kept = value.slice(0, 20).map((v) => redactAdminPayload(v, depth + 1));
    if (value.length > 20) kept.push(`[+${value.length - 20} elemen lain]`);
    return kept;
  }

  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = redactAdminPayload(v, depth + 1);
    }
    return out;
  }

  // Fungsi, symbol, bigint — tidak pernah datang dari express.json, tapi jangan
  // sampai bikin JSON.stringify melempar kalau suatu saat datang.
  return String(value);
}
