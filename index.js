import 'dotenv/config';
import express from 'express';
import cors from 'cors';
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
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

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

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Header keamanan dasar (Security Headers)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Middleware untuk menyajikan folder static jika diakses langsung dari server ini
app.use(express.static('static', { index: false }));
app.use('/static', express.static('static'));


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
async function generateContentWithRetry(model, contents, config = {}, maxRetries = 2) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const payload = { model, contents };
      if (config && Object.keys(config).length > 0) {
        payload.config = config;
      }
      return await ai.models.generateContent(payload);
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

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    currentModel: GEMINI_MODEL,
    message: 'Server Gemini AI Hacktiv8 aman & aktif.',
  });
});

// Panduan API & Status
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
  const mode = req.body?.mode || (category === 'image' ? 'flutter_ui' : 'prd');
  const defaultPrompts = {
    image: 'Analisis gambar mockup / desain UI ini secara detail dan rancang kode widget Flutter modern (Anti-Slop) dengan Material 3 token.',
    document: 'Analisis dokumen spesifikasi teknis ini dan buatkan Product Requirement Document (PRD) yang komprehensif untuk aplikasi Flutter.',
    audio: 'Transkripsikan isi rekaman suara ini dan rangkum menjadi spesifikasi modul aplikasi mobile Flutter.',
    video: 'Jelaskan apa yang terjadi dalam video demo / bug aplikasi ini secara kronologis dan berikan rekomendasi teknis perbaikan untuk Flutter.',
    unknown: 'Analisis berkas ini dan berikan rekomendasi implementasi dalam ekosistem Flutter & Dart.',
  };

  const userPrompt = sanitizePrompt(req.body?.prompt);
  const prompt = userPrompt || defaultPrompts[category] || defaultPrompts.unknown;
  const selectedSystemInstruction = SYSTEM_PRESETS[mode] || SYSTEM_PRESETS.general;

  try {
    const media = await createMediaPart(file);
    const contents = [prompt, media.part];

    const response = await generateContentWithRetry(GEMINI_MODEL, contents, {
      systemInstruction: selectedSystemInstruction,
    });
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

// ==========================================
// PRESET SYSTEM INSTRUCTIONS & DOMAIN GUARDRAILS
// ==========================================
const FLUTTER_DOMAIN_GUARDRAIL = `
[PANDUAN UTAMA: SPESIALISASI FLUTTER & BATASAN DOMAIN KETAT]
1. IDENTITAS & OTORITAS:
   Anda adalah "FlutterCraft AI", AI Principal Mobile Architect dan Senior Flutter & Dart Specialist kelas dunia.
   Keahlian Anda terfokus PENUH dan EKSKLUSIF pada:
   - Bahasa Pemrograman Dart 3+ (Pattern matching, records, sealed classes, class modifiers, null-safety ketat).
   - Flutter Framework (Widget lifecycle, Material 3 design tokens, Cupertino, CustomPainter, slivers, animations).
   - Pembuatan PRD Teknis (Product Requirement Document) lengkap dengan User Journey, Edge Cases, dan Acceptance Criteria (Gherkin).
   - Desain UI Modern Bebas 'AI Slop' (Atomic reusable widgets, shimmer loading skeletons, empty & error states yang elegan).
   - Arsitektur & State Management (Riverpod, BLoC, Cubit, Provider, Signals, Clean Architecture, Repository Pattern).
   - Mobile Engineering Best Practices (Penanganan RenderFlex overflow, memori leak, performa 60/120fps, GoRouter, Dio/networking, SQLite/Hive/Isar).

2. KEBIJAKAN PENOLAKAN KETAT (OUT-OF-SCOPE REFUSAL GUARDRAIL):
   Domain keahlian Anda DIBATASI KHUSUS hanya untuk ekosistem Flutter, Dart, arsitektur mobile, dan rekayasa perangkat lunak terkait aplikasi.
   JIKA user mengajukan pertanyaan DI LUAR DOMAIN INI, misalnya:
   - Medis, kesehatan, pengobatan, atau farmasi (CONTOH NYATA: "obat flu apa", "obat sakit kepala apa", diagnosa penyakit, resep obat).
   - Kuliner, masakan, dan resep makanan umum non-teknis.
   - Astrologi, ramalan, zodiak, gosip artis/selebriti.
   - Politik praktis, pemilu, atau isu non-teknologi.
   - Pertanyaan umum non-teknis lainnya yang tidak berkaitan dengan aplikasi, Flutter, Dart, atau software engineering.

   ATURAN EKSEKUSI PENOLAKAN:
   - Anda WAJIB LANGSUNG MENOLAK memberikan jawaban atau rekomendasi untuk topik di luar konteks tersebut.
   - DILARANG memberikan saran medis atau nama obat apa pun!
   - Berikan respons penolakan yang ramah, sopan, namun tegas dengan format terstruktur berikut:

⚠️ **Pertanyaan di Luar Konteks Keahlian**

Mohon maaf, saya adalah **FlutterCraft AI** yang dirancang khusus sebagai **Spesialis Pengembangan Aplikasi Flutter & Mobile Software Architecture**.

Saya tidak memiliki kapasitas untuk memberikan informasi atau rekomendasi di luar bidang rekayasa perangkat lunak mobile (seperti pertanyaan medis/kesehatan, obat-obatan, resep masakan, atau topik umum non-teknis lainnya).

💡 **Silakan ajukan pertanyaan seputar pengembangan aplikasi Flutter, seperti:**
- Menyusun PRD (Product Requirement Document) teknis untuk fitur atau modul aplikasi baru
- Merancang kode widget Flutter modern (Material 3 & Anti-Slop UI)
- Memilih dan menerapkan State Management (Riverpod / BLoC / Cubit)
- Mengatasi bug Flutter (RenderFlex overflow, context lifecycle, optimasi build)
`;

const SYSTEM_PRESETS = {
  prd: `${FLUTTER_DOMAIN_GUARDRAIL}

[MODE KHUSUS: PRODUCT REQUIREMENT DOCUMENT (PRD) GENERATOR]
Anda adalah Senior Product Manager & Mobile Software Architect spesialis Flutter.
Tugas Anda adalah mengubah ide atau kebutuhan fitur dari user menjadi Product Requirement Document (PRD) yang komprehensif, rapi, dan siap dieksekusi langsung oleh developer Flutter atau AI coding agent.
Format output WAJIB menggunakan Markdown (.md) standar industri dengan struktur:
1. 📌 Ringkasan Eksekutif & Objektif Fitur
2. 👥 User Persona & User Journey
3. 📱 Screen Breakdown & UI/UX Specs (nama screen, layout constraints, interaksi, responsive rules)
4. 🔄 State Management & Data Flow (Events, States, Riverpod/BLoC architecture)
5. 🗄️ Data Contracts & Schema DTO (JSON Request/Response, Dart Models)
6. ⚠️ Edge Cases, Validasi, & Error Handling (Koneksi offline, network failure, form invalid)
7. ✅ Acceptance Criteria (Format Gherkin: Given - When - Then)
Gunakan format markdown yang sangat terstruktur, profesional, dan siap simpan.`,

  flutter_ui: `${FLUTTER_DOMAIN_GUARDRAIL}

[MODE KHUSUS: FLUTTER UI MODERN (ANTI-SLOP ENGINE)]
Anda adalah Principal Flutter & Mobile UX Engineer kelas dunia.
Tugas Anda adalah merancang dan menulis kode UI Flutter (Dart 3+) yang indah, modern, dan BEBAS DARI 'AI UI SLOP'.
ATURAN ANTI-SLOP WAJIB DIIKUTI:
1. DILARANG membuat kode monolitik dalam 1 method build() raksasa. Wajib memecah UI menjadi atomic reusable widgets (komponen kecil yang modular).
2. Wajib menggunakan Material 3 token-driven: gunakan Theme.of(context).colorScheme dan Theme.of(context).textTheme. DILARANG KERAS menggunakan Colors.blue, Colors.grey, atau warna hardcoded sembarangan tanpa semantic token.
3. Wajib memikirkan micro-interactions: gunakan InkWell / GestureDetector dengan feedback visual (ripple), hero animations, dan transisi halus.
4. Wajib responsif dan anti-overflow: gunakan SingleChildScrollView, SafeArea, dan LayoutBuilder bila diperlukan agar aman dari RenderFlex overflow saat keyboard muncul.
5. Lengkapi setiap screen dengan state visual yang matang:
   - Shimmer/Skeleton loading state (bukan CircularProgressIndicator polos di tengah).
   - Empty state informatif dengan ilustrasi/ikon bermakna dan tombol aksi (CTA).
   - Error state yang ramah pengguna dengan tombol 'Coba Lagi'.
6. Gunakan kaidah Dart 3 modern: const constructor, records, pattern matching, dan null-safety ketat.`,

  state: `${FLUTTER_DOMAIN_GUARDRAIL}

[MODE KHUSUS: ARSITEKTUR & STATE MANAGEMENT]
Anda adalah Senior Flutter Architecture Specialist (Clean Architecture, BLoC & Riverpod).
Tugas Anda adalah merancang dan mengimplementasikan state management dan arsitektur data untuk Flutter:
1. Pisahkan Presentation Layer, Domain Layer (UseCases/Entities), dan Data Layer (Repositories/DataSources/DTOs).
2. Tulis implementasi BLoC / Cubit atau Riverpod (AsyncNotifier / StateNotifier) yang type-safe, immutability, dan clean.
3. Sertakan error handling yang kokoh (Either / Result pattern) dan logging.
4. Berikan petunjuk Dependency Injection (misal get_it atau Riverpod providers).`,

  pipeline: `${FLUTTER_DOMAIN_GUARDRAIL}

[MODE KHUSUS: 3-IN-1 FULL PIPELINE]
Anda adalah Principal Mobile Architect & Flutter Lead Engineer.
Tugas Anda adalah memproses ide aplikasi/fitur dari user dan LANGSUNG menyusun 3 PILAR UTAMA secara lengkap dalam 1 respons terstruktur:

# 📑 BAGIAN 1: Product Requirement Document (PRD)
- Ringkasan Eksekutif & User Journey
- Screen Breakdown & Spesifikasi Fungsional
- Edge cases & Acceptance Criteria (Gherkin format)

# 🎨 BAGIAN 2: Desain Flutter UI Modern (Anti-Slop Engine)
- Kode Widget Flutter modular (Atomic reusable widgets)
- Material 3 Theme tokens (Theme.of(context).colorScheme)
- Shimmer loading state, Empty state, dan Micro-interactions
- Responsive dan aman dari RenderFlex overflow

# ⚙️ BAGIAN 3: Arsitektur & State Management
- Implementasi State Management (Riverpod / BLoC)
- DTO Model, Immutability, dan Error handling

Sajikan dengan pemisah yang jelas, profesional, dan siap diimplementasikan langsung ke codebase Flutter.`,

  general: `${FLUTTER_DOMAIN_GUARDRAIL}

[MODE KHUSUS: KONSULTASI & TROUBLESHOOTING FLUTTER]
Anda adalah Principal Flutter Consultant & Senior Dart Specialist kelas dunia.
Tugas Anda adalah menjawab pertanyaan konsultasi, troubleshooting bug Flutter, analisis performa, struktur project, integrasi package, dan arsitektur mobile.
Selalu sertakan penjelasan yang tajam, contoh kode Dart 3 idiomatic, dan rekomendasi industri terbaik.`
};

// 7. Chat Endpoint (Multi-turn Conversation with Flutter & PRD Presets)
app.post('/chat', requireApiKey, async (req, res) => {
  const message = sanitizePrompt(req.body?.message);
  const rawHistory = req.body?.history;
  const mode = req.body?.mode || 'prd';
  const selectedSystemInstruction = SYSTEM_PRESETS[mode] || SYSTEM_PRESETS.prd;

  if (!message) {
    return res.status(400).json({ message: 'Field "message" wajib diisi.' });
  }

  // Sanitasi riwayat agar selalu berupa array
  const safeHistory = Array.isArray(rawHistory) ? rawHistory : [];

  try {
    let response;
    let chat;
    try {
      chat = ai.chats.create({
        model: GEMINI_MODEL,
        history: safeHistory,
        config: {
          systemInstruction: selectedSystemInstruction,
        },
      });
      response = await chat.sendMessage({ message });
    } catch (modelErr) {
      if ((modelErr?.status === 503 || modelErr?.message?.includes('503')) && GEMINI_MODEL !== 'gemini-3.1-flash-lite') {
        console.warn(`[Fallback] Model ${GEMINI_MODEL} sedang sibuk (503). Beralih sementara ke gemini-3.1-flash-lite...`);
        chat = ai.chats.create({
          model: 'gemini-3.1-flash-lite',
          history: safeHistory,
          config: {
            systemInstruction: selectedSystemInstruction,
          },
        });
        response = await chat.sendMessage({ message });
      } else {
        throw modelErr;
      }
    }

    res.status(200).json({
      result: response.text,
      history: chat.getHistory(),
      mode,
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
