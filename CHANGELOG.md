# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [SemVer](https://semver.org/).

## [0.5.0] — 2026-05-14 — Milestone 5: Chat, Reviews & Notifications

### Added
- **Realtime chat (Socket.IO):**
  - Endpoints `GET/POST /api/v1/chats/rooms`, `GET /rooms/:id/messages`, `POST /rooms/:id/messages`, `POST /rooms/:id/read` — auto-upsert a room per buyer×shop pair, access validation, automatic mark-read.
  - Socket.IO server attached to port 4000 (`ws://localhost:4000`), auth via JWT in the handshake. Events `room:join`, `room:leave`, `typing`, `message:new`, `message:read`.
  - **Auto-reply** when the shop is closed: buyer messages are answered automatically using `shop.autoReplyText`.
  - `NEW_MESSAGE` notification delivered to the other party's inbox.
- **Chat pages:**
  - `/chat` (buyer) — 2-pane room list + thread, quick replies, image upload (data URL, max 2MB), `?shop=<slug>` to auto-open a new room, `?room=<id>` deep-link.
  - `/seller/chat` — seller version with different quick replies, embedded in the SellerShell sidebar.
  - Reusable `ChatRoom` component with socket join/leave, optimistic updates, typing indicator, and "read" status.
- **Reviews:**
  - Endpoints `POST /api/v1/reviews` (buyer, only for COMPLETED orders, one review per orderItem), `GET /me/pending`, `GET /products/:productId` (rating + withImage filters + pagination), `GET /shops/:shopId`, `POST /:id/reply` (seller, once only, not editable).
  - Auto-recompute `ratingAvg` + `ratingCount` on Product & Shop whenever a review is added / edited / hidden.
  - Automatic notification to the seller when a new review arrives.
  - `/pesanan/ulasan` page (buyer) — lists items from COMPLETED orders not yet reviewed, modal form with rating + comment + up to 3 photos (data URL).
  - Full "Reviews" section on `/produk/[slug]` — filter chips (All / With photos / 1-5⭐), pagination, renders seller replies.
  - `/seller/ulasan` page — filter by rating, reply to reviews inline.
  - "Write a Review" CTA appears in order details when the status is `COMPLETED`.
- **Notifications:**
  - Endpoints `GET /api/v1/notifications`, `GET /unread-count`, `POST /:id/read`, `POST /read-all`.
  - `<NotifBell />` component in the header with an unread badge (polls every 60 seconds + refetch on focus).
  - `/notifikasi` page — lists the 50 most recent, tap to mark-read + navigate to `linkUrl`, "Mark All Read" button, grouped by type (ORDER_UPDATE / NEW_MESSAGE / PROMO / SYSTEM).
- **Web client:** `lib/socket.ts` Socket.IO singleton that reconnects on token change.

### Fixed
- Product detail page no longer shows the "review feature coming in Milestone 5" placeholder.

## [0.4.0] — 2026-05-03 — Milestone 4: Seller Panel

### Added
- **New API endpoints:**
  - `POST /api/v1/users/me/upgrade-to-seller` — upgrade BUYER→SELLER with automatic slug-collision avoidance.
  - Shop self-management: `GET/PATCH /api/v1/seller/shop`, `POST /seller/shop/toggle-open`.
  - `GET /api/v1/seller/dashboard` — today's orders, this week's revenue, active products, rating, balance, 7-day chart, 5 orders needing action.
  - Seller product CRUD: list with filters (Active/Inactive/Low Stock) + search, get/create/update/delete (soft delete) + duplicate.
  - Seller order management: list per status, detail, process (PAID→PROCESSING), ship (enter tracking number → SHIPPED + pendingBalance increment), mark-delivered, reject (cancel + restore stock + notify buyer).
  - Payment verification: list (PENDING/VERIFIED/REJECTED), approve (set order PAID + notify buyer), reject with reason.
  - Finance: balance + pendingBalance + bank info, withdrawal request (mock auto-PROCESSED after 60 seconds).
- **Seller web pages:**
  - Shell layout with a persistent sidebar (desktop) + drawer (mobile), KTP-verified badge, open/closed status.
  - `/seller` dashboard with 7 metric cards, a 7-day SVG bar chart (no external lib), orders needing action, KTP-pending banner.
  - `/seller/daftar` 5-step wizard (name, description, location, KTP upload, agree to T&C) → auto-refresh JWT to obtain the SELLER role.
  - `/seller/produk` list with status tabs, search, per-item actions (Edit / Duplicate / Activate-Deactivate / Delete).
  - `/seller/produk/baru` & `/seller/produk/[id]/edit` full form: upload up to 5 photos (data URL preview), pick category, price, stock, weight, condition, description, dynamic 1-dimensional variants.
  - `/seller/pesanan` list with 7 status tabs, a card per order.
  - `/seller/pesanan/[id]` detail with buyer info + address + notes, adaptive actions (Process, enter tracking number → Ship, Reject, Mark Delivered), Print Label button.
  - `/seller/pesanan/[id]/print` A6 monochrome print-ready label page (auto-prints on load).
  - `/seller/pembayaran` list of transfer proofs across 3 tabs, image preview, warning when the amount doesn't match, Approve/Reject.
  - `/seller/keuangan` available balance (withdrawable) + held balance, withdrawal form to a saved bank account, withdrawal history.
  - `/seller/pengaturan` shop profile (name, description, logo, banner), open/closed toggle with reason, payout account, chat auto-reply.

### Fixed
- The `/auth/refresh` endpoint re-issues the token from the DB → after upgrade-to-seller, the refresh token will carry the new SELLER role.

## [0.3.0] — 2026-05-02 — Milestone 3: Checkout & Order

### Added
- **New API endpoints:**
  - Address CRUD: `GET/POST/PATCH/DELETE /api/v1/users/me/addresses` — auto-set as default if it's the first address, swap default on update.
  - `POST /api/v1/shipping/quote` — flat rate per zone (Jabodetabek, Java, Outside Java) × kg.
  - `GET /api/v1/shipping/options` — check SAME_DAY and COD availability per province.
  - `POST /api/v1/promo/validate` — validate a promo code against min purchase, max discount, expiry, and quota.
  - `POST /api/v1/orders/checkout` — create an order from the cart. **1 order per shop**: if a buyer picks items from 3 shops, it becomes 3 separate orders with proportional discount sharing. Validates stock, required variants, shop-open status, COD availability. Decrements stock within a transaction.
  - `GET /api/v1/orders` — list orders with status filter & pagination.
  - `GET /api/v1/orders/:id` — detail with a 4-stage dummy tracking based on the shipped timestamp.
  - `POST /api/v1/orders/:id/pay` — QRIS mock auto-paid + seller notification.
  - `GET /api/v1/orders/:id/payment-instruction` — dummy QR code + 4 dummy bank accounts.
  - `POST /api/v1/orders/:id/upload-proof` — upload manual transfer proof.
  - `POST /api/v1/orders/:id/cancel` — cancel + restore stock.
  - `POST /api/v1/orders/:id/complete` — move pending balance → shop balance + increment soldCount.
- **Mock services with adapter pattern:**
  - `MockPaymentProvider` (dummy QRIS + 4 dummy bank accounts).
  - Mock zone-based shipping tariff: Jabodetabek IDR 9,000/kg, Java IDR 14,000/kg, Outside Java IDR 25,000/kg, SAME_DAY for Jabodetabek only.
- **Web pages:**
  - `/akun` — profile menu with logout.
  - `/akun/alamat` — address list + modal CRUD form with Zod validation, can set default.
  - `/checkout` — single sectioned page: pick address, courier per shop, notes per shop, promo code (live server validation), payment method (COD/Transfer/QRIS), dynamic summary, sticky bottom bar.
  - `/pesanan` — status tabs (All, Unpaid, Processing, Shipped, Completed, Cancelled), a card per order with status-colored badges.
  - `/pesanan/[id]` — visual status timeline, dummy tracking for SHIPPED, shop info, items, address, notes, payment summary. Actions per status: Pay with QRIS, Upload Proof, Cancel, Complete, Chat Seller.
  - `/pesanan/[id]/bayar` — list of 4 destination bank accounts, transfer proof upload form (image preview, MIME + 2MB validation), data URL for the demo.
- **Additional seed data:** 3 promo codes (`HEMAT10K`, `DISKON5`, `GRATISONGKIR`) for checkout testing.

### Fixed
- Cart page: the "Buy (X)" button now stores the selected itemIds in sessionStorage so the checkout page can read them.

## [0.2.0] — 2026-05-02 — Milestone 2: Buyer Browse

### Added
- **New API endpoints:**
  - `GET /api/v1/products` — list with filters (q, category, shop, price, rating, condition), 6 sort options, pagination.
  - `GET /api/v1/products/:slug` — detail with images, variants, category, shop info.
  - `GET /api/v1/products/:id/related` — related products by category/shop.
  - `GET /api/v1/products/suggest?q=` — search autocomplete.
  - `POST /api/v1/products/:id/view` — increment view count.
  - `GET /api/v1/banners?placement=` — active banners per placement.
  - `GET /api/v1/shops/featured` — featured shops (KTP-verified, sorted by rating).
  - `GET /api/v1/shops/:slug` — shop detail.
  - Cart CRUD: `GET /api/v1/cart`, `POST /api/v1/cart/items`, `PATCH/DELETE /api/v1/cart/items/:id` — auto-create cart, dedupe items, validate stock & required variants, auto-group per shop.
- **Web pages:**
  - Full home page: auto-sliding banner carousel, category grid, "Trending", "Featured MSME Shops", "Just For You".
  - `/cari` — product list + sort chips + rating/condition filters + pagination.
  - `/kategori` & `/kategori/[slug]` — list of all categories and category detail pages.
  - `/produk/[slug]` — swipeable gallery, key info, shop info, variant selector, qty selector with stock + min-order validation, description, related, sticky bottom action bar.
  - `/toko/[slug]` — shop banner, info, product list.
  - `/keranjang` — grouped per shop, checkbox per item/shop/all, qty editor, delete, sticky checkout bar with dynamic total.
- **Reusable components:** `ProductCard`, `ProductGrid`, `HorizontalRow`, `BannerCarousel`, `FeaturedShops`, `ProductGallery`, `AddToCartBar`, `SortBar`.
- **State management:** `useCartStore` (Zustand) with auto-sync to the server when the user logs in.
- **More seed data:** 8 MSME shops + 31 realistic products (rice, coffee, hijab, cosmetics, spare parts, etc.) + 3 homepage banners.

## [0.1.0] — 2026-05-02 — Milestone 1: Foundation

### Added
- Monorepo setup with workspaces (`apps/web`, `apps/api`, `packages/database`, `packages/shared`).
- Complete Prisma schema for all business entities (User, Shop, Product, Order, Cart, Chat, Review, etc.).
- Auth API endpoints: register, login, refresh, logout, OTP mock, reset password, GET /me.
- Next.js pages: Home placeholder, Register, Login, Forgot Password.
- Shell layout: Header (search + cart + notif), BottomNav (5-item mobile), Footer (desktop).
- Mock OTP service that prints the code to the console (ready to swap to Twilio).
- Basic seed: 15 Indonesian MSME categories + 1 admin account.
- docker-compose for dev (Postgres + Redis + MinIO).
- Complete README (originally in Bahasa Indonesia).
- Happy-path unit tests for auth schema validation.
