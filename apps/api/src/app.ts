import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { logger } from './lib/logger';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { addressRouter } from './modules/address/address.routes';
import { adminBannerRouter } from './modules/admin/admin.banner.routes';
import { adminCategoryRouter } from './modules/admin/admin.category.routes';
import { adminDashboardRouter } from './modules/admin/admin.dashboard.routes';
import { adminProductRouter } from './modules/admin/admin.product.routes';
import { adminRefundRouter } from './modules/admin/admin.refund.routes';
import { adminReportRouter } from './modules/admin/admin.report.routes';
import { adminShopRouter } from './modules/admin/admin.shop.routes';
import { adminUserRouter } from './modules/admin/admin.user.routes';
import { adminVoucherRouter } from './modules/admin/admin.voucher.routes';
import { authRouter } from './modules/auth/auth.routes';
import { bannerRouter } from './modules/banner/banner.routes';
import { cartRouter } from './modules/cart/cart.routes';
import { categoryRouter } from './modules/category/category.routes';
import { chatRouter } from './modules/chat/chat.routes';
import { discussionRouter } from './modules/discussion/discussion.routes';
import { healthRouter } from './modules/health/health.routes';
import { notificationRouter } from './modules/notification/notification.routes';
import { orderRouter } from './modules/order/order.routes';
import { productRouter } from './modules/product/product.routes';
import { promoRouter } from './modules/promo/promo.routes';
import { recentlyViewedRouter } from './modules/recentlyViewed/recentlyViewed.routes';
import { reportRouter } from './modules/report/report.routes';
import { reviewRouter } from './modules/review/review.routes';
import { scraperRouter } from './modules/scraper/scraper.routes';
import { searchRouter } from './modules/search/search.routes';
import { sellerChatTemplateRouter } from './modules/seller/seller.chatTemplate.routes';
import { sellerDashboardRouter } from './modules/seller/seller.dashboard.routes';
import { sellerFinanceRouter } from './modules/seller/seller.finance.routes';
import { sellerOrderRouter } from './modules/seller/seller.order.routes';
import { sellerPaymentRouter } from './modules/seller/seller.payment.routes';
import { sellerProductRouter } from './modules/seller/seller.product.routes';
import { sellerShopRouter } from './modules/seller/seller.shop.routes';
import { sellerVoucherRouter } from './modules/seller/seller.voucher.routes';
import { shippingRouter } from './modules/shipping/shipping.routes';
import { shopRouter } from './modules/shop/shop.routes';
import { wishlistRouter } from './modules/wishlist/wishlist.routes';

export function createApp(): Application {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: process.env.WEB_ORIGIN?.split(',') ?? [
        'http://localhost:3000',
      ],
      credentials: true,
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(pinoHttp({ logger }));

  // Health & root
  app.use('/api/health', healthRouter);
  app.get('/', (_req, res) => {
    res.json({ success: true, data: { name: 'Tokopudidi API', version: '0.1.0' } });
  });

  // v1 routes
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/banners', bannerRouter);
  app.use('/api/v1/cart', cartRouter);
  app.use('/api/v1/categories', categoryRouter);
  app.use('/api/v1/chats', chatRouter);
  app.use('/api/v1/discussions', discussionRouter);
  app.use('/api/v1/notifications', notificationRouter);
  app.use('/api/v1/orders', orderRouter);
  app.use('/api/v1/products', productRouter);
  app.use('/api/v1/promo', promoRouter);
  app.use('/api/v1/reports', reportRouter);
  app.use('/api/v1/reviews', reviewRouter);
  app.use('/api/v1/search', searchRouter);
  app.use('/api/v1/shipping', shippingRouter);
  app.use('/api/v1/shops', shopRouter);
  app.use('/api/v1/users/me/addresses', addressRouter);
  app.use('/api/v1/users/me/wishlist', wishlistRouter);
  app.use('/api/v1/users/me/recent-products', recentlyViewedRouter);

  // Seller panel
  app.use('/api/v1/users/me', sellerShopRouter);  // /upgrade-to-seller
  app.use('/api/v1/seller', sellerShopRouter);    // /shop, /shop/toggle-open
  app.use('/api/v1/seller', sellerDashboardRouter); // /dashboard
  app.use('/api/v1/seller/products', sellerProductRouter);
  app.use('/api/v1/seller/orders', sellerOrderRouter);
  app.use('/api/v1/seller/payments', sellerPaymentRouter);
  app.use('/api/v1/seller/finance', sellerFinanceRouter);
  app.use('/api/v1/seller/chat-templates', sellerChatTemplateRouter);
  app.use('/api/v1/seller/voucher', sellerVoucherRouter);

  // Admin panel
  app.use('/api/v1/admin', adminDashboardRouter);          // /dashboard
  app.use('/api/v1/admin/users', adminUserRouter);
  app.use('/api/v1/admin/shops', adminShopRouter);
  app.use('/api/v1/admin/products', adminProductRouter);
  app.use('/api/v1/admin/refunds', adminRefundRouter);
  app.use('/api/v1/admin/reports', adminReportRouter);
  app.use('/api/v1/admin/voucher', adminVoucherRouter);
  app.use('/api/v1/admin/banners', adminBannerRouter);
  app.use('/api/v1/admin/categories', adminCategoryRouter);
  app.use('/api/v1/admin/scrape', scraperRouter);

  // 404 + error
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
