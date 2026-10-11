/**
 * Application Entry Point
 * Bertanggung jawab hanya untuk bootstrapping dan menjalankan HTTP server.
 * Mematuhi Single Responsibility Principle (SRP).
 */
import { app } from './src/app.js';
import { ENV } from './src/config/env.config.js';

app.listen(ENV.PORT, () => {
  console.log(`\n🚀 Server aman berjalan pada http://localhost:${ENV.PORT}`);
  console.log(`📌 Model aktif: ${ENV.GEMINI_MODEL}`);
  console.log(`🔒 Batas upload memori: 25 MB\n`);
});
