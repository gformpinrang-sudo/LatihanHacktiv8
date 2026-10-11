import { ENV } from '../config/env.config.js';

/**
 * Controller untuk status kesehatan server dan info rute API.
 */
export class HealthController {
  /**
   * Endpoint /health
   */
  static getHealth(req, res) {
    res.status(200).json({
      status: 'online',
      currentModel: ENV.GEMINI_MODEL,
      defaultModel: ENV.GEMINI_MODEL,
      availableModels: [
        {
          id: 'gemini-3.8-flash',
          shortName: '3.8-flash',
          name: 'Gemini 3.8 Flash',
          tag: 'Terbaru ⚡',
          isDefault: true,
          desc: 'Model terbaru & rekomendasi utama: respons kilat, cerdas, & efisien untuk PRD & Flutter UI.',
        },
        {
          id: 'gemini-2.5-pro',
          shortName: '2.5-pro',
          name: 'Gemini 2.5 Pro',
          tag: 'Pro 🧠',
          isDefault: false,
          desc: 'Penalaran mendalam (Deep Reasoning) untuk audit arsitektur mobile & logika kompleks.',
        },
        {
          id: 'gemini-2.5-flash',
          shortName: '2.5-flash',
          name: 'Gemini 2.5 Flash',
          tag: 'Flash ⚡',
          isDefault: false,
          desc: 'Model Flash stabil generasi sebelumnya dengan latensi konsisten.',
        },
        {
          id: 'gemini-3.1-flash-lite',
          shortName: '3.1-flash-lite',
          name: 'Gemini 3.1 Flash Lite',
          tag: 'Lite 🪶',
          isDefault: false,
          desc: 'Varian super hemat kuota token, respon ultra ringan & fallback andal.',
        },
      ],
      message: 'Server Gemini AI Hacktiv8 aman & aktif.',
    });
  }

  /**
   * Endpoint / (Ringkasan info & dokumentasi API)
   */
  static getRootInfo(req, res) {
    res.status(200).json({
      status: 'online',
      message: 'Server Gemini AI Hacktiv8 aman & aktif.',
      currentModel: ENV.GEMINI_MODEL,
      maxFileSize: '25 MB',
      apiKeyConfigured: Boolean(ENV.API_KEY),
      endpoints: [
        {
          method: 'POST',
          path: '/generate-text',
          description: 'Teks saja (Text Generation)',
          body: { prompt: 'string (wajib, maks 20000 karakter)' },
        },
        {
          method: 'POST',
          path: '/generate-from-image',
          description: 'Analisis gambar (JPG, PNG, WEBP, GIF, dll.)',
          form: { image: 'file (wajib)', prompt: 'string (opsional)' },
        },
        {
          method: 'POST',
          path: '/generate-from-document',
          description: 'Analisis dokumen (PDF, TXT, CSV, dll.)',
          form: { document: 'file (wajib)', prompt: 'string (opsional)' },
        },
        {
          method: 'POST',
          path: '/generate-from-audio',
          description: 'Transkripsi & analisis audio (MP3, WAV, AAC, M4A, OGG, dll.)',
          form: { audio: 'file (wajib)', prompt: 'string (opsional)' },
        },
        {
          method: 'POST',
          path: '/generate-from-video',
          description: 'Analisis video (MP4, WEBM, MOV, AVI, dll.)',
          form: { video: 'file (wajib)', prompt: 'string (opsional)' },
        },
        {
          method: 'POST',
          path: '/generate-multimodal',
          description: 'Universal Multimodal (Deteksi otomatis Gambar, Dokumen, Audio, atau Video)',
          form: { file: 'file (wajib)', prompt: 'string (opsional)' },
        },
        {
          method: 'POST',
          path: '/chat',
          description: 'Percakapan multi-turn (Chat Conversation)',
          body: { message: 'string (wajib)', history: 'array (opsional)' },
        },
      ],
    });
  }
}
