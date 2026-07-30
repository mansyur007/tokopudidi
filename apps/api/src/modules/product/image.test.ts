// Unit test klasifikasi sumber gambar (M12-D4). Logic murni, tanpa DB —
// perilaku SmartImage sendiri diuji lewat e2e image.spec.ts.
import { describe, it, expect } from 'vitest';
import { classifyImageSrc, imageHost, ALLOWED_IMAGE_HOSTS } from '@tokopudidi/shared';

// Bentuk yang benar-benar tersimpan di DB untuk gambar hasil unggahan UI.
const DATA_URI = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==';

describe('imageHost', () => {
  it('mengambil hostname dan menormalkan ke huruf kecil', () => {
    expect(imageHost('https://Picsum.Photos/seed/a/600/600')).toBe('picsum.photos');
    expect(imageHost('http://example.com:8080/a.png')).toBe('example.com');
  });

  it('null untuk yang bukan URL absolut', () => {
    expect(imageHost('/uploads/a.png')).toBeNull();
    expect(imageHost('bukan url')).toBeNull();
  });
});

describe('classifyImageSrc', () => {
  it('kosong/null/undefined/spasi → empty', () => {
    expect(classifyImageSrc(null)).toBe('empty');
    expect(classifyImageSrc(undefined)).toBe('empty');
    expect(classifyImageSrc('')).toBe('empty');
    expect(classifyImageSrc('   ')).toBe('empty');
  });

  it('data-URI gambar → data', () => {
    expect(classifyImageSrc(DATA_URI)).toBe('data');
    expect(classifyImageSrc('data:image/jpeg;base64,abc')).toBe('data');
    expect(classifyImageSrc('data:image/svg+xml,%3Csvg/%3E')).toBe('data');
  });

  // Yang dihindari di sini: `data:text/html` bukan gambar, dan `javascript:`
  // tidak boleh pernah sampai ke atribut src.
  it('data-URI non-gambar & skema lain → empty', () => {
    expect(classifyImageSrc('data:text/html,<b>x</b>')).toBe('empty');
    expect(classifyImageSrc('javascript:alert(1)')).toBe('empty');
    expect(classifyImageSrc('ftp://a.test/x.png')).toBe('empty');
    // Tidak tertipu string yang cuma mengandung http di tengah.
    expect(classifyImageSrc('javascript:alert(1)//http://x')).toBe('empty');
  });

  it('host terdaftar → optimizable', () => {
    expect(classifyImageSrc('https://picsum.photos/seed/a/600/600')).toBe('optimizable');
    expect(classifyImageSrc('https://images.tokopedia.net/img/a.jpg')).toBe('optimizable');
  });

  it('perbandingan host tidak peduli huruf besar/kecil', () => {
    expect(classifyImageSrc('https://PICSUM.PHOTOS/seed/a/600/600')).toBe('optimizable');
  });

  // Inti perbaikan M12-D4: dulu src seperti ini dilempar ke next/image dan
  // membuat halaman 500 di dev / gambar 400 di produksi.
  it('host di luar daftar → passthrough, bukan optimizable', () => {
    expect(classifyImageSrc('https://cdn.tokosaya.com/logo.png')).toBe('passthrough');
    expect(classifyImageSrc('http://192.168.1.10/foto.jpg')).toBe('passthrough');
  });

  it('subdomain tidak ikut lolos hanya karena sufiks host cocok', () => {
    expect(classifyImageSrc('https://evil-picsum.photos/a.png')).toBe('passthrough');
    expect(classifyImageSrc('https://picsum.photos.attacker.test/a.png')).toBe('passthrough');
  });

  it('path lokal → passthrough', () => {
    expect(classifyImageSrc('/placeholder.png')).toBe('passthrough');
  });

  // next/image menolak URL protocol-relative; jangan sampai lolos sebagai path lokal.
  it('protocol-relative // → empty', () => {
    expect(classifyImageSrc('//cdn.tokosaya.com/logo.png')).toBe('empty');
  });

  it('allowlist bisa dioper sendiri (dipakai test & tooling)', () => {
    expect(classifyImageSrc('https://a.test/x.png', ['a.test'])).toBe('optimizable');
    expect(classifyImageSrc('https://picsum.photos/x.png', ['a.test'])).toBe('passthrough');
  });
});

describe('ALLOWED_IMAGE_HOSTS', () => {
  it('memuat host seed dan host scraper', () => {
    for (const h of ['picsum.photos', 'images.unsplash.com', 'placehold.co', 'images.tokopedia.net']) {
      expect(ALLOWED_IMAGE_HOSTS).toContain(h);
    }
  });

  // Wildcard mengubah /_next/image jadi proxy terbuka: siapa pun bisa menyuruh
  // server kita menarik URL sembarang. Allowlist harus tetap eksplisit.
  it('tidak memuat wildcard', () => {
    for (const h of ALLOWED_IMAGE_HOSTS) {
      expect(h).not.toContain('*');
    }
  });

  it('semuanya hostname murni, tanpa skema atau path', () => {
    for (const h of ALLOWED_IMAGE_HOSTS) {
      expect(h).toMatch(/^[a-z0-9.-]+$/);
    }
  });
});
