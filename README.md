# FlutterCraft AI - Backend & Architectural Guide

Aplikasi asisten rekayasa perangkat lunak Flutter berbasis **Google Gemini AI** yang dibangun dengan **Express.js**, dirancang menggunakan standar **Clean Code** dan **Prinsip SOLID**.

---

## 🏛️ Arsitektur Proyek & Prinsip SOLID

Struktur proyek telah di-refactor dari bentuk monolitik menjadi pola berlapis (*Layered Clean Architecture*):

```text
d:\Hacktiv8/
├── .env                              # Konfigurasi environment (PORT, API_KEY, GEMINI_MODEL)
├── .env.example                      # Template variabel lingkungan
├── package.json                      # Dependensi & NPM scripts
├── index.js                          # Application bootstrap & entry point (SRP)
├── static/                           # Frontend Web UI (FlutterCraft AI)
│   ├── index.html                    # Halaman antarmuka pengguna
│   ├── style.css                     # Desain tema responsif & modern
│   ├── script.js                     # Logika klien & integrasi API
│   └── flutter-logo.png
└── src/
    ├── config/
    │   └── env.config.js             # [SRP] Single source of truth untuk konfigurasi
    ├── constants/
    │   ├── mime.constants.js         # Konstanta MIME types & blacklist file berbahaya
    │   └── presets.constants.js      # [OCP] Preset System Instructions & domain guardrails
    ├── utils/
    │   ├── sanitizer.util.js         # Sanitasi input string & pemformatan error aman
    │   └── file.util.js              # Ekstraksi file media & multipart converter
    ├── services/
    │   └── gemini.service.js         # [DIP & SRP] Abstraksi Gemini API & retry logic (503)
    ├── middlewares/
    │   ├── auth.middleware.js        # Validasi API key
    │   ├── upload.middleware.js      # Multer parser dengan batas 25 MB & file filtering
    │   ├── security.middleware.js    # Header CORS & keamanan HTTP dasar
    │   └── error.middleware.js       # Centralized 404 & Global Error Handling
    ├── controllers/
    │   ├── health.controller.js      # Handler untuk endpoint /health & /
    │   ├── chat.controller.js        # Handler untuk percakapan multi-turn /chat
    │   └── ai.controller.js          # Handler untuk text & multimodal generation
    ├── routes/
    │   ├── ai.routes.js              # Definisi rute untuk AI endpoints
    │   ├── chat.routes.js            # Definisi rute untuk Chat
    │   └── index.js                  # Agregator router utama
    └── app.js                        # Factory Express App & konfigurasi middleware pipeline
```

---

## 📐 Penerapan Prinsip SOLID

### 1. **S - Single Responsibility Principle (SRP)**
Setiap file, class, dan modul hanya memiliki satu tanggung jawab spesifik:
- `index.js` hanya bertanggung jawab untuk *bootstrapping* dan *listen port*.
- `src/app.js` hanya bertanggung jawab merangkai middleware dan routing Express (tidak mencampur port listening).
- `src/services/gemini.service.js` hanya mengelola interaksi ke Google GenAI SDK beserta retry & fallback-nya.
- `src/controllers/` hanya mengurus parsing HTTP Request dan pengembalian HTTP Response (tidak mencampur logika panggilan SDK mentah).
- `src/middlewares/upload.middleware.js` hanya mengurus parsing form multipart dan validasi file.

### 2. **O - Open/Closed Principle (OCP)**
Modul terbuka untuk perluasan (*open for extension*), namun tertutup untuk modifikasi (*closed for modification*):
- Registry preset `SYSTEM_PRESETS` di [src/constants/presets.constants.js](file:///d:/Hacktiv8/src/constants/presets.constants.js) memungkinkan penambahan mode AI baru tanpa perlu membongkar logika pemrosesan di Controller atau Service.
- Penambahan endpoint atau rute baru cukup menambahkan file rute di `src/routes/` dan di-mount di `src/routes/index.js`.

### 3. **L - Liskov Substitution Principle (LSP)**
Abstraksi layanan dan antarmuka respons terstandarisasi:
- Metode `generateContentWithRetry` dan `sendChatMessage` di `GeminiService` memiliki kontrak respons yang dapat diandalkan secara konsisten oleh seluruh controller.
- Pola error handling mengembalikan schema JSON yang seragam (`{ message: string }`).

### 4. **I - Interface Segregation Principle (ISP)**
Klien/modul hanya bergantung pada apa yang benar-benar mereka butuhkan:
- Endpoint teks (`/generate-text`) hanya menggunakan `requireApiKey` tanpa dibebani middleware berat `uploadMedia`.
- Endpoint yang memerlukan media (`/generate-multimodal`, `/generate-from-image`, dll.) hanya menggunakan `uploadMedia` yang relevan.

### 5. **D - Dependency Inversion Principle (DIP)**
Modul tingkat tinggi (Controllers) tidak bergantung pada detail implementasi tingkat rendah (Google GenAI SDK langsung), melainkan bergantung pada abstraksi Service:
- `AiController` dan `ChatController` memanggil `GeminiService`. Jika spesifikasi atau SDK GenAI di masa depan berubah versi, perubahan hanya perlu dilakukan di dalam `gemini.service.js`.

---

## 🚀 Cara Menjalankan

1. **Jalankan server pengembangan (Hot Reload):**
   ```bash
   npm run dev
   ```
2. **Jalankan server mode produksi:**
   ```bash
   npm start
   ```
3. **Buka Web UI di Browser:**
   - **Frontend App:** [http://localhost:3000/static](http://localhost:3000/static)
   - **Health Check:** [http://localhost:3000/health](http://localhost:3000/health)
   - **API Documentation:** [http://localhost:3000](http://localhost:3000)
