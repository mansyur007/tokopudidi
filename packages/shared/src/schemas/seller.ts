import { z } from 'zod';
import {
  MAX_VARIANT_OPTIONS,
  MAX_VARIANT_COMBINATIONS,
  countCombinations,
  comboKey,
} from '../utils/variant';

export const upgradeToSellerSchema = z.object({
  shopName: z.string().trim().min(3, 'Nama toko minimal 3 karakter').max(30),
  shopDescription: z.string().trim().max(500).optional().or(z.literal('')),
  province: z.string().trim().min(1, 'Provinsi wajib diisi'),
  city: z.string().trim().min(1, 'Kota wajib diisi'),
  ktpUrl: z.string().min(5, 'Foto KTP wajib diupload'),
  agreeTerms: z.boolean().refine((v) => v === true, { message: 'Setujui syarat & ketentuan dulu ya' }),
});
export type UpgradeToSellerInput = z.infer<typeof upgradeToSellerSchema>;

export const updateShopSchema = z.object({
  name: z.string().trim().min(3).max(30).optional(),
  description: z.string().trim().max(500).optional().or(z.literal('')),
  logoUrl: z.string().min(5).optional().or(z.literal('')),
  bannerUrl: z.string().min(5).optional().or(z.literal('')),
  isOpen: z.boolean().optional(),
  closedReason: z.string().trim().max(200).optional().or(z.literal('')),
  bankName: z.string().trim().max(40).optional().or(z.literal('')),
  bankAccountNo: z.string().trim().max(40).optional().or(z.literal('')),
  bankAccountName: z.string().trim().max(80).optional().or(z.literal('')),
  autoReplyText: z.string().trim().max(300).optional().or(z.literal('')),
});

// ===== Variant multi-axis (M11-A8) =====
// Kombinasi dirujuk lewat NILAI posisional (sejajar urutan `options`), bukan id.
// Dengan begitu create dan edit memakai bentuk payload yang sama — client tidak
// perlu bolak-balik mengambil id value yang baru dibuat.
const optionInput = z.object({
  name: z.string().trim().min(1, 'Nama opsi wajib diisi').max(30),
  values: z
    .array(z.string().trim().min(1).max(40))
    .min(1, 'Setiap opsi butuh minimal 1 nilai')
    .max(MAX_VARIANT_COMBINATIONS),
});

const variantInput = z.object({
  values: z.array(z.string().trim().min(1).max(40)).min(1),
  priceModifier: z.number().int().default(0),
  stock: z.number().int().min(0),
  imageUrl: z.string().min(5).nullable().optional(),
  isActive: z.boolean().optional(),
});

// ===== Harga grosir (M13-B1) =====
export const MAX_WHOLESALE_TIERS = 5;

const wholesaleTierInput = z.object({
  // Minimal 2: tier dengan minQty 1 bukan "grosir", itu cuma mengganti harga
  // normal lewat pintu belakang dan membuat dua sumber kebenaran untuk harga
  // satuan produk.
  minQty: z.number().int().min(2, 'Minimal pembelian grosir mulai dari 2'),
  price: z.number().int().min(100, 'Harga grosir minimal Rp 100'),
});

/** Bentuk longgar yang dibaca aturan grosir — create & update sama-sama cocok. */
interface WholesaleShape {
  price?: number;
  wholesaleTiers?: { minQty: number; price: number }[];
}

/**
 * Aturan harga grosir. Sama seperti `VARIANT_RULES`: ditulis sebagai data
 * supaya create (price wajib) dan update (price opsional) menolak payload yang
 * sama dengan pesan yang sama persis.
 */
export const WHOLESALE_RULES: {
  check: (v: WholesaleShape) => boolean;
  message: string;
  path: string[];
}[] = [
  {
    // Ambang naik ketat. Kalau dibiarkan sama/menurun, "tier mana yang berlaku"
    // jadi bergantung urutan array — bukan aturan yang bisa dijelaskan ke seller.
    check: (v) => {
      const t = v.wholesaleTiers ?? [];
      return t.every((tier, i) => i === 0 || tier.minQty > t[i - 1].minQty);
    },
    message: 'Minimal pembelian tiap tingkat harus makin besar',
    path: ['wholesaleTiers'],
  },
  {
    // Harga turun ketat: beli lebih banyak tapi harga satuannya sama atau naik
    // bukan harga grosir, dan pembeli akan menganggapnya salah hitung.
    check: (v) => {
      const t = v.wholesaleTiers ?? [];
      return t.every((tier, i) => i === 0 || tier.price < t[i - 1].price);
    },
    message: 'Harga tiap tingkat harus makin murah',
    path: ['wholesaleTiers'],
  },
  {
    // Hanya diperiksa kalau harga normalnya ikut dikirim (update parsial bisa
    // tidak menyertakannya — route yang menambal, sama seperti salePrice).
    check: (v) =>
      v.price == null || (v.wholesaleTiers ?? []).every((tier) => tier.price < v.price!),
    message: 'Harga grosir harus lebih murah dari harga normal',
    path: ['wholesaleTiers'],
  },
];

const productBaseSchema = z.object({
  name: z.string().trim().min(3, 'Nama produk minimal 3 karakter').max(120),
  description: z.string().trim().min(10, 'Deskripsi minimal 10 karakter').max(5000),
  categoryId: z.string().uuid('Pilih kategori dulu'),
  price: z.number().int().min(100, 'Harga minimal Rp 100'),
  // Diskon periodik (M9-B3) — ketiganya diisi bersama; salePrice harus < price.
  salePrice: z.number().int().min(100).nullable().optional(),
  saleStartAt: z.string().datetime().nullable().optional(),
  saleEndAt: z.string().datetime().nullable().optional(),
  stock: z.number().int().min(0),
  minOrderQty: z.number().int().min(1).default(1),
  weight: z.number().int().min(1, 'Berat minimal 1 gram'),
  condition: z.enum(['NEW', 'USED']).default('NEW'),
  // Opsi pengiriman (M10-A10) — jadi filter di pencarian & ditegakkan saat checkout.
  codAvailable: z.boolean().default(true),
  freeShippingEligible: z.boolean().default(false),
  // Pre-order (M15-B1) — murni informasi (lead time), tidak ada SLA otomatis.
  isPreorder: z.boolean().default(false),
  preorderDays: z.number().int().min(1).max(90).nullable().optional(),
  isActive: z.boolean().default(true),
  imageUrls: z.array(z.string().min(5)).min(1, 'Minimal 1 foto produk').max(5, 'Maksimal 5 foto'),
  options: z.array(optionInput).max(MAX_VARIANT_OPTIONS, `Maksimal ${MAX_VARIANT_OPTIONS} opsi varian`).optional(),
  variants: z.array(variantInput).max(MAX_VARIANT_COMBINATIONS).optional(),
  wholesaleTiers: z
    .array(wholesaleTierInput)
    .max(MAX_WHOLESALE_TIERS, `Maksimal ${MAX_WHOLESALE_TIERS} tingkat harga grosir`)
    .optional(),
});

/** Bentuk longgar yang dibaca aturan di bawah — create & update sama-sama cocok. */
interface VariantShape {
  options?: { name: string; values: string[] }[];
  variants?: { values: string[] }[];
}

/**
 * Aturan yang mengikat `options` dengan `variants`. Ditulis sebagai data supaya
 * create dan update (yang tipenya berbeda: satu wajib, satu partial) menolak
 * payload tak konsisten dengan pesan yang persis sama.
 */
export const VARIANT_RULES: {
  check: (v: VariantShape) => boolean;
  message: string;
  path: string[];
}[] = [
  {
    check: (v) => !v.variants?.length || !!v.options?.length,
    message: 'Varian butuh minimal 1 opsi (mis. "Warna")',
    path: ['options'],
  },
  {
    check: (v) => {
      const names = (v.options ?? []).map((o) => o.name.trim().toLowerCase());
      return new Set(names).size === names.length;
    },
    message: 'Nama opsi tidak boleh kembar',
    path: ['options'],
  },
  {
    check: (v) => (v.options ?? []).every((o) => {
      const vals = o.values.map((x) => x.trim().toLowerCase());
      return new Set(vals).size === vals.length;
    }),
    message: 'Nilai dalam satu opsi tidak boleh kembar',
    path: ['options'],
  },
  {
    check: (v) => countCombinations(v.options ?? []) <= MAX_VARIANT_COMBINATIONS,
    message: `Total kombinasi varian maksimal ${MAX_VARIANT_COMBINATIONS}`,
    path: ['options'],
  },
  {
    check: (v) => (v.variants ?? []).every((vr) => vr.values.length === (v.options ?? []).length),
    message: 'Setiap kombinasi harus punya satu nilai per opsi',
    path: ['variants'],
  },
  {
    // Tanpa aturan ini, kombinasi bisa menyimpan nilai yang tidak ada di daftar
    // opsi dan varian itu jadi tidak akan pernah bisa dipilih pembeli.
    check: (v) => (v.variants ?? []).every((vr) =>
      vr.values.every((val, i) =>
        (v.options ?? [])[i]?.values.some((x) => x.trim() === val.trim()),
      ),
    ),
    message: 'Ada kombinasi yang memakai nilai di luar daftar opsi',
    path: ['variants'],
  },
  {
    check: (v) => {
      const keys = (v.variants ?? []).map((vr) => comboKey(vr.values));
      return new Set(keys).size === keys.length;
    },
    message: 'Ada kombinasi varian yang kembar',
    path: ['variants'],
  },
];

// Tipe kembalian dipertahankan eksplisit: `.refine()` berantai menghasilkan
// ZodEffects bersarang yang membuat z.infer jatuh ke `any` kalau dibiarkan,
// dan FE ikut kehilangan pengecekan tipe pada ProductCreateInput.
function withVariantRules<S extends z.ZodTypeAny>(
  schema: S,
): z.ZodType<z.output<S>, z.ZodTypeDef, z.input<S>> {
  return VARIANT_RULES.reduce(
    (acc, rule) => acc.refine((v) => rule.check(v as VariantShape), {
      message: rule.message,
      path: rule.path,
    }),
    schema as z.ZodTypeAny,
  ) as z.ZodType<z.output<S>, z.ZodTypeDef, z.input<S>>;
}

/** Sama seperti `withVariantRules`, untuk aturan harga grosir (M13-B1). */
function withWholesaleRules<S extends z.ZodTypeAny>(
  schema: S,
): z.ZodType<z.output<S>, z.ZodTypeDef, z.input<S>> {
  return WHOLESALE_RULES.reduce(
    (acc, rule) => acc.refine((v) => rule.check(v as WholesaleShape), {
      message: rule.message,
      path: rule.path,
    }),
    schema as z.ZodTypeAny,
  ) as z.ZodType<z.output<S>, z.ZodTypeDef, z.input<S>>;
}

export const productCreateSchema = withWholesaleRules(withVariantRules(productBaseSchema))
  .refine((v) => v.salePrice == null || v.salePrice < v.price, {
    message: 'Harga diskon harus lebih murah dari harga normal',
    path: ['salePrice'],
  })
  .refine((v) => v.salePrice == null || (!!v.saleStartAt && !!v.saleEndAt), {
    message: 'Periode diskon wajib diisi',
    path: ['saleStartAt'],
  })
  .refine((v) => !v.saleStartAt || !v.saleEndAt || new Date(v.saleStartAt) < new Date(v.saleEndAt), {
    message: 'Tanggal berakhir harus setelah tanggal mulai',
    path: ['saleEndAt'],
  })
  .refine((v) => !v.isPreorder || (v.preorderDays != null && v.preorderDays >= 1 && v.preorderDays <= 90), {
    message: 'Lama pre-order wajib diisi 1-90 hari',
    path: ['preorderDays'],
  });
export type ProductCreateInput = z.infer<typeof productCreateSchema>;

// Partial dari base (tanpa refinement create) — konsistensi salePrice vs price
// divalidasi di route update karena price bisa tidak ikut dikirim. Aturan
// varian tetap berlaku: kalau `options`/`variants` dikirim, harus konsisten.
export const productUpdateSchema = withWholesaleRules(withVariantRules(productBaseSchema.partial()));

// ===== Bulk edit stok & harga (M14-B2) =====
// Batas 50 baris per request: satu transaksi yang menahan ratusan baris produk
// memperpanjang lock tabel tanpa alasan, dan seller yang mengedit lebih dari
// itu sekaligus lebih mungkin salah tempel daripada benar-benar bermaksud.
export const MAX_BULK_PRODUCT_ITEMS = 50;

const bulkProductItemSchema = z
  .object({
    id: z.string().uuid(),
    // Ambangnya disamakan dengan form produk biasa — bulk edit tidak boleh jadi
    // pintu belakang untuk menembus aturan yang berlaku di jalur satuan.
    price: z.number().int().min(100, 'Harga minimal Rp 100').optional(),
    stock: z.number().int().min(0, 'Stok tidak boleh negatif').optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => v.price !== undefined || v.stock !== undefined || v.isActive !== undefined, {
    // Baris tanpa perubahan bukan sekadar mubazir: ia ikut terhitung di
    // `updated`, sehingga seller diberi tahu "12 produk diperbarui" padahal
    // yang benar-benar berubah lebih sedikit.
    message: 'Setiap baris harus mengubah minimal satu kolom',
  });

export const bulkProductUpdateSchema = z
  .object({
    items: z
      .array(bulkProductItemSchema)
      .min(1, 'Tidak ada perubahan untuk disimpan')
      .max(MAX_BULK_PRODUCT_ITEMS, `Maksimal ${MAX_BULK_PRODUCT_ITEMS} produk per simpan`),
  })
  .refine((v) => new Set(v.items.map((i) => i.id)).size === v.items.length, {
    // Dua baris untuk produk yang sama membuat hasil akhirnya bergantung urutan
    // array — nilai mana yang menang jadi kebetulan, bukan keputusan.
    message: 'Ada produk yang sama dikirim lebih dari sekali',
    path: ['items'],
  });
export type BulkProductUpdateInput = z.infer<typeof bulkProductUpdateSchema>;
export type BulkProductItemInput = z.infer<typeof bulkProductItemSchema>;

export const shipOrderSchema = z.object({
  trackingNumber: z.string().trim().min(3, 'Nomor resi minimal 3 karakter').max(60),
  courierName: z.string().trim().min(2, 'Pilih kurir dulu').max(40),
});

export const rejectOrderSchema = z.object({
  reason: z.string().trim().min(3).max(200),
});

export const verifyPaymentSchema = z.object({
  approved: z.boolean(),
  rejectReason: z.string().trim().max(200).optional().or(z.literal('')),
});

export const withdrawSchema = z.object({
  amount: z.number().int().min(10000, 'Minimal tarik dana Rp 10.000'),
});

// ===== Voucher (M9-B2 seller / M9-C1 admin) =====
//
// Objek dasarnya dipisah dari refinement supaya varian admin bisa meng-`extend`
// dengan `categoryId`: `.refine()` mengubah ZodObject jadi ZodEffects, dan
// ZodEffects tidak punya `.extend()`. Aturan tanggal & batas persen berlaku
// sama untuk keduanya, jadi ditulis sekali lalu dipasangkan ke dua-duanya —
// kalau disalin, cepat atau lambat salah satunya ketinggalan saat diubah.
const voucherBase = z.object({
  code: z.string().trim().toUpperCase()
    .min(3, 'Kode minimal 3 karakter').max(20)
    .regex(/^[A-Z0-9]+$/, 'Kode hanya huruf & angka'),
  discountType: z.enum(['FIXED', 'PERCENTAGE']),
  discountValue: z.number().int().min(1, 'Nilai diskon minimal 1'),
  minPurchase: z.number().int().min(0).default(0),
  maxDiscount: z.number().int().min(1).nullable().optional(),
  usageLimit: z.number().int().min(1).nullable().optional(),
  validFrom: z.string().datetime(),
  validUntil: z.string().datetime(),
});

/** Aturan yang berlaku untuk voucher toko maupun voucher platform. */
function aturanVoucher<T extends z.ZodTypeAny>(schema: T) {
  return schema
    .refine((v: z.infer<T>) => new Date(v.validFrom) < new Date(v.validUntil), {
      message: 'Tanggal berakhir harus setelah tanggal mulai',
      path: ['validUntil'],
    })
    .refine((v: z.infer<T>) => v.discountType !== 'PERCENTAGE' || v.discountValue <= 100, {
      message: 'Diskon persen maksimal 100%',
      path: ['discountValue'],
    });
}

export const voucherCreateSchema = aturanVoucher(voucherBase);
export type VoucherCreateInput = z.infer<typeof voucherCreateSchema>;

/**
 * Varian admin: boleh membatasi voucher ke satu kategori (M9-C1).
 *
 * Sengaja **tidak** ditambahkan ke `voucherCreateSchema` yang dipakai route
 * seller: kalau field-nya diterima lalu diabaikan diam-diam di sana, seller
 * akan mengira vouchernya ter-scope padahal tidak.
 */
export const adminVoucherCreateSchema = aturanVoucher(
  voucherBase.extend({ categoryId: z.string().uuid().nullable().optional() }),
);
export type AdminVoucherCreateInput = z.infer<typeof adminVoucherCreateSchema>;

export const voucherUpdateSchema = z.object({
  discountType: z.enum(['FIXED', 'PERCENTAGE']).optional(),
  discountValue: z.number().int().min(1).optional(),
  minPurchase: z.number().int().min(0).optional(),
  maxDiscount: z.number().int().min(1).nullable().optional(),
  usageLimit: z.number().int().min(1).nullable().optional(),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
  isActive: z.boolean().optional(), // pause / resume
});
export type VoucherUpdateInput = z.infer<typeof voucherUpdateSchema>;

export const adminVoucherUpdateSchema = voucherUpdateSchema.extend({
  // null = lepas pembatasan kategori.
  categoryId: z.string().uuid().nullable().optional(),
});
export type AdminVoucherUpdateInput = z.infer<typeof adminVoucherUpdateSchema>;

// ===== Template chat seller (M8-B6) =====
export const chatTemplateSchema = z.object({
  label: z.string().trim().min(2, 'Label minimal 2 karakter').max(40),
  body: z.string().trim().min(2, 'Isi template minimal 2 karakter').max(500),
  order: z.number().int().min(0).default(0),
});
export type ChatTemplateInput = z.infer<typeof chatTemplateSchema>;

export const chatTemplateUpdateSchema = chatTemplateSchema.partial();

// ===== Etalase / showcase toko (M11-B1) =====
export const MAX_SHOWCASES_PER_SHOP = 10;
export const MAX_PRODUCTS_PER_SHOWCASE = 50;

export const showcaseCreateSchema = z.object({
  name: z.string().trim().min(2, 'Nama etalase minimal 2 karakter').max(40),
});
export type ShowcaseCreateInput = z.infer<typeof showcaseCreateSchema>;

// Slug sengaja tidak bisa diubah — URL etalase tetap stabil setelah dibuat.
export const showcaseUpdateSchema = z.object({
  name: z.string().trim().min(2, 'Nama etalase minimal 2 karakter').max(40).optional(),
});
export type ShowcaseUpdateInput = z.infer<typeof showcaseUpdateSchema>;

// Replace-all: daftar final produk di etalase ini. Array kosong = kosongkan etalase.
export const showcaseAssignProductsSchema = z.object({
  productIds: z
    .array(z.string().uuid())
    .max(MAX_PRODUCTS_PER_SHOWCASE, `Maksimal ${MAX_PRODUCTS_PER_SHOWCASE} produk per etalase`),
});
export type ShowcaseAssignProductsInput = z.infer<typeof showcaseAssignProductsSchema>;

// Reorder pakai tombol ▲▼ (swap dengan tetangga) — konsisten M8-B6 template chat.
export const showcaseMoveSchema = z.object({
  direction: z.enum(['up', 'down']),
});
export type ShowcaseMoveInput = z.infer<typeof showcaseMoveSchema>;

// ===== Broadcast promo ke follower (M13-B2) =====
// Isi broadcast masuk ke kolom `Notification.body` follower dan tidak bisa
// ditarik kembali setelah terkirim, jadi batas panjangnya dibuat lebih ketat
// daripada deskripsi biasa: 500 karakter sudah lebih dari cukup untuk sebuah
// pengumuman, dan menahan kiriman yang tidak terbaca di daftar notifikasi.
export const BROADCAST_TITLE_MAX = 60;
export const BROADCAST_BODY_MAX = 500;

export const broadcastCreateSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Judul minimal 3 karakter')
    .max(BROADCAST_TITLE_MAX, `Judul maksimal ${BROADCAST_TITLE_MAX} karakter`),
  body: z
    .string()
    .trim()
    .min(10, 'Isi pengumuman minimal 10 karakter')
    .max(BROADCAST_BODY_MAX, `Isi pengumuman maksimal ${BROADCAST_BODY_MAX} karakter`),
  // Produk yang disorot — opsional. Kepemilikannya (produk ini milik toko yang
  // mengirim) tidak bisa dicek di sini, jadi ditegakkan di route.
  productId: z.string().uuid('Produk tidak valid').nullable().optional(),
});
export type BroadcastCreateInput = z.infer<typeof broadcastCreateSchema>;
