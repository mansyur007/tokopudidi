// Helper MailHog untuk e2e M14-A2.
//
// MailHog adalah SMTP palsu: API menerima email sungguhan lewat port 1025 dan
// menahannya di :8025. Suite memeriksa apa yang benar-benar keluar dari
// nodemailer — bukan memata-matai pemanggilan fungsi di dalam proses.
import type { APIRequestContext } from '@playwright/test';

export const MAILHOG_URL = process.env.E2E_MAILHOG_URL ?? 'http://localhost:8025';

export interface Mail {
  to: string[];
  subject: string;
  body: string;
}

/** Aktif hanya kalau MailHog benar-benar bisa dihubungi. */
export async function mailhogAda(request: APIRequestContext): Promise<boolean> {
  try {
    const res = await request.get(`${MAILHOG_URL}/api/v2/messages?limit=1`, { timeout: 3000 });
    return res.ok();
  } catch {
    return false;
  }
}

export async function bersihkanInbox(request: APIRequestContext): Promise<void> {
  await request.delete(`${MAILHOG_URL}/api/v1/messages`);
}

/**
 * Subject MIME bisa ter-encode (`=?UTF-8?Q?...?=`) begitu ada karakter non-ASCII.
 * Yang dipakai suite ini semuanya ASCII, tapi decoding ringan tetap dipasang
 * supaya test tidak diam-diam berhenti cocok saat kalimat subject diubah.
 */
function decodeSubject(raw: string): string {
  const m = /^=\?[^?]+\?[Qq]\?(.*)\?=$/.exec(raw.trim());
  if (!m) return raw;
  return m[1].replace(/_/g, ' ').replace(/=([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

/**
 * Badan email dikirim quoted-printable: baris dipotong di kolom 76 dengan
 * `=\r\n`. Tanpa membuang soft break itu, token panjang seperti nomor pesanan
 * bisa terbelah di tengah dan pencocokan gagal karena alasan yang tidak ada
 * hubungannya dengan isinya.
 */
function decodeBody(raw: string): string {
  return raw
    .replace(/=\r?\n/g, '')
    .replace(/=([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

async function ambilSemua(request: APIRequestContext): Promise<Mail[]> {
  const res = await request.get(`${MAILHOG_URL}/api/v2/messages?limit=50`);
  if (!res.ok()) return [];
  const json = await res.json();
  return (json.items ?? []).map((it: Record<string, any>) => ({
    to: (it.Content?.Headers?.To ?? []) as string[],
    subject: decodeSubject((it.Content?.Headers?.Subject ?? [''])[0]),
    body: decodeBody(it.Content?.Body ?? ''),
  }));
}

/**
 * Tunggu satu email yang cocok. Polling, bukan sleep tetap: pengiriman email
 * fire-and-forget, jadi waktunya tidak terikat pada respons HTTP yang barusan
 * selesai — menunggu angka tetap akan flaky di dua arah sekaligus.
 */
export async function tungguEmail(
  request: APIRequestContext,
  cocok: (m: Mail) => boolean,
  timeoutMs = 15_000,
): Promise<Mail> {
  const batas = Date.now() + timeoutMs;
  let terakhir: Mail[] = [];
  while (Date.now() < batas) {
    terakhir = await ambilSemua(request);
    const hit = terakhir.find(cocok);
    if (hit) return hit;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(
    `Tidak ada email yang cocok dalam ${timeoutMs}ms. Inbox berisi ${terakhir.length}: ` +
      terakhir.map((m) => `[${m.to.join(',')}] ${m.subject}`).join(' | '),
  );
}

/** Pastikan TIDAK ada email yang cocok setelah jeda pendek. */
export async function pastikanTidakAdaEmail(
  request: APIRequestContext,
  cocok: (m: Mail) => boolean,
  tungguMs = 3000,
): Promise<void> {
  await new Promise((r) => setTimeout(r, tungguMs));
  const semua = await ambilSemua(request);
  const hit = semua.find(cocok);
  if (hit) throw new Error(`Ada email yang seharusnya tidak terkirim: ${hit.subject} → ${hit.to.join(',')}`);
}
