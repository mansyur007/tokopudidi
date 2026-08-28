import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  escapeHtml,
  siteOrigin,
  orderCreatedEmail,
  orderPaidEmail,
  orderShippedEmail,
  complaintDecidedEmail,
  refundDecidedEmail,
  welcomeEmail,
} from './email.templates';

const ITEM = { name: 'Gula Pasir Gulaku 1kg', qty: 2, price: 18000 };

describe('escapeHtml', () => {
  it('menutup tag, atribut, dan kutip', () => {
    expect(escapeHtml('<img src=x onerror="alert(1)">')).toBe(
      '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;',
    );
    expect(escapeHtml("O'Brien & Co")).toBe('O&#39;Brien &amp; Co');
  });

  it('null/undefined jadi string kosong, bukan "null"', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  it('meng-escape & lebih dulu supaya entity tidak dobel', () => {
    // Kalau urutannya terbalik, "<" jadi "&amp;lt;" dan pembaca melihat teks
    // mentah "&lt;" di inbox-nya.
    expect(escapeHtml('<')).toBe('&lt;');
  });
});

describe('siteOrigin', () => {
  const asli = process.env.WEB_ORIGIN;
  afterEach(() => {
    if (asli === undefined) delete process.env.WEB_ORIGIN;
    else process.env.WEB_ORIGIN = asli;
  });

  it('memakai origin pertama kalau WEB_ORIGIN berisi beberapa', () => {
    process.env.WEB_ORIGIN = 'https://toko.emha.space,https://www.toko.emha.space';
    expect(siteOrigin()).toBe('https://toko.emha.space');
  });

  it('membuang trailing slash supaya tautan tidak jadi //pesanan', () => {
    process.env.WEB_ORIGIN = 'https://toko.emha.space/';
    expect(siteOrigin()).toBe('https://toko.emha.space');
  });

  it('kosong → localhost, bukan undefined di tengah URL', () => {
    delete process.env.WEB_ORIGIN;
    expect(siteOrigin()).toBe('http://localhost:3000');
  });
});

describe('template: pesanan dibuat', () => {
  const dasar = {
    orderNumber: 'TKP-20260828-12345',
    total: 41000,
    paymentMethod: 'TRANSFER_MANUAL',
    shopName: 'Toko Berkah',
    createdAt: new Date('2026-08-28T10:00:00Z'),
    items: [ITEM],
  };

  it('menyebut nomor pesanan di subject dan total di badan', () => {
    const { subject, html } = orderCreatedEmail(dasar);
    expect(subject).toContain('TKP-20260828-12345');
    expect(html).toContain('Rp 41.000');
    expect(html).toContain('Toko Berkah');
  });

  it('total baris item = harga × qty, bukan harga satuan', () => {
    const { html } = orderCreatedEmail(dasar);
    expect(html).toContain('Rp 36.000'); // 18.000 × 2
  });

  it('instruksi bayar mengikuti metode', () => {
    expect(orderCreatedEmail({ ...dasar, paymentMethod: 'COD' }).html).toContain('tunai ke kurir');
    expect(orderCreatedEmail({ ...dasar, paymentMethod: 'QRIS_MOCK' }).html).toContain('QRIS');
  });

  it('metode tak dikenal tetap memberi arahan, bukan "undefined"', () => {
    const { html } = orderCreatedEmail({ ...dasar, paymentMethod: 'KARTU_KREDIT' });
    expect(html).not.toContain('undefined');
    expect(html).toContain('instruksi pembayaran');
  });

  it('nama toko & produk di-escape', () => {
    const { html } = orderCreatedEmail({
      ...dasar,
      shopName: '<script>alert(1)</script>',
      items: [{ ...ITEM, name: '<b>Gula</b>' }],
    });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&lt;b&gt;Gula&lt;/b&gt;');
  });
});

describe('template: sisa event', () => {
  it('pesanan dibayar menyebut pembeli & nominal', () => {
    const { subject, html } = orderPaidEmail({
      orderNumber: 'TKP-1',
      total: 250000,
      buyerName: 'Budi',
      orderId: 'o1',
    });
    expect(subject).toContain('sudah dibayar');
    expect(html).toContain('Budi');
    expect(html).toContain('Rp 250.000');
    expect(html).toContain('/seller/pesanan/o1');
  });

  it('pesanan dikirim memuat kurir & resi', () => {
    const { html } = orderShippedEmail({
      orderNumber: 'TKP-1',
      courierName: 'JNE',
      trackingNumber: 'JP1234567',
      orderId: 'o1',
    });
    expect(html).toContain('JNE');
    expect(html).toContain('JP1234567');
  });

  it('komplain: menang & kalah memberi kalimat berbeda', () => {
    const menang = complaintDecidedEmail({ orderNumber: 'TKP-1', menang: true, orderId: 'o1' });
    const kalah = complaintDecidedEmail({ orderNumber: 'TKP-1', menang: false, orderId: 'o1' });
    expect(menang.html).toContain('diterima');
    expect(kalah.html).toContain('ditolak');
    expect(menang.html).not.toBe(kalah.html);
  });

  it('catatan admin di-escape dan boleh kosong', () => {
    const tanpa = complaintDecidedEmail({ orderNumber: 'TKP-1', menang: false, orderId: 'o1' });
    expect(tanpa.html).not.toContain('Catatan admin');

    const dengan = complaintDecidedEmail({
      orderNumber: 'TKP-1',
      menang: false,
      catatan: '<i>bukti kurang</i>',
      orderId: 'o1',
    });
    expect(dengan.html).toContain('&lt;i&gt;bukti kurang&lt;/i&gt;');
  });

  it('refund disetujui menyebut pengembalian dana; ditolak tidak', () => {
    const ya = refundDecidedEmail({ orderNumber: 'TKP-1', disetujui: true, orderId: 'o1' });
    const tidak = refundDecidedEmail({ orderNumber: 'TKP-1', disetujui: false, orderId: 'o1' });
    expect(ya.html).toContain('dikembalikan');
    expect(tidak.html).not.toContain('dikembalikan');
    expect(tidak.subject).toContain('ditolak');
  });

  it('welcome menyapa dengan nama yang di-escape', () => {
    const { subject, html } = welcomeEmail({ fullName: '<b>Budi</b>' });
    expect(subject).toContain('Selamat datang');
    expect(html).toContain('&lt;b&gt;Budi&lt;/b&gt;');
    expect(html).not.toContain('<b>Budi</b>');
  });
});

// Mode dihitung saat modul dimuat, jadi tiap kasus butuh modul yang segar —
// `vi.resetModules()` sebelum `import()`, bukan sekadar mengubah env.
describe('mode transport', () => {
  const asli = process.env.SMTP_HOST;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    if (asli === undefined) delete process.env.SMTP_HOST;
    else process.env.SMTP_HOST = asli;
  });

  it('SMTP_HOST kosong → log-only', async () => {
    delete process.env.SMTP_HOST;
    const { emailEnabled } = await import('./email');
    expect(emailEnabled).toBe(false);
  });

  it('SMTP_HOST berisi spasi saja tetap dianggap kosong', async () => {
    // Nilai begini datang dari `.env` yang ditulis `SMTP_HOST=" "` — tanpa trim
    // aplikasi akan mencoba menghubungi host bernama spasi setiap checkout.
    process.env.SMTP_HOST = '   ';
    const { emailEnabled } = await import('./email');
    expect(emailEnabled).toBe(false);
  });

  it('SMTP_HOST terisi → mode kirim', async () => {
    process.env.SMTP_HOST = 'localhost';
    const { emailEnabled } = await import('./email');
    expect(emailEnabled).toBe(true);
  });

  it('log-only: sendMail tidak melempar dan tidak mengembalikan promise', async () => {
    delete process.env.SMTP_HOST;
    const { sendMail } = await import('./email');
    expect(sendMail({ to: 'a@b.com', subject: 's', html: '<p>x</p>' })).toBeUndefined();
  });

  it('tujuan kosong tidak dikirim ke mana pun', async () => {
    process.env.SMTP_HOST = 'localhost';
    const { sendMail } = await import('./email');
    // Kalau ini sampai membuat koneksi, test akan menggantung sampai timeout —
    // guard `!input.to` di sendMail yang membuatnya kembali seketika.
    expect(sendMail({ to: '', subject: 's', html: '<p>x</p>' })).toBeUndefined();
  });
});
