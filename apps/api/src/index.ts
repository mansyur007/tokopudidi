import 'dotenv/config';
import { createServer } from 'http';
import { createApp } from './app';
import { logger } from './lib/logger';
import { attachSocketServer } from './modules/chat/chat.realtime';

const PORT = Number(process.env.API_PORT ?? 4000);

const app = createApp();
const httpServer = createServer(app);

// Attach Socket.IO server di HTTP server yang sama (port 4000).
attachSocketServer(httpServer);

httpServer.listen(PORT, () => {
  logger.info(`🚀 API Tokopudidi siap di http://localhost:${PORT}`);
  logger.info(`🔌 Socket.IO siap di ws://localhost:${PORT}`);
});
