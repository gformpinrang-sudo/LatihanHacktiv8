import { ENV } from '../config/env.config.js';

/**
 * Middleware untuk memastikan API Key Gemini sudah terpasang sebelum memproses rute AI.
 * Memenuhi Interface Segregation & Single Responsibility Principle.
 */
export function requireApiKey(req, res, next) {
  if (!ENV.API_KEY) {
    return res.status(500).json({
      message: 'Server belum dikonfigurasi dengan API Key Gemini. Silakan tambahkan API_KEY di file .env.',
    });
  }
  next();
}
