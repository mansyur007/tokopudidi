import { prisma } from '@tokopudidi/database';
import {
  redactAdminPayload,
  type AdminAction,
  type AdminTargetType,
} from '@tokopudidi/shared';
import { logger } from './logger';

/**
 * Catat satu aksi tulis admin ke `AdminLog` (M12-C3).
 *
 * **Sengaja tidak async dan tidak untuk di-`await`.** Jejak audit tidak boleh
 * ikut menggagalkan aksi yang sudah berhasil: kalau tabel log penuh, indeksnya
 * rusak, atau koneksi habis, admin tetap harus bisa menurunkan produk. Karena
 * itu penulisannya dilepas dengan `.catch()` sendiri, dan kegagalannya jadi
 * baris `logger.error` — bukan exception yang naik ke jalur respons.
 *
 * Konsekuensi yang disadari: ada jendela sangat kecil di mana proses mati
 * sebelum write-nya selesai dan aksinya lolos tanpa tercatat. Untuk audit
 * moderasi marketplace ini pertukaran yang benar; kalau suatu saat butuh
 * jaminan atomik, log harus masuk ke `$transaction` yang sama dengan aksinya
 * dan kegagalannya ikut membatalkan aksi.
 *
 * Panggil **setelah** aksinya sukses, sebelum `return ok(...)`.
 */
export function logAdmin(
  adminId: string,
  action: AdminAction,
  opts?: {
    targetType?: AdminTargetType;
    targetId?: string;
    /** Biasanya `req.body`. Selalu dilewatkan `redactAdminPayload` dulu. */
    payload?: unknown;
    note?: string;
  },
): void {
  const payload = opts?.payload === undefined ? undefined : redactAdminPayload(opts.payload);

  void prisma.adminLog
    .create({
      data: {
        adminId,
        action,
        targetType: opts?.targetType,
        targetId: opts?.targetId,
        // `null` di kolom Json Prisma butuh bentuk eksplisit; `undefined` =
        // "jangan set", dan itu yang kita mau saat payload memang tidak ada.
        payload: payload === undefined ? undefined : (payload as object),
        note: opts?.note,
      },
    })
    .catch((err: unknown) => {
      logger.error(
        { err, action, adminId, targetType: opts?.targetType, targetId: opts?.targetId },
        'Gagal menulis AdminLog — aksi utamanya sendiri tetap sukses',
      );
    });
}
