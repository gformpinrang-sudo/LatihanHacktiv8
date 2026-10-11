import express from 'express';
import cors from 'cors';
import { securityHeadersMiddleware } from './middlewares/security.middleware.js';
import { notFoundHandler, globalErrorHandler } from './middlewares/error.middleware.js';
import routes from './routes/index.js';

/**
 * Factory / Konfigurasi Utama Aplikasi Express.
 * Memisahkan konfigurasi App dari proses Server Listen (Clean Architecture).
 */
export function createApp() {
  const app = express();

  // 1. Middleware Global
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(securityHeadersMiddleware);

  // 2. Static Assets
  app.use(express.static('static', { index: false }));
  app.use('/static', express.static('static'));

  // 3. Routing Layer
  app.use(routes);

  // 4. Error Handling Layer
  app.use(notFoundHandler);
  app.use(globalErrorHandler);

  return app;
}

export const app = createApp();
