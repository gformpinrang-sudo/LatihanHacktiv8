import { ENV } from '../config/env.config.js';

/**
 * Sanitasi string prompt untuk mencegah input kosong, whitespace berlebih, atau payload raksasa.
 * @param {any} rawPrompt
 * @param {number} [maxChars]
 * @returns {string}
 */
export function sanitizePrompt(rawPrompt, maxChars = ENV.MAX_PROMPT_CHARS) {
  if (typeof rawPrompt !== 'string') return '';
  return rawPrompt.trim().slice(0, maxChars);
}

/**
 * Mengubah pesan error teknis menjadi respons yang aman, informatif, dan ramah pengguna.
 * Mencegah kebocoran stack trace internal ke client (Security Best Practice).
 * @param {any} err
 * @returns {string}
 */
export function safeErrorMessage(err) {
  const msg = err?.message || '';

  if (err?.status === 429 || msg.includes('429') || msg.includes('Quota exceeded')) {
    return 'Batas kuota harian Gemini API terlampaui (Rate Limit / Quota Exceeded). Silakan coba lagi nanti.';
  }

  if (err?.status === 503 || msg.includes('503') || msg.includes('high demand')) {
    return 'Server Gemini sedang mengalami lonjakan permintaan (High Demand). Silakan coba beberapa saat lagi.';
  }

  if (err?.status === 400 || msg.includes('INVALID_ARGUMENT')) {
    return 'Format data tidak didukung oleh model AI.';
  }

  if (err?.status === 404) {
    return 'Model AI yang dituju tidak ditemukan atau sudah tidak tersedia.';
  }

  return 'Terjadi kesalahan saat memproses data ke AI.';
}
