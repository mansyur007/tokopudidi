import Image from 'next/image';
import { classifyImageSrc } from '@tokopudidi/shared';

/**
 * Satu-satunya pintu render gambar di aplikasi ini (M12-D4).
 *
 * Kenapa bukan `next/image` langsung: `src` gambar di Tokopudidi datang dari
 * tiga tempat yang host-nya tidak kita kendalikan — data-URI hasil unggahan,
 * URL yang ditempel sendiri oleh seller/admin, dan hasil scrape Tokopedia.
 * `next/image` menolak host yang tidak terdaftar di `remotePatterns`: di dev ia
 * melempar dan menjatuhkan seluruh halaman, di produksi `/_next/image` menjawab
 * 400 sehingga gambarnya rusak. Komponen ini memilih jalur per-src:
 *
 * - host terdaftar  → `next/image`, dioptimasi seperti biasa
 * - data-URI        → `<img>` (next/image pun tidak mengoptimasi data-URI)
 * - host lain / path → `<img>`, tampil apa adanya tanpa optimasi
 * - src kosong/aneh → tidak merender apa pun; kotak latar milik pemanggil yang tampak
 *
 * Jalur `<img>` selalu memasang `loading="lazy"` + `decoding="async"` (kecuali
 * `priority`), yang justru paling terasa untuk data-URI base64 di daftar
 * panjang seperti chat, komplain, dan ulasan.
 */
export type SmartImageProps = {
  src: string | null | undefined;
  alt: string;
  /** Kelas untuk elemen gambarnya, mis. `object-cover`. */
  className?: string;
  /**
   * Mengisi penuh kontainer terdekat yang ber-`position: relative`, sama seperti
   * prop `fill` milik `next/image`. Jalur `<img>` menirunya dengan
   * `absolute inset-0 h-full w-full`.
   */
  fill?: boolean;
  /** Wajib diisi kalau `fill` — dipakai `next/image` untuk memilih lebar sumber. */
  sizes?: string;
  width?: number;
  height?: number;
  /** Matikan lazy-load, untuk gambar di atas lipatan (LCP). */
  priority?: boolean;
};

export function SmartImage({
  src,
  alt,
  className,
  fill,
  sizes,
  width,
  height,
  priority,
}: SmartImageProps) {
  const kind = classifyImageSrc(src);
  if (kind === 'empty') return null;

  const url = src!.trim();

  // `next/image` butuh dimensi: `fill`, atau width+height eksplisit. Sebagian
  // gambar di aplikasi ini memang tanpa dimensi tetap (preview KTP `max-h-40`,
  // QR, bukti transfer) — tidak ada angka jujur yang bisa dipasang di sana, jadi
  // biarkan lewat jalur <img> ketimbang mengarang width/height.
  const bisaOptimasi = kind === 'optimizable' && (fill || (width != null && height != null));

  if (bisaOptimasi) {
    return fill ? (
      <Image src={url} alt={alt} fill sizes={sizes} priority={priority} className={className} />
    ) : (
      <Image
        src={url}
        alt={alt}
        width={width!}
        height={height!}
        sizes={sizes}
        priority={priority}
        className={className}
      />
    );
  }

  // Satu-satunya <img> mentah yang disengaja di aplikasi ini; sisanya lewat sini.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      className={fill ? `absolute inset-0 h-full w-full ${className ?? ''}` : className}
    />
  );
}
