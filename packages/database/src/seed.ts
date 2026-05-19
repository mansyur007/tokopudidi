// Seed dasar untuk Milestone 1 + 2:
// - 15 kategori UMKM
// - 1 admin
// - 8 demo seller + toko (campuran KTP-verified dan belum)
// - ~40 produk realistis dengan gambar dari picsum.photos
// - 3 banner homepage
// Seed lengkap (50 seller, 500 produk, 200 order, dst) ada di Milestone 6.
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

const KATEGORI_AWAL = [
  { name: 'Sembako', slug: 'sembako' },
  { name: 'Makanan & Minuman', slug: 'makanan-minuman' },
  { name: 'Fashion Muslim', slug: 'fashion-muslim' },
  { name: 'Fashion Pria', slug: 'fashion-pria' },
  { name: 'Fashion Wanita', slug: 'fashion-wanita' },
  { name: 'Kesehatan & Kecantikan', slug: 'kesehatan-kecantikan' },
  { name: 'Rumah Tangga', slug: 'rumah-tangga' },
  { name: 'Elektronik Murah', slug: 'elektronik-murah' },
  { name: 'Pulsa & Tagihan', slug: 'pulsa-tagihan' },
  { name: 'Hobi', slug: 'hobi' },
  { name: 'Pertanian & Peternakan', slug: 'pertanian-peternakan' },
  { name: 'Buku & Alat Tulis', slug: 'buku-alat-tulis' },
  { name: 'Mainan Anak', slug: 'mainan-anak' },
  { name: 'Otomotif', slug: 'otomotif' },
  { name: 'Lainnya', slug: 'lainnya' },
];

interface SellerSeed {
  fullName: string;
  phone: string;
  shop: { name: string; slug: string; description: string; city: string; province: string; ktpVerified: boolean };
}

const SELLERS: SellerSeed[] = [
  { fullName: 'Bu Siti Aminah', phone: '+6281200000101',
    shop: { name: 'Warung Bu Siti', slug: 'warung-bu-siti',
      description: 'Sembako lengkap, harga grosir untuk warung dan rumah tangga.',
      city: 'Bekasi', province: 'Jawa Barat', ktpVerified: true } },
  { fullName: 'Mas Joko Saputro', phone: '+6281200000102',
    shop: { name: 'Toko Mas Joko', slug: 'toko-mas-joko',
      description: 'Kopi tubruk, gula aren, rempah-rempah pilihan dari petani lokal.',
      city: 'Yogyakarta', province: 'DI Yogyakarta', ktpVerified: true } },
  { fullName: 'Mbak Rina Wati', phone: '+6281200000103',
    shop: { name: 'Konveksi Mbak Rina', slug: 'konveksi-mbak-rina',
      description: 'Hijab, gamis, dan baju koko jahitan rapi.',
      city: 'Bandung', province: 'Jawa Barat', ktpVerified: true } },
  { fullName: 'Pak Bambang Sutarjo', phone: '+6281200000104',
    shop: { name: 'Warung Pak Bambang', slug: 'warung-pak-bambang',
      description: 'Spare part motor matic, pengiriman cepat se-Jabodetabek.',
      city: 'Tangerang', province: 'Banten', ktpVerified: false } },
  { fullName: 'Bu Lestari', phone: '+6281200000105',
    shop: { name: 'Dapur Bu Lestari', slug: 'dapur-bu-lestari',
      description: 'Kue kering lebaran, bumbu dapur, dan camilan rumahan.',
      city: 'Surabaya', province: 'Jawa Timur', ktpVerified: true } },
  { fullName: 'Mbak Ani', phone: '+6281200000106',
    shop: { name: 'Kosmetik Ani', slug: 'kosmetik-ani',
      description: 'Skincare lokal halal, harga ramah kantong mahasiswa.',
      city: 'Malang', province: 'Jawa Timur', ktpVerified: true } },
  { fullName: 'Kang Asep', phone: '+6281200000107',
    shop: { name: 'Pertanian Kang Asep', slug: 'pertanian-kang-asep',
      description: 'Bibit cabe, pupuk organik, alat tani sederhana.',
      city: 'Garut', province: 'Jawa Barat', ktpVerified: false } },
  { fullName: 'Pak Hendra', phone: '+6281200000108',
    shop: { name: 'Buku Pak Hendra', slug: 'buku-pak-hendra',
      description: 'Buku bekas dan alat tulis sekolah, garansi seller terpercaya.',
      city: 'Semarang', province: 'Jawa Tengah', ktpVerified: true } },
];

interface ProductSeed {
  shopSlug: string;
  catSlug: string;
  name: string;
  price: number;
  weight: number;
  stock: number;
  description: string;
  variants?: { name: string; priceModifier: number; stock: number }[];
}

const PRODUCTS: ProductSeed[] = [
  // Warung Bu Siti — sembako
  { shopSlug: 'warung-bu-siti', catSlug: 'sembako', name: 'Beras Pandan Wangi 5kg', price: 68000, weight: 5000, stock: 50, description: 'Beras premium pandan wangi, pulen dan harum. Cocok untuk konsumsi keluarga.' },
  { shopSlug: 'warung-bu-siti', catSlug: 'sembako', name: 'Minyak Goreng Bimoli 2 Liter', price: 35000, weight: 2000, stock: 80, description: 'Minyak goreng kemasan pillow pack, segel pabrik.' },
  { shopSlug: 'warung-bu-siti', catSlug: 'sembako', name: 'Gula Pasir Gulaku 1kg', price: 16500, weight: 1000, stock: 100, description: 'Gula pasir putih bersih, kemasan 1 kilogram.' },
  { shopSlug: 'warung-bu-siti', catSlug: 'sembako', name: 'Telur Ayam Negeri 1kg', price: 28000, weight: 1000, stock: 40, description: 'Telur segar dari peternakan lokal, isi 16-17 butir per kilogram.' },
  { shopSlug: 'warung-bu-siti', catSlug: 'sembako', name: 'Indomie Goreng Original (Dus 40 pcs)', price: 124000, weight: 3500, stock: 20, description: 'Indomie goreng spesial, isi 40 bungkus dalam satu dus.' },

  // Toko Mas Joko — minuman & rempah
  { shopSlug: 'toko-mas-joko', catSlug: 'makanan-minuman', name: 'Kopi Robusta Lampung 250gr', price: 38000, weight: 250, stock: 60, description: 'Kopi robusta single origin Lampung, roasting medium. Cocok untuk tubruk maupun manual brew.',
    variants: [
      { name: 'Bubuk Halus', priceModifier: 0, stock: 30 },
      { name: 'Biji Utuh', priceModifier: 2000, stock: 30 },
    ],
  },
  { shopSlug: 'toko-mas-joko', catSlug: 'makanan-minuman', name: 'Gula Aren Cair 500ml', price: 32000, weight: 600, stock: 35, description: 'Gula aren cair murni dari pohon aren Garut, tanpa pengawet.' },
  { shopSlug: 'toko-mas-joko', catSlug: 'makanan-minuman', name: 'Teh Tubruk Tongji 100gr', price: 12000, weight: 100, stock: 80, description: 'Teh tubruk khas Yogyakarta, aroma harum dan warna pekat.' },
  { shopSlug: 'toko-mas-joko', catSlug: 'sembako', name: 'Lada Hitam Bubuk 50gr', price: 18000, weight: 50, stock: 40, description: 'Lada hitam asli Bangka, digiling segar dalam kemasan kecil.' },

  // Konveksi Mbak Rina — fashion muslim
  { shopSlug: 'konveksi-mbak-rina', catSlug: 'fashion-muslim', name: 'Hijab Pashmina Ceruty Premium', price: 45000, weight: 250, stock: 70, description: 'Hijab pashmina ceruty babydoll, jatuh dan tidak menerawang. Ukuran 175 x 75 cm.',
    variants: [
      { name: 'Hitam', priceModifier: 0, stock: 20 },
      { name: 'Cream', priceModifier: 0, stock: 20 },
      { name: 'Mocha', priceModifier: 0, stock: 15 },
      { name: 'Dusty Pink', priceModifier: 0, stock: 15 },
    ],
  },
  { shopSlug: 'konveksi-mbak-rina', catSlug: 'fashion-muslim', name: 'Gamis Polos Crinkle Airflow', price: 135000, weight: 400, stock: 30, description: 'Gamis muslimah bahan crinkle airflow, adem dan tidak licin. Ukuran S-XL.',
    variants: [
      { name: 'S', priceModifier: 0, stock: 8 },
      { name: 'M', priceModifier: 0, stock: 10 },
      { name: 'L', priceModifier: 0, stock: 8 },
      { name: 'XL', priceModifier: 5000, stock: 4 },
    ],
  },
  { shopSlug: 'konveksi-mbak-rina', catSlug: 'fashion-muslim', name: 'Baju Koko Lengan Pendek Katun', price: 95000, weight: 350, stock: 45, description: 'Baju koko bahan katun premium, jahitan rapi cocok untuk Idul Fitri.' },
  { shopSlug: 'konveksi-mbak-rina', catSlug: 'fashion-wanita', name: 'Daster Batik Lengan Pendek', price: 55000, weight: 300, stock: 60, description: 'Daster batik all size, bahan rayon adem cocok dipakai di rumah.' },

  // Warung Pak Bambang — otomotif
  { shopSlug: 'warung-pak-bambang', catSlug: 'otomotif', name: 'Kampas Rem Belakang Beat/Vario', price: 25000, weight: 100, stock: 30, description: 'Kampas rem belakang aftermarket KW super untuk Honda Beat dan Vario.' },
  { shopSlug: 'warung-pak-bambang', catSlug: 'otomotif', name: 'Oli Yamalube Matic 0.8L', price: 42000, weight: 800, stock: 50, description: 'Oli mesin Yamalube khusus motor matic, original kemasan baru.' },
  { shopSlug: 'warung-pak-bambang', catSlug: 'otomotif', name: 'Filter Udara KF Vario 125', price: 35000, weight: 150, stock: 25, description: 'Filter udara aftermarket untuk Vario 125, awet dan irit.' },

  // Dapur Bu Lestari — makanan
  { shopSlug: 'dapur-bu-lestari', catSlug: 'makanan-minuman', name: 'Kue Nastar Keju Premium 500gr', price: 95000, weight: 600, stock: 25, description: 'Nastar isi selai nanas asli, topping keju cheddar. Kemasan toples kaca.' },
  { shopSlug: 'dapur-bu-lestari', catSlug: 'makanan-minuman', name: 'Kastengel Original 500gr', price: 110000, weight: 600, stock: 20, description: 'Kastengel renyah, gurih, cocok untuk teman ngeteh.' },
  { shopSlug: 'dapur-bu-lestari', catSlug: 'makanan-minuman', name: 'Bumbu Rendang Jadi 250gr', price: 28000, weight: 300, stock: 50, description: 'Bumbu rendang siap pakai, tinggal masak dengan daging. Resep keluarga.' },
  { shopSlug: 'dapur-bu-lestari', catSlug: 'makanan-minuman', name: 'Keripik Tempe Pedas Manis 200gr', price: 18000, weight: 200, stock: 100, description: 'Keripik tempe tipis renyah, bumbu pedas manis bikin nagih.' },

  // Kosmetik Ani
  { shopSlug: 'kosmetik-ani', catSlug: 'kesehatan-kecantikan', name: 'Sabun Wajah Charcoal 100ml', price: 25000, weight: 120, stock: 80, description: 'Sabun wajah charcoal untuk kulit berminyak. BPOM dan halal MUI.' },
  { shopSlug: 'kosmetik-ani', catSlug: 'kesehatan-kecantikan', name: 'Toner Hidrasi Centella 100ml', price: 35000, weight: 130, stock: 60, description: 'Toner ringan dengan ekstrak centella asiatica, untuk kulit sensitif.' },
  { shopSlug: 'kosmetik-ani', catSlug: 'kesehatan-kecantikan', name: 'Sunscreen SPF 50 PA+++', price: 48000, weight: 50, stock: 70, description: 'Sunscreen ringan tidak whitecast, cocok untuk daily use.' },
  { shopSlug: 'kosmetik-ani', catSlug: 'kesehatan-kecantikan', name: 'Lip Tint Matte Series', price: 32000, weight: 30, stock: 50, description: 'Lip tint dengan finish matte tahan lama, tidak bikin kering.',
    variants: [
      { name: 'Cherry Red', priceModifier: 0, stock: 15 },
      { name: 'Nude Peach', priceModifier: 0, stock: 15 },
      { name: 'Berry Purple', priceModifier: 0, stock: 10 },
      { name: 'Coral Pink', priceModifier: 0, stock: 10 },
    ],
  },

  // Pertanian Kang Asep
  { shopSlug: 'pertanian-kang-asep', catSlug: 'pertanian-peternakan', name: 'Bibit Cabe Rawit 50 biji', price: 12000, weight: 50, stock: 100, description: 'Bibit cabe rawit unggul varietas Bara, daya tumbuh 90%+.' },
  { shopSlug: 'pertanian-kang-asep', catSlug: 'pertanian-peternakan', name: 'Pupuk Organik Kompos 5kg', price: 22000, weight: 5000, stock: 40, description: 'Pupuk kompos matang, cocok untuk sayuran dan tanaman hias.' },
  { shopSlug: 'pertanian-kang-asep', catSlug: 'pertanian-peternakan', name: 'Cangkul Mini Ringan', price: 65000, weight: 1500, stock: 15, description: 'Cangkul ukuran mini cocok untuk berkebun di pekarangan.' },

  // Buku Pak Hendra
  { shopSlug: 'buku-pak-hendra', catSlug: 'buku-alat-tulis', name: 'Buku Tulis 58 Lembar (Pack 10)', price: 38000, weight: 1000, stock: 50, description: 'Buku tulis isi 58 lembar, sampul tebal. Pak isi 10 buku.' },
  { shopSlug: 'buku-pak-hendra', catSlug: 'buku-alat-tulis', name: 'Pulpen Standard AE7 (Lusin)', price: 18000, weight: 200, stock: 100, description: 'Pulpen standard hitam, isi 12 batang per lusin.' },
  { shopSlug: 'buku-pak-hendra', catSlug: 'buku-alat-tulis', name: 'Tas Sekolah SD Anak Laki', price: 95000, weight: 600, stock: 25, description: 'Tas sekolah karakter superhero, ukuran ransel kelas 1-3 SD.' },
  { shopSlug: 'buku-pak-hendra', catSlug: 'mainan-anak', name: 'Puzzle Kayu Hewan Edukatif', price: 35000, weight: 300, stock: 30, description: 'Puzzle kayu bentuk hewan, untuk anak usia 2-5 tahun.' },
];

const BANNERS = [
  { imageUrl: 'https://picsum.photos/seed/banner1/1200/400', linkUrl: '/kategori/sembako',         placement: 'HOME_TOP' as const,    order: 0 },
  { imageUrl: 'https://picsum.photos/seed/banner2/1200/400', linkUrl: '/kategori/fashion-muslim',  placement: 'HOME_TOP' as const,    order: 1 },
  { imageUrl: 'https://picsum.photos/seed/banner3/1200/400', linkUrl: '/kategori/makanan-minuman', placement: 'HOME_TOP' as const,    order: 2 },
];

function generateReferralCode(): string {
  return randomBytes(4).toString('hex').toUpperCase();
}

function slugifyId(input: string, salt: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50) + '-' + salt
  );
}

async function main() {
  console.log('🌱 Mulai seeding...');

  // 1. Kategori
  for (let i = 0; i < KATEGORI_AWAL.length; i++) {
    const k = KATEGORI_AWAL[i];
    await prisma.category.upsert({
      where: { slug: k.slug },
      update: { order: i },
      create: { name: k.name, slug: k.slug, order: i },
    });
  }
  console.log(`✅ ${KATEGORI_AWAL.length} kategori`);

  // 2. Admin
  const adminPassword = await bcrypt.hash('admin123', 12);
  await prisma.user.upsert({
    where: { phone: '+6281200000001' },
    update: {},
    create: {
      phone: '+6281200000001',
      email: 'admin@tokopudidi.test',
      passwordHash: adminPassword,
      fullName: 'Admin Tokopudidi',
      role: 'ADMIN',
      isPhoneVerified: true,
      referralCode: generateReferralCode(),
    },
  });
  console.log('✅ Admin: admin@tokopudidi.test / admin123');

  // 3. Sellers + Shops
  const sellerPassword = await bcrypt.hash('seller123', 12);
  for (const s of SELLERS) {
    const user = await prisma.user.upsert({
      where: { phone: s.phone },
      update: {},
      create: {
        phone: s.phone,
        passwordHash: sellerPassword,
        fullName: s.fullName,
        role: 'SELLER',
        isPhoneVerified: true,
        referralCode: generateReferralCode(),
        cart: { create: {} },
      },
    });
    await prisma.shop.upsert({
      where: { ownerId: user.id },
      update: {},
      create: {
        ownerId: user.id,
        slug: s.shop.slug,
        name: s.shop.name,
        description: s.shop.description,
        city: s.shop.city,
        province: s.shop.province,
        ktpVerified: s.shop.ktpVerified,
        logoUrl: `https://picsum.photos/seed/${s.shop.slug}-logo/200/200`,
        bannerUrl: `https://picsum.photos/seed/${s.shop.slug}-banner/1200/300`,
        ratingAvg: 4 + Math.random(),
        ratingCount: Math.floor(Math.random() * 50) + 5,
        totalSold: Math.floor(Math.random() * 200) + 20,
      },
    });
  }
  console.log(`✅ ${SELLERS.length} seller + toko`);

  // 4. Products
  const allCategories = await prisma.category.findMany();
  const catMap = new Map(allCategories.map((c) => [c.slug, c]));
  const allShops = await prisma.shop.findMany();
  const shopMap = new Map(allShops.map((s) => [s.slug, s]));

  let productCount = 0;
  for (const p of PRODUCTS) {
    const shop = shopMap.get(p.shopSlug);
    const cat = catMap.get(p.catSlug);
    if (!shop || !cat) continue;

    const slug = slugifyId(p.name, shop.slug.slice(0, 6));

    const product = await prisma.product.upsert({
      where: { slug },
      update: {},
      create: {
        shopId: shop.id,
        categoryId: cat.id,
        name: p.name,
        slug,
        description: p.description,
        price: p.price,
        stock: p.stock,
        weight: p.weight,
        soldCount: Math.floor(Math.random() * 100) + 5,
        ratingAvg: 4 + Math.random(),
        ratingCount: Math.floor(Math.random() * 30) + 1,
        images: {
          create: [
            { url: `https://picsum.photos/seed/${slug}-1/600/600`, order: 0 },
            { url: `https://picsum.photos/seed/${slug}-2/600/600`, order: 1 },
            { url: `https://picsum.photos/seed/${slug}-3/600/600`, order: 2 },
          ],
        },
      },
    });

    if (p.variants?.length) {
      for (const v of p.variants) {
        await prisma.productVariant.create({
          data: {
            productId: product.id,
            name: v.name,
            priceModifier: v.priceModifier,
            stock: v.stock,
          },
        }).catch(() => undefined);
      }
    }
    productCount++;
  }
  console.log(`✅ ${productCount} produk`);

  // 5. Banners
  for (const b of BANNERS) {
    const exists = await prisma.banner.findFirst({ where: { imageUrl: b.imageUrl } });
    if (!exists) await prisma.banner.create({ data: b });
  }
  console.log(`✅ ${BANNERS.length} banner`);

  // 6. Promo codes — sederhana untuk demo checkout.
  const promoData = [
    { code: 'HEMAT10K',  discountType: 'FIXED' as const,      discountValue: 10000, minPurchase: 50000,  maxDiscount: null,   usageLimit: 1000 },
    { code: 'DISKON5',   discountType: 'PERCENTAGE' as const, discountValue: 5,     minPurchase: 100000, maxDiscount: 25000,  usageLimit: 500  },
    { code: 'GRATISONGKIR', discountType: 'FIXED' as const,   discountValue: 15000, minPurchase: 30000,  maxDiscount: null,   usageLimit: 2000 },
  ];
  const validFrom = new Date();
  const validUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  for (const p of promoData) {
    await prisma.promoCode.upsert({
      where: { code: p.code },
      update: {},
      create: { ...p, validFrom, validUntil, isActive: true },
    });
  }
  console.log(`✅ ${promoData.length} promo code (HEMAT10K, DISKON5, GRATISONGKIR)`);

  console.log('🌱 Selesai!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
