# 🏛️ Cetak Biru Arsitektur Flutter: Golden Clean Architecture & SOLID

Dokumen ini merupakan panduan arsitektur resmi (*Architectural Blueprint*) yang mendefinisikan standar teknologi, prinsip desain, struktur folder, dan alur data sebelum masuk ke tahap penyusunan Product Requirement Document (PRD).

---

## 1. Ikhtisar Arsitektur: Feature-First Clean Architecture

Arsitektur aplikasi mengadopsi variasi **Feature-First Clean Architecture** yang membagi kode ke dalam 3 lapisan utama (*layers*) dengan aturan ketergantungan searah ke dalam (*Dependency Inversion*):

```text
       ┌─────────────────────────────────────────────────────────┐
       │                   PRESENTATION LAYER                    │
       │   Widgets / Screens ───► BLoC / Cubit ───► UI States    │
       └────────────────────────────┬────────────────────────────┘
                                    │ Memanggil
                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │                      DOMAIN LAYER                       │
       │   UseCases ───► Entities (Pure) ───► Repository Interfaces│
       └────────────────────────────▲────────────────────────────┘
                                    │ Diimplementasikan oleh
                                    │
       ┌─────────────────────────────────────────────────────────┐
       │                       DATA LAYER                        │
       │   Repository Impl ───► DataSources (Remote/Local)       │
       │   Dio (Remote API) ───► Drift SQLite (Local DB)         │
       │   DTOs / Data Models (Freezed & JsonSerializable)       │
       └─────────────────────────────────────────────────────────┘
```

* **Presentation Layer:** Hanya bertugas menampilkan UI dan mereaksikan interaksi user. Bergantung hanya pada Domain Layer.
* **Domain Layer (Jantung Aplikasi):** Berisi logika bisnis murni tanpa dependensi ke framework eksternal (bebas dari Flutter SDK, Dio, atau Drift).
* **Data Layer:** Mengelola pengambilan data dari server (Remote) atau basis data lokal (Local), lalu mengonversinya menjadi entitas Domain.

---

## 2. Matriks Komponen Teknologi "Golden Stack" & Kegunaannya

Berikut rincian lengkap tiap teknologi yang dipilih beserta peran spesifiknya:

| Kategori | Teknologi / Package | Kegunaan Spesifik dalam Arsitektur | Alasan Pemilihan & Nilai Tambah |
| :--- | :--- | :--- | :--- |
| **State Management** | `flutter_bloc` & `bloc` | Mengelola *business logic* dan *state transition* yang kompleks dengan pola *Event-Driven* yang terprediksi. | Memisahkan UI dan Logika secara ketat (SRP). Sangat mudah diaudit dan diuji (*unit testing*) menggunakan `bloc_test`. |
| **Simple State** | `cubit` (Bagian dari BLoC) | Mengelola state UI yang sifatnya sederhana (misal: toggle tema, switch tab, counter, validasi form lokal). | Mengurangi boilerplate event jika tidak membutuhkan audit event atau event transformation (seperti debounce). |
| **Data Immutability** | `freezed` & `freezed_annotation` | Membuat data class yang *immutable*, menghasilkan method `copyWith`, `toString`, `operator ==`, serta Union / Sealed class states. | Menghilangkan bug mutasi objek secara tidak sengaja (*side effects*). Memungkinkan *pattern matching* yang aman saat render UI (`state.when(...)`). |
| **Data Serialization** | `json_serializable` | Melakukan parsing otomatis JSON ke Dart object dan sebaliknya (`fromJson` / `toJson`). | Mencegah kesalahan ketik (*typo*) pada map string key dan mendukung null-safety yang ketat. |
| **Local Database (Relational)** | `drift` & `drift_flutter` (SQLite) | ORM SQLite lokal yang 100% *Type-Safe* untuk penyimpanan offline, relasi data antar tabel, dan caching. | Query diverifikasi saat compile-time (bukan runtime query string). Mendukung sinkronisasi *Stream* reaktif ke UI. |
| **Key-Value & Secure Storage** | `flutter_secure_storage` & `shared_preferences` | Menyimpan kredensial sensitif (Access Token, Refresh Token) di Keychain/Keystore dan preferensi non-sensitif (tema, onboarding). | Proteksi enkripsi data sensitif di perangkat pengguna. |
| **HTTP Client & Network** | `dio` | Menangani seluruh request REST API / GraphQL ke server backend. | Mendukung **Interceptors** (otomatis inject token JWT, auto-refresh token saat 401, timeout handling, dan logging). |
| **Network Debugging** | `pretty_dio_logger` | Mencetak format request & response HTTP secara rapi di console debugging terminal. | Mempermudah penelusuran bug jaringan tanpa harus menggunakan network inspector pihak ketiga. |
| **Dependency Injection** | `get_it` + `injectable` | Service Locator & DI Container untuk mendaftarkan Singleton, Factory, dan LazySingleton. | Mematuhi **Dependency Inversion Principle (DIP)**. Memudahkan *mocking* dependensi saat automated testing. |
| **Routing & Navigasi** | `go_router` | Navigasi deklaratif resmi yang mendukung URL path, deep linking, parameter query, dan sub-routing. | Mendukung fungsi `redirect` guard (misal: otomatis mengarahkan ke halaman login jika user belum terautentikasi). |
| **Functional Error Handling** | `fpdart` | Menyediakan tipe `Either<Failure, Success>` untuk mengembalikan status operasi bisnis. | Menggantikan blok `try-catch` liar di UI. Memaksa developer menangani kemungkinan kegagalan secara eksplisit. |

---

## 3. Struktur Folder Standar (Feature-First)

Struktur direktori disusun modular berdasarkan fitur bisnis (*Feature-First*):

```text
lib/
├── app.dart                          # Inisialisasi MaterialApp, router, & global theme
├── main.dart                         # Entry point utama & inisialisasi dependency injection
│
├── core/                             # Komponen bersama lintas fitur (Shared/Core)
│   ├── constants/                    # URL endpoints, storage keys, asset paths
│   ├── database/                     # Setup Drift SQLite Database & Tables
│   ├── di/                           # Inisialisasi GetIt & Injectable
│   ├── errors/                       # Failure & Exception classes
│   │   ├── exceptions.dart
│   │   └── failures.dart
│   ├── network/                      # Konfigurasi Dio, Interceptors, & NetworkInfo
│   ├── router/                       # Konfigurasi GoRouter & route guards
│   ├── theme/                        # Material 3 ColorScheme, TextTheme, & Tokens
│   └── usecase/                      # Base UseCase interface (fpdart Either)
│
└── features/                         # Modular per fitur bisnis
    ├── auth/                         # Fitur Autentikasi
    │   ├── data/
    │   │   ├── datasources/          # AuthRemoteDataSource & AuthLocalDataSource
    │   │   ├── models/               # UserModel (Freezed + json_serializable)
    │   │   └── repositories/         # AuthRepositoryImpl
    │   ├── domain/
    │   │   ├── entities/             # UserEntity (Pure Dart)
    │   │   ├── repositories/         # AuthRepository (Interface / Contract)
    │   │   └── usecases/             # LoginUseCase, LogoutUseCase, GetCurrentUserUseCase
    │   └── presentation/
    │       ├── bloc/                 # AuthBloc, AuthEvent, AuthState (Freezed)
    │       ├── screens/              # LoginScreen, RegisterScreen
    │       └── widgets/              # AuthButton, AuthTextField, SocialLoginRow
    │
    └── [feature_lain]/               # Fitur berikutnya mengikuti pola 3 layer yang sama
```

---

## 4. Contoh Aliran Data End-to-End (Data Flow Pipeline)

Alur ketika pengguna menekan tombol "Login":

1. **Widget UI:** Pengguna klik tombol "Login" ➔ Menembakkan event `AuthEvent.loginSubmitted(email, password)` ke `AuthBloc`.
2. **BLoC Layer:** `AuthBloc` meng-emit state `AuthState.loading()` ➔ Memanggil `LoginUseCase.call(params)`.
3. **Domain Layer (UseCase):** `LoginUseCase` memanggil method kontrak `authRepository.login(email, password)`.
4. **Data Layer (Repository Impl):**
   - Memanggil `authRemoteDataSource.login(...)` yang menggunakan `Dio`.
   - Mengambil `UserModel` (JSON di-parse aman via `json_serializable`).
   - Menyimpan auth token ke `flutter_secure_storage`.
   - Mengonversi `UserModel` menjadi `UserEntity` (Domain).
   - Mengembalikan `Right(UserEntity)` jika berhasil, atau menangkap `DioException` dan mengembalikan `Left(ServerFailure)`.
5. **Kembali ke BLoC:**
   - Hasil `Either` diperiksa via pattern matching:
     - Jika `Left(failure)`: BLoC meng-emit `AuthState.error(failure.message)`.
     - Jika `Right(user)`: BLoC meng-emit `AuthState.authenticated(user)`.
6. **Reaksi UI:** `BlocConsumer` menangkap perubahan state:
   - Jika error: Menampilkan Snackbar / Toast error.
   - Jika sukses: `GoRouter` melakukan navigasi redirect ke HomeScreen.

---

## 5. Standar Desain Responsif Tablet & Anti RenderFlex Overflow

Seluruh perancangan PRD dan UI Flutter wajib mematuhi standar adaptif berikut:

### A. Aturan Layout Tablet vs Mobile
* **Breakpoints Standar:**
  * **Mobile:** Lebar layar `< 600 dp` (BottomNavigationBar, Single-column vertical scrolling).
  * **Tablet Portrait:** Lebar layar `600 dp – 840 dp` (NavigationRail terkompresi, Grid 2 kolom, Dialog/Modal terpusat dengan max-width 560 dp).
  * **Tablet Landscape:** Lebar layar `> 840 dp` (Extended NavigationRail / Permanent Drawer, Master-Detail Split View, Grid 3-4 kolom).
* **Adaptasi Navigation:** Hindari `BottomNavigationBar` yang merenggang terlalu lebar di tablet; wajib beralih ke `NavigationRail`.

### B. Aturan Anti RenderFlex Overflow (Zero Yellow-Black Striped Error)
* **Scroll & Keyboard Protection:**
  * Seluruh form input wajib dibungkus `SingleChildScrollView(physics: ClampingScrollPhysics())` dan `SafeArea` dengan `resizeToAvoidBottomInset: true` agar bebas overflow saat keyboard virtual muncul.
  * Gunakan `LayoutBuilder` / `OrientationBuilder` untuk mendeteksi batas ketinggian container.
* **Text & Row Truncation Safety:**
  * Teks dinamis yang bersanding dengan ikon/komponen lain di dalam `Row` WAJIB dibungkus `Expanded` atau `Flexible` disertai `maxLines` dan `overflow: TextOverflow.ellipsis`. Dilarang menaruh `Text` unbounded di dalam `Row`.

### C. Aturan Main Tampilan Tabel & List Data (Anti-Overflow Table Matrix)
* **Layar Mobile (< 600 dp):**
  * Data tabular **DILARANG** dipaksakan menggunakan widget `DataTable` mentah dengan banyak kolom (karena pasti memicu horizontal `RenderFlex overflowed by xxx pixels`).
  * Wajib dialihkan ke format **Adaptive Card List** bertumpuk vertikal dengan informasi esensial.
  * Jika tabel wajib ditampilkan apa adanya, komponen tabel **WAJIB dibungkus**:
    ```dart
    SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      physics: const BouncingScrollPhysics(),
      child: DataTable(...),
    )
    ```
* **Layar Tablet (>= 600 dp):**
  * Tampilkan **PaginatedDataTable** atau **DataGrid** kaya fitur dengan column sorting, filter, pagination, dan sticky headers.
  * Tentukan lebar kolom proporsional menggunakan `DataColumn(label: ..., tooltip: ...)` dan pastikan isi sel terproteksi dengan `TextOverflow.ellipsis`.

### D. Format Tabel Markdown PRD
* Seluruh tabel di dalam dokumen PRD (Screen Breakdown, GoRouter Paths, State Events/States, DTO Schema, dan Acceptance Criteria) wajib dirancang ringkas (maksimal 3-4 kolom inti) agar tidak meluber dan nyaman dibaca di tablet maupun ponsel.

---

## 6. Standar Kualitas & Performa Google Play Terbaru (Android Vitals)

Seluruh PRD dan implementasi Flutter wajib memenuhi 3 pilar standar performa Google Play & Android Vitals terbaru:

### A. Dynamic Memory Usage (Anonymous RSS + Swap)
* **Latar Belakang Vitals:** Google Play memantau penggunaan *Anonymous RSS (Resident Set Size)* dan *Swap/zRAM*. Lonjakan alokasi memori dinamis memicu Low Memory Killer (LMK) di background dan sanksi *Bad Behavior* Android Vitals.
* **Aturan Implementasi Flutter:**
  * **Lifecycle Cleanup Mutlak:** Seluruh controller (`TextEditingController`, `AnimationController`, `ScrollController`, `TabController`), `StreamSubscription`, dan `Bloc`/`Cubit` **WAJIB di-dispose/di-close** saat widget atau screen di-*unmount*.
  * **Paginasi & LRU Eviction:** Dilarang menampung list tanpa batas (*unbounded static list*). Terapkan lazy-loading (chunking 20-30 item) dan LRU cache pada layer repository/data source agar memori heap tetap stabil.

### B. Bitmap Memory Usage (Graphic Buffer & Downsampling)
* **Latar Belakang Vitals:** Gambar bitmap yang di-decode penuh ke RAM grafis (*Ashmem / Gralloc*) menjadi pemicu utama Out-of-Memory (OOM). Foto 12MP (4000x3000) mentah memakan ~48 MB RAM jika tidak di-*downsample*.
* **Aturan Implementasi Flutter:**
  * **Downsampling Proporsional:** Seluruh pemuatan gambar (`Image.network`, `Image.asset`, `cached_network_image`) **WAJIB menentukan `cacheWidth` dan `cacheHeight`** (atau `ResizeImage`) sesuai dimensi fisik piksel viewport:
    ```dart
    Image.network(
      imageUrl,
      cacheWidth: 300, // Menghindari alokasi bitmap raksasa di RAM
      fit: BoxFit.cover,
    )
    ```
  * **Format Modern:** Utamakan SVG vektor untuk icon/ilustrasi dan WebP/AVIF untuk gambar bitmap.
  * **ImageCache Tuning:** Batasi alokasi cache gambar memori melalui `PaintingBinding.instance.imageCache.maximumSizeBytes`.

### C. Optimized DEX Code & Build Release
* **Latar Belakang Vitals:** Ukuran file DEX besar memperlambat *cold start*, memakan waktu JIT compiler, dan memperbesar latensi startup.
* **Aturan Konfigurasi Android Release:**
  * **R8 Full-Mode Minification:** Aktifkan pemangkasan kode dan *resource shrinking* di `android/app/build.gradle`:
    ```groovy
    buildTypes {
        release {
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
    ```
  * **Baseline Profiles:** Terapkan `androidx.profileinstaller` agar jalur interaksi utama (*critical user journeys*) terkompilasi AOT (*Ahead-of-Time*) sebelum pengguna membuka aplikasi.
  * **Format Distribusi .AAB:** Gunakan Android App Bundle (`.aab`) dengan pembagian ABI/density dinamis via Google Play Feature Delivery.

---

## 7. Alur Kerja Modular & Fitur Edit PRD (Decoupled 3-Menu Pipeline)

Untuk memastikan kendali penuh berada di tangan developer (*developer agency*) dan menghindari *token pollution* atau eksekusi otomatis yang tidak diinginkan, sistem menerapkan alur kerja modular berikut:

### A. Fitur Edit PRD In-Place (Living Document)
* **Mode Edit Markdown Interaktif:** Setiap PRD yang dihasilkan memiliki tombol **✏️ Edit PRD**.
* **Penyuntingan Langsung:** Developer dapat mengubah rute GoRouter, nama model DTO, atau kriteria akseptasi secara langsung di kanvas editor tanpa perlu regenerate dari nol.
* **Sinkronisasi Dokumen:** Saat tombol **💾 Simpan Perubahan** ditekan, dokumen Markdown ter-render ulang, file unduhan `.md` otomatis terbarui, dan memori aktif `latestActivePRD` diperbarui seketika.

### B. Pemisahan 3 Menu (Decoupled Pipeline Tanpa Auto-Submit)
* **Penghapusan Auto-Submit:** Tombol navigasi pipeline antar-menu (`Menu 1: PRD` ➔ `Menu 2: UI` ➔ `Menu 3: State`) **TIDAK PERNAH** langsung mengirim pesan secara otomatis (*zero accidental submit*).
* **Smart Prefilled Draft:** Tombol pipeline beralih tab dan menyiapkan draf prompt terstruktur di textarea input, misalnya:
  > *"Berdasarkan PRD di atas, tolong buatkan kode Flutter UI modern untuk screen: [Sebutkan nama screen spesifik dari PRD, misal: HomeScreen / DetailScreen]"*
* **Injeksi Konteks Cerdas:** Saat developer mengirim prompt di Menu 2 atau Menu 3, sistem secara otomatis menyertakan dokumen PRD yang telah diedit sebagai referensi konteks utama tanpa perlu copy-paste manual.

---

## 8. Sistem Pemilih Model AI Dinamis (Dynamic Model Selector)

Aplikasi mengintegrasikan pemilih versi model AI dinamis di header:

* **Default AI Terbaru:** Secara bawaan menggunakan model Google Gemini generasi terkini (`gemini-3.8-flash` / default server), memberikan kecepatan generasi kilat dan kapabilitas reasoning tinggi tanpa perlu konfigurasi manual.
* **Dropdown Interaktif di Header:** Badge di samping logo aplikasi dapat diklik untuk memilih varian model lain sesuai kebutuhan engineering:
  * **Gemini 3.8 Flash (Default Terbaru ⚡):** Rekomendasi utama untuk pembuatan PRD cepat & Flutter UI.
  * **Gemini 2.5 Pro (Deep Reasoning 🧠):** Analisis mendalam untuk audit arsitektur mobile, troubleshooting performa, dan algoritma rumit.
  * **Gemini 2.5 Flash (Flash ⚡):** Alternatif stabil generasi sebelumnya.
  * **Gemini 3.1 Flash Lite (Lite 🪶):** Model ultra-hemat kuota token & fallback otomatis.
* **Persistensi Pilihan:** Model yang dipilih disimpan otomatis di `localStorage` (`fluttercraft_selected_model`) dan disinkronkan ke seluruh endpoint API (`/chat`, `/generate-multimodal`).

---

## 9. Kesimpulan & Status Kesiapan

Dengan disepakatinya cetak biru teknologi, sistem pewarnaan, standar responsif, syarat Google Vitals, alur kerja modular, serta pemilih model dinamis di atas:
* Seluruh dokumen **PRD (Product Requirement Document)** yang disusun dapat langsung diedit di kanvas, diunduh, dan dijadikan referensi resmi untuk pembuatan UI dan State.
* Tiga menu kerja (**PRD**, **Flutter UI Anti-Slop**, dan **Arsitektur & State**) bekerja secara independen namun terintegrasi harmonis, memberikan kenyamanan, fleksibilitas model AI, dan kontrol penuh bagi developer Flutter.
