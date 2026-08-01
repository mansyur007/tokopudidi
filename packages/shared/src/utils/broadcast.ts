// Jeda antar-broadcast toko (M13-B2).
//
// Aturannya hidup di sini, bukan di route, karena dipakai dua pihak yang harus
// sepakat: API menolak 429 dan FE mematikan tombol + menampilkan sisa waktu.
// Kalau angkanya ditulis dua kali, tombolnya akan menyala lebih dulu daripada
// API mau menerima — seller mengetik pengumuman lengkap lalu ditolak.
//
// Sumber kebenarannya tetap DB (`ShopBroadcast.sentAt` terakhir): FE hanya
// meniru hitungan yang sama supaya tampilannya jujur, bukan menggantikannya.

export const BROADCAST_COOLDOWN_HOURS = 24;
export const BROADCAST_COOLDOWN_MS = BROADCAST_COOLDOWN_HOURS * 60 * 60 * 1000;

/**
 * Sisa jeda dalam milidetik. 0 berarti boleh kirim sekarang.
 *
 * `lastSentAt` null/undefined = toko belum pernah broadcast → 0.
 * Tanggal tak valid juga dianggap 0: menolak kirim karena baris riwayat rusak
 * akan mengunci seller selamanya tanpa jalan keluar dari UI.
 */
export function broadcastCooldownRemainingMs(
  lastSentAt: Date | string | null | undefined,
  now: Date = new Date(),
): number {
  if (!lastSentAt) return 0;
  const sent = lastSentAt instanceof Date ? lastSentAt : new Date(lastSentAt);
  const sentMs = sent.getTime();
  if (!Number.isFinite(sentMs)) return 0;
  // Selisih negatif (sentAt di masa depan karena jam server bergeser) tetap
  // menghasilkan sisa waktu — jangan diamkan; itu justru kasus yang perlu jeda.
  const remaining = sentMs + BROADCAST_COOLDOWN_MS - now.getTime();
  return remaining > 0 ? remaining : 0;
}

export function canBroadcastNow(
  lastSentAt: Date | string | null | undefined,
  now: Date = new Date(),
): boolean {
  return broadcastCooldownRemainingMs(lastSentAt, now) === 0;
}

/**
 * Sisa waktu untuk dibaca manusia: "3 jam 12 menit", "8 menit", "kurang dari 1 menit".
 * Dipakai di pesan error 429 dan di tombol FE — satu kalimat, satu sumber.
 */
export function formatCooldownRemaining(ms: number): string {
  if (ms <= 0) return 'sekarang';
  const totalMenit = Math.ceil(ms / 60_000);
  if (totalMenit < 1) return 'kurang dari 1 menit';
  const jam = Math.floor(totalMenit / 60);
  const menit = totalMenit % 60;
  if (jam === 0) return `${menit} menit`;
  if (menit === 0) return `${jam} jam`;
  return `${jam} jam ${menit} menit`;
}
