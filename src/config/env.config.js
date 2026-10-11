import 'dotenv/config';

/**
 * Konfigurasi Terpusat Aplikasi (Single Source of Truth)
 * Mengisolasi dependensi process.env agar mematuhi Single Responsibility Principle (SRP).
 */
export const ENV = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  API_KEY: process.env.API_KEY || process.env.GEMINI_API_KEY || '',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
  FALLBACK_MODEL: 'gemini-3.1-flash-lite',
  MAX_FILE_SIZE_BYTES: 25 * 1024 * 1024, // 25 MB
  MAX_PROMPT_CHARS: 20000,
  NODE_ENV: process.env.NODE_ENV || 'development',
};

// Peringatan saat startup jika API Key belum disetel
if (!ENV.API_KEY) {
  console.warn('\n⚠️  PERINGATAN KEAMANAN: API_KEY atau GEMINI_API_KEY tidak ditemukan di .env!');
  console.warn('   Pastikan file .env sudah berisi: API_KEY=AIzaSy...\n');
}
