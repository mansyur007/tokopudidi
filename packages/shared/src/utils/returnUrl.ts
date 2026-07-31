/**
 * Validasi tujuan redirect setelah login (`?return=`).
 *
 * Nilainya datang dari URL — artinya dari siapa pun yang bisa mengirim tautan.
 * Tanpa penyaringan ini, `/masuk?return=https://situs-palsu/` menjadikan
 * halaman login kita batu loncatan phishing: user melihat domain kita,
 * memasukkan password, lalu dilempar ke domain lain.
 *
 * @returns path internal yang aman dipakai `router.push`, atau `null` kalau
 *          nilainya tidak ada / tidak layak dipercaya (pemanggil pakai default).
 */
export function safeReturnPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  // Harus path absolut internal.
  if (!raw.startsWith('/')) return null;
  // `//evil.com` dan `/\evil.com` dibaca browser sebagai URL protocol-relative,
  // jadi keduanya keluar dari domain kita meski diawali "/".
  if (raw.startsWith('//') || raw.startsWith('/\\')) return null;
  // Karakter kontrol (newline, tab, dll) dipakai untuk menyelundupkan skema
  // lewat parser yang longgar — path yang sah tidak pernah memuatnya.
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001F\u007F]/.test(raw)) return null;
  return raw;
}
