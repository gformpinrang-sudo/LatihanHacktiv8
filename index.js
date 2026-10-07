import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import { GoogleGenAI } from '@google/genai';

const app = express();

// ==========================================
// 1. KEAMANAN & KONFIGURASI API KEY
// ==========================================
const API_KEY = process.env.API_KEY || process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.warn('\n⚠️  PERINGATAN KEAMANAN: API_KEY atau GEMINI_API_KEY tidak ditemukan di .env!');
  console.warn('   Pastikan file .env sudah berisi: API_KEY=AIzaSy...\n');
}

const ai = new GoogleGenAI({ apiKey: API_KEY || '' });

// Model default Gemini (dapat dioverride via .env GEMINI_MODEL)
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';

// Batas ukuran file aman (25MB untuk buffer memori agar mencegah Out-of-Memory / DoS)
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
const MAX_PROMPT_CHARS = 20000; // Maksimal 20.000 karakter prompt

// ==========================================
// 2. KONFIGURASI MULTER & KEAMANAN FILE
// ==========================================
const DANGEROUS_EXTENSIONS = new Set([
  'exe', 'bat', 'cmd', 'sh', 'php', 'phtml', 'dll', 'com', 'vbs', 'ps1', 'jar', 'scr', 'msi', 'bin', 'py', 'pl'
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 1, // Hanya boleh 1 file per request
  },
  fileFilter: (req, file, cb) => {
    const ext = file.originalname?.split('.').pop()?.toLowerCase();
    if (ext && DANGEROUS_EXTENSIONS.has(ext)) {
      return cb(new Error(`File berekstensi .${ext} dilarang demi keamanan.`));
    }
    cb(null, true);
  },
});

// Middleware fleksibel untuk menangani upload dari nama field yang umum
const uploadMedia = upload.fields([
  { name: 'file', maxCount: 1 },
  { name: 'image', maxCount: 1 },
  { name: 'document', maxCount: 1 },
  { name: 'audio', maxCount: 1 },
  { name: 'video', maxCount: 1 },
  { name: 'media', maxCount: 1 },
]);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Header keamanan dasar (Security Headers)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// ==========================================
// 3. HELPER FUNCTIONS
// ==========================================

const MIME_BY_EXT = {
  // Images
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  heic: 'image/heic',
  heif: 'image/heif',
  // Audio
  mp3: 'audio/mp3',
  wav: 'audio/wav',
  m4a: 'audio/m4a',
  aac: 'audio/aac',
  ogg: 'audio/ogg',
  flac: 'audio/flac',
  // Video
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  avi: 'video/x-msvideo',
  mkv: 'video/x-matroska',
  // Document
  pdf: 'application/pdf',
  txt: 'text/plain',
  csv: 'text/csv',
  json: 'application/json',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

function extractUploadedFile(req) {
  let file = null;
  if (req.file) file = req.file;
  else if (req.files) {
    const fieldNames = ['file', 'image', 'document', 'audio', 'video', 'media'];
    for (const key of fieldNames) {
      if (req.files[key]?.[0]) {
        file = req.files[key][0];
        break;
      }
    }
  }

  // Koreksi tipe MIME jika client mengirim tipe generic octet-stream
  if (file && (!file.mimetype || file.mimetype === 'application/octet-stream')) {
    const ext = file.originalname?.split('.').pop()?.toLowerCase();
    if (ext && MIME_BY_EXT[ext]) {
      file.mimetype = MIME_BY_EXT[ext];
    }
  }

  return file;
}

function getMediaCategory(mimetype = '') {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('audio/')) return 'audio';
  if (mimetype.startsWith('video/')) return 'video';
  if (
    mimetype.startsWith('text/') ||
    mimetype.includes('pdf') ||
    mimetype.includes('word') ||
    mimetype.includes('document') ||
    mimetype.includes('sheet') ||
    mimetype.includes('presentation') ||
    mimetype.includes('csv') ||
    mimetype.includes('json')
  ) {
    return 'document';
  }
  return 'unknown';
}

function sanitizePrompt(rawPrompt) {
  if (typeof rawPrompt !== 'string') return '';
  return rawPrompt.trim().slice(0, MAX_PROMPT_CHARS);
}

function safeErrorMessage(err) {
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

/**
 * Format part media untuk Gemini API
 */
async function createMediaPart(file) {
  return {
    part: {
      inlineData: {
        mimeType: file.mimetype,
        data: file.buffer.toString('base64'),
      },
    },
    cleanup: null,
  };
}

/**
 * Pemanggilan Gemini dengan auto-retry aman saat 503
 */
async function generateContentWithRetry(model, contents, maxRetries = 2) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await ai.models.generateContent({ model, contents });
    } catch (err) {
      lastError = err;
      const is503 = err?.status === 503 || err?.message?.includes('503');
      if (is503 && attempt < maxRetries) {
        console.warn(`[Retry ${attempt + 1}/${maxRetries}] Model ${model} sibuk (503). Menunggu sebelum mencoba lagi...`);
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

// Middleware validasi API Key aktif sebelum memproses rute AI
function requireApiKey(req, res, next) {
  if (!API_KEY) {
    return res.status(500).json({
      message: 'Server belum dikonfigurasi dengan API Key Gemini. Silakan tambahkan API_KEY di file .env.',
    });
  }
  next();
}

// ==========================================
// 4. ROUTES
// ==========================================

// Health Check & Panduan API
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'online',
    message: 'Server Gemini AI Hacktiv8 aman & aktif.',
    currentModel: GEMINI_MODEL,
    maxFileSize: '25 MB',
    apiKeyConfigured: !!API_KEY,
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
});

// 1. Text Generation Endpoint
app.post('/generate-text', requireApiKey, async (req, res) => {
  const prompt = sanitizePrompt(req.body?.prompt);

  if (!prompt) {
    return res.status(400).json({ message: 'Field "prompt" wajib diisi dan tidak boleh kosong.' });
  }

  try {
    const response = await generateContentWithRetry(GEMINI_MODEL, prompt);
    res.status(200).json({ result: response.text });
  } catch (e) {
    console.error('Error /generate-text:', e?.message || e);
    res.status(e?.status || 500).json({ message: safeErrorMessage(e) });
  }
});

// 2. Endpoint Gambar (Image Analysis)
app.post('/generate-from-image', requireApiKey, uploadMedia, async (req, res) => {
  const file = extractUploadedFile(req);
  const prompt = sanitizePrompt(req.body?.prompt) || 'Deskripsikan dan analisis gambar ini secara detail.';

  if (!file) {
    return res.status(400).json({ message: 'File gambar wajib diunggah (field: image atau file).' });
  }

  if (!file.mimetype?.startsWith('image/')) {
    return res.status(400).json({ message: `File harus berupa gambar, namun terdeteksi: ${file.mimetype || 'tidak dikenal'}` });
  }

  try {
    const media = await createMediaPart(file);
    const contents = [prompt, media.part];

    const response = await generateContentWithRetry(GEMINI_MODEL, contents);
    res.status(200).json({
      result: response.text,
      fileInfo: {
        filename: file.originalname,
        mimetype: file.mimetype,
        sizeBytes: file.size,
        type: 'image',
      },
    });
  } catch (e) {
    console.error('Error /generate-from-image:', e?.message || e);
    res.status(e?.status || 500).json({ message: safeErrorMessage(e) });
  }
});

// 3. Endpoint Dokumen (Document Analysis - PDF, TXT, CSV, dsb.)
app.post('/generate-from-document', requireApiKey, uploadMedia, async (req, res) => {
  const file = extractUploadedFile(req);
  const prompt = sanitizePrompt(req.body?.prompt) || 'Analisis dan buat ringkasan poin-poin penting dari dokumen ini.';

  if (!file) {
    return res.status(400).json({ message: 'File dokumen wajib diunggah (field: document atau file).' });
  }

  const category = getMediaCategory(file.mimetype);
  if (category !== 'document' && !file.mimetype.includes('pdf')) {
    return res.status(400).json({ message: `File harus berupa dokumen (PDF/Teks/CSV), namun terdeteksi: ${file.mimetype || 'tidak dikenal'}` });
  }

  try {
    const media = await createMediaPart(file);
    const contents = [prompt, media.part];

    const response = await generateContentWithRetry(GEMINI_MODEL, contents);
    res.status(200).json({
      result: response.text,
      fileInfo: {
        filename: file.originalname,
        mimetype: file.mimetype,
        sizeBytes: file.size,
        type: 'document',
      },
    });
  } catch (e) {
    console.error('Error /generate-from-document:', e?.message || e);
    res.status(e?.status || 500).json({ message: safeErrorMessage(e) });
  }
});

// 4. Endpoint Audio (Audio Analysis & Transcription)
app.post('/generate-from-audio', requireApiKey, uploadMedia, async (req, res) => {
  const file = extractUploadedFile(req);
  const prompt = sanitizePrompt(req.body?.prompt) || 'Transkripsikan isi audio ini dan jelaskan intisari pembicaraannya.';

  if (!file) {
    return res.status(400).json({ message: 'File audio wajib diunggah (field: audio atau file).' });
  }

  if (!file.mimetype?.startsWith('audio/')) {
    return res.status(400).json({ message: `File harus berupa audio, namun terdeteksi: ${file.mimetype || 'tidak dikenal'}` });
  }

  try {
    const media = await createMediaPart(file);
    const contents = [prompt, media.part];

    const response = await generateContentWithRetry(GEMINI_MODEL, contents);
    res.status(200).json({
      result: response.text,
      fileInfo: {
        filename: file.originalname,
        mimetype: file.mimetype,
        sizeBytes: file.size,
        type: 'audio',
      },
    });
  } catch (e) {
    console.error('Error /generate-from-audio:', e?.message || e);
    res.status(e?.status || 500).json({ message: safeErrorMessage(e) });
  }
});

// 5. Endpoint Video (Video Analysis)
app.post('/generate-from-video', requireApiKey, uploadMedia, async (req, res) => {
  const file = extractUploadedFile(req);
  const prompt = sanitizePrompt(req.body?.prompt) || 'Jelaskan apa yang terjadi dalam video ini secara kronologis dan detail.';

  if (!file) {
    return res.status(400).json({ message: 'File video wajib diunggah (field: video atau file).' });
  }

  if (!file.mimetype?.startsWith('video/')) {
    return res.status(400).json({ message: `File harus berupa video, namun terdeteksi: ${file.mimetype || 'tidak dikenal'}` });
  }

  try {
    const media = await createMediaPart(file);
    const contents = [prompt, media.part];

    const response = await generateContentWithRetry(GEMINI_MODEL, contents);
    res.status(200).json({
      result: response.text,
      fileInfo: {
        filename: file.originalname,
        mimetype: file.mimetype,
        sizeBytes: file.size,
        type: 'video',
      },
    });
  } catch (e) {
    console.error('Error /generate-from-video:', e?.message || e);
    res.status(e?.status || 500).json({ message: safeErrorMessage(e) });
  }
});

// 6. Universal Multimodal Endpoint
app.post('/generate-multimodal', requireApiKey, uploadMedia, async (req, res) => {
  const file = extractUploadedFile(req);

  if (!file) {
    return res.status(400).json({ message: 'File media wajib diunggah (field: file, media, image, audio, video, atau document).' });
  }

  const category = getMediaCategory(file.mimetype);
  const defaultPrompts = {
    image: 'Deskripsikan dan analisis gambar ini secara detail.',
    document: 'Analisis dan buat ringkasan poin-poin penting dari dokumen ini.',
    audio: 'Transkripsikan isi audio ini dan buat ringkasan isinya.',
    video: 'Jelaskan apa yang terjadi dalam video ini secara runtut dan detail.',
    unknown: 'Analisis dan jelaskan isi berkas ini.',
  };

  const prompt = sanitizePrompt(req.body?.prompt) || defaultPrompts[category] || defaultPrompts.unknown;

  try {
    const media = await createMediaPart(file);
    const contents = [prompt, media.part];

    const response = await generateContentWithRetry(GEMINI_MODEL, contents);
    res.status(200).json({
      result: response.text,
      category,
      fileInfo: {
        filename: file.originalname,
        mimetype: file.mimetype,
        sizeBytes: file.size,
      },
    });
  } catch (e) {
    console.error('Error /generate-multimodal:', e?.message || e);
    res.status(e?.status || 500).json({ message: safeErrorMessage(e) });
  }
});

// 7. Chat Endpoint (Multi-turn Conversation)
app.post('/chat', requireApiKey, async (req, res) => {
  const message = sanitizePrompt(req.body?.message);
  const rawHistory = req.body?.history;

  if (!message) {
    return res.status(400).json({ message: 'Field "message" wajib diisi.' });
  }

  // Sanitasi riwayat agar selalu berupa array
  const safeHistory = Array.isArray(rawHistory) ? rawHistory : [];

  try {
    const chat = ai.chats.create({
      model: GEMINI_MODEL,
      history: safeHistory,
    });

    const response = await chat.sendMessage({ message });

    res.status(200).json({
      result: response.text,
      history: chat.getHistory(),
    });
  } catch (e) {
    console.error('Error /chat:', e?.message || e);
    res.status(e?.status || 500).json({ message: safeErrorMessage(e) });
  }
});

// ==========================================
// 5. GLOBAL ERROR HANDLING & 404 ROUTE
// ==========================================

// Tangani route yang tidak terdaftar
app.use((req, res) => {
  res.status(404).json({
    message: `Rute ${req.method} ${req.originalUrl} tidak ditemukan.`,
  });
});

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        message: 'Ukuran file terlalu besar. Batas maksimum adalah 25 MB.',
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        message: 'Hanya diperbolehkan mengunggah 1 file per request.',
      });
    }
    return res.status(400).json({ message: `Kesalahan upload: ${err.message}` });
  }

  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ message: 'Format JSON body tidak valid.' });
  }

  if (err?.message?.includes('dilarang demi keamanan')) {
    return res.status(400).json({ message: err.message });
  }

  console.error('Unhandled Server Error:', err?.message || err);
  res.status(500).json({ message: 'Terjadi kesalahan internal server.' });
});

// ==========================================
// 6. SERVER STARTUP
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 Server aman berjalan pada http://localhost:${PORT}`);
  console.log(`📌 Model aktif: ${GEMINI_MODEL}`);
  console.log(`🔒 Batas upload memori: 25 MB\n`);
});
