// Product / category / banner data for Tokopudidi (shared to window)

const fmtRp = (n) => "Rp" + n.toLocaleString("id-ID");

// Category chips (under the hero card)
const CATEGORIES = [
  { id: "all", label: "Kategori", icon: "menu" },
  { id: "hp", label: "Handphone & Tablet", icon: "store" },
  { id: "topup", label: "Top-Up & Tagihan", icon: "bell" },
  { id: "elektronik", label: "Elektronik", icon: "chat" },
  { id: "hewan", label: "Perawatan Hewan", icon: "heart" },
  { id: "keuangan", label: "Keuangan", icon: "shield" },
  { id: "komputer", label: "Komputer & Laptop", icon: "truck" },
];

// Popular category tiles inside the hero card
const POPULAR_TILES = [
  "Kebutuhan Rumah", "Fashion Pria", "Fashion Wanita", "Gadget",
  "Dapur", "Kecantikan", "Olahraga", "Otomotif",
];

// Banner carousel slides — original promo copy, styled placeholders
const BANNERS = [
  { kicker: "Hari Belanja Hemat", title: "Diskon Gadget", big: "s.d. 70%", bg: "#0f5132", accent: "#22c98a", note: "product/lifestyle banner — 1200×340" },
  { kicker: "Awal Bulan Untung", title: "Cashback Elektronik", big: "s.d. 500rb", bg: "#1f3a5f", accent: "#5aa9ff", note: "promo banner — 1200×340" },
  { kicker: "Gratis Ongkir Spesial", title: "Belanja Rumah Tangga", big: "Untung Banget", bg: "#5b2333", accent: "#ff7a99", note: "promo banner — 1200×340" },
];

// Tabs above the feed
const FEED_TABS = ["For You", "Mall", "Produk Incaranmu"];

// Top-Up & Tagihan inner tabs
const TOPUP_TABS = ["Pulsa", "Paket Data", "Listrik PLN", "Roaming"];

// ── Products ─────────────────────────────────────────────────────────
// tone = placeholder bg tint; label = what goes in that image slot
const RAW = [
  ["Mesin Cuci 2 Tabung 8kg Hemat Air", 4654575, 32, 5.0, "50+ terjual", "Sinar Elektronik", "Jakarta Barat", "elektronik", "#e7eef5", true, true],
  ["Laptop Tipis 14\" Core i5 RAM 16GB SSD", 14299000, 18, 4.9, "120+ terjual", "Gadget Prima", "Jakarta Utara", "komputer", "#efeaf6", true, false],
  ["Wajan Penggorengan Anti Lengket 28cm", 170050, 52, 4.9, "1rb+ terjual", "Dapur Sehat", "Kab. Tangerang", "rumah", "#f1ece6", false, true],
  ["Lemari Arsip Serbaguna 4 Pintu", 1337000, 60, 4.7, "28 terjual", "Rumahku Mebel", "Bekasi", "rumah", "#eef0f2", true, false],
  ["Mesin Kopi Espresso Otomatis 15 Bar", 1066029, 52, 5.0, "300+ terjual", "Barista Tools", "Surabaya", "elektronik", "#e9e4dc", true, true],
  ["Kasur Spring Bed 160×200 Premium", 3283000, 33, 5.0, "500+ terjual", "Tidur Nyenyak", "Bandung", "rumah", "#eceef0", false, false],
  ["Microwave Digital 23L Low Watt", 1469900, 36, 5.0, "250+ terjual", "Sinar Elektronik", "Jakarta Barat", "elektronik", "#e6eaee", true, true],
  ["Flashdisk OTG Type-C 256GB Original", 195000, 24, 4.9, "100+ terjual", "Data Store", "Kab. Tangerang", "komputer", "#f0e9e9", false, false],
  ["Tenda Camping Dome Anti Air 4 Orang", 663000, 30, 4.9, "250+ terjual", "Outdoor Gear", "Kab. Tangerang", "olahraga", "#ece7df", false, true],
  ["Tandon Air 650 Liter + Pompa", 1704960, 8, 4.9, "2rb+ terjual", "Aqua Tank", "Bekasi", "rumah", "#e4eef0", true, true],
  ["Air Purifier HEPA Ruangan 30m²", 1499000, 65, 5.0, "100+ terjual", "Udara Bersih", "Jakarta Selatan", "elektronik", "#e8ecef", true, false],
  ["Monitor LED 27\" 165Hz Bezelless", 2499000, 23, 5.0, "100+ terjual", "Gadget Prima", "Jakarta Utara", "komputer", "#e7e9ee", true, true],
  ["Mesin Cuci Front Loading 7kg Inverter", 4715600, 41, 5.0, "11 terjual", "Sinar Elektronik", "Jakarta Timur", "elektronik", "#eceef0", true, true],
  ["Vacuum Cleaner Cordless 25.000Pa", 1490000, 56, 4.9, "1rb+ terjual", "Bersih Cepat", "Jakarta Barat", "elektronik", "#ece7ef", false, true],
  ["Pijat Elektrik Massage Gun 6 Kepala", 769000, 74, 4.9, "1rb+ terjual", "Sehat Tubuh", "Jakarta Selatan", "olahraga", "#e6ece6", true, false],
  ["Action Camera 5K Waterproof + Aksesoris", 7253000, 16, 4.9, "1rb+ terjual", "Cam Pro", "Jakarta Pusat", "elektronik", "#e7eaee", true, true],
  ["SSD NVMe 1TB Gen4 + Heatsink", 5393000, 54, 5.0, "100+ terjual", "Data Store", "Jakarta Pusat", "komputer", "#e6eaf0", true, false],
  ["Tablet 11\" 5G 8/128GB + Stylus", 5520000, 12, 4.9, "1rb+ terjual", "Gadget Prima", "Jakarta Utara", "hp", "#eceef0", true, true],
  ["Set Dumbbell PVC 20kg + Rak", 284000, 60, 5.0, "1rb+ terjual", "Sehat Tubuh", "Kab. Tangerang", "olahraga", "#e8eaec", false, true],
  ["Dash Cam Mobil Depan Belakang 2K", 1999000, 37, 5.0, "4rb+ terjual", "Otomotif Jaya", "Surabaya", "otomotif", "#e6e9ed", true, false],
  ["Spray Gun Cat Listrik 700W", 325500, 37, 4.9, "1rb+ terjual", "Tukang Kit", "Bekasi", "rumah", "#e9ece6", false, true],
  ["Kulkas 2 Pintu Inverter 256L", 2679900, 25, 4.8, "250+ terjual", "Sinar Elektronik", "Jakarta Barat", "elektronik", "#e7ebee", true, false],
  ["Ceret Listrik Gooseneck 0.8L", 276250, 28, 5.0, "1rb+ terjual", "Barista Tools", "Surabaya", "rumah", "#ece6e2", false, true],
  ["Kursi Kantor Ergonomis Sandaran Jaring", 638000, 22, 4.8, "9rb+ terjual", "Rumahku Mebel", "Bandung", "rumah", "#e9eaec", true, true],
  ["Skuter Listrik 60V Jarak 80km", 13500000, 14, 5.0, "8 terjual", "Otomotif Jaya", "Kab. Karawang", "otomotif", "#e7ece9", true, false],
  ["Smartwatch AMOLED GPS Tahan Air", 1799000, 28, 4.9, "750+ terjual", "Gadget Prima", "Jakarta Pusat", "hp", "#ece7ef", true, true],
  ["Panci Presto Aluminium 8L", 208000, 30, 4.9, "50rb+ terjual", "Dapur Sehat", "Kab. Tangerang", "rumah", "#ece9e4", false, true],
  ["Card Holder Stand Aluminium", 341500, 18, 4.9, "2rb+ terjual", "Gadget Prima", "Jakarta Utara", "hp", "#e9ebed", false, false],
];

const PRODUCTS = RAW.map((r, i) => {
  const [name, price, discount, rating, sold, store, location, category, tone, mall, cod] = r;
  const oldPrice = Math.round(price / (1 - discount / 100) / 1000) * 1000;
  return {
    id: "p" + (i + 1),
    name, price, oldPrice, discount, rating, sold, store, location, category,
    tone, mall, cod,
    official: i % 3 === 0,
    freeOngkir: i % 2 === 0,
    label: name.split(" ").slice(0, 2).join(" ").toLowerCase() + " shot",
  };
});

Object.assign(window, {
  fmtRp, CATEGORIES, POPULAR_TILES, BANNERS, FEED_TABS, TOPUP_TABS, PRODUCTS,
});
