// M14-A2 — Email transaksional.
//
// Kontrak lapisan ini, dan alasannya:
//
// 1. **ENV kosong = log-only.** Dev tidak wajib menyalakan MailHog, dan
//    produksi yang belum punya kredensial tetap jalan normal — emailnya cuma
//    tercatat di pino. Tanpa mode ini, item ini tidak bisa di-deploy sebelum
//    akun penyedia email ada, padahal seluruh kodenya sudah siap.
// 2. **Tidak pernah melempar ke jalur request.** `sendMail` mengembalikan
//    `void`, bukan Promise yang bisa di-`await` pemanggilnya secara tidak
//    sengaja. Checkout tidak boleh gagal gara-gara SMTP mati.
// 3. **Selalu ada timeout.** Fire-and-forget tanpa timeout artinya SMTP yang
//    menggantung meninggalkan socket menumpuk sampai proses kehabisan handle;
//    kegagalan diam yang baru terasa berjam-jam kemudian.
import nodemailer, { type Transporter } from 'nodemailer';
import { logger } from './logger';

const log = logger.child({ mod: 'email' });

export type MailInput = { to: string; subject: string; html: string };

/**
 * Mode aktif dihitung sekali saat modul dimuat. `SMTP_HOST` kosong → log-only.
 * Sengaja hanya host yang jadi penentu: MailHog tidak butuh user/pass, jadi
 * mensyaratkan kredensial akan mematikan justru jalur yang dipakai dev.
 */
const HOST = process.env.SMTP_HOST?.trim() ?? '';
const FROM = process.env.EMAIL_FROM?.trim() || 'Tokopudidi <no-reply@toko.emha.space>';
export const emailEnabled = HOST.length > 0;

let transporter: Transporter | null = null;

function getTransport(): Transporter {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT ?? 587);
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS;
    transporter = nodemailer.createTransport({
      host: HOST,
      port,
      // 465 = SMTPS implisit; sisanya STARTTLS kalau server menawarkan.
      secure: port === 465,
      // MailHog & relay lokal tidak pakai auth sama sekali — mengirim objek
      // auth berisi undefined membuat nodemailer tetap mencoba AUTH lalu gagal.
      auth: user ? { user, pass } : undefined,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
  }
  return transporter;
}

/**
 * Kirim email tanpa menahan jalur respons. Sengaja `void`: pemanggil tidak
 * bisa meng-`await` dan karenanya tidak bisa membuat checkout menunggu SMTP.
 * Semua kegagalan berhenti di sini dan menjadi baris log, bukan exception.
 */
export function sendMail(input: MailInput): void {
  if (!input.to) return; // user tanpa email — bukan error, memang tidak ada tujuan.

  if (!emailEnabled) {
    log.info({ to: input.to, subject: input.subject }, 'email (log-only, SMTP_HOST kosong)');
    return;
  }

  getTransport()
    .sendMail({ from: FROM, to: input.to, subject: input.subject, html: input.html })
    .then((info) => {
      log.info({ to: input.to, subject: input.subject, messageId: info.messageId }, 'email terkirim');
    })
    .catch((err) => {
      // Titik ini adalah alasan seluruh modul ini fire-and-forget: SMTP mati
      // tidak boleh terlihat oleh pembeli yang sedang checkout.
      log.error({ err, to: input.to, subject: input.subject }, 'email gagal dikirim');
    });
}

/** Hanya untuk test — buang transport yang sudah ter-cache. */
export function __resetTransportForTest(): void {
  transporter = null;
}
