/**
 * FlutterCraft AI - Frontend Script
 * Specialized for Flutter Developers & PRD Generation
 */

document.addEventListener('DOMContentLoaded', () => {
  // ==========================================
  // 1. ELEMEN DOM & STATE
  // ==========================================
  const chatForm = document.getElementById('chat-form');
  const userInput = document.getElementById('user-input');
  const sendButton = document.getElementById('send-button');
  const chatBox = document.getElementById('chat-box');
  const welcomeScreen = document.getElementById('welcome-screen');
  const typingIndicator = document.getElementById('typing-indicator');
  const typingStatusText = document.getElementById('typing-status-text');
  const btnClear = document.getElementById('btn-clear');
  const btnTheme = document.getElementById('btn-theme');
  const serverStatus = document.getElementById('server-status');
  const modelBadge = document.getElementById('model-badge');
  const modelSelectorWrap = document.getElementById('model-selector-wrap');
  const modelBadgeBtn = document.getElementById('model-badge-btn');
  const modelDropdownMenu = document.getElementById('model-dropdown-menu');
  const modelOptionsList = document.getElementById('model-options-list');
  const modeTabs = document.querySelectorAll('.mode-tab');
  const chipButtons = document.querySelectorAll('.chip-card');

  // Input & Attachment Elements
  const inputWrapper = document.getElementById('input-wrapper');
  const filePreviewBar = document.getElementById('file-preview-bar');
  const fileChipIcon = document.getElementById('file-chip-icon');
  const fileChipName = document.getElementById('file-chip-name');
  const fileChipSize = document.getElementById('file-chip-size');
  const btnRemoveFile = document.getElementById('btn-remove-file');
  const btnAttach = document.getElementById('btn-attach');
  const attachmentMenu = document.getElementById('attachment-menu');
  const attachmentOptions = document.querySelectorAll('.attachment-option');
  const mediaFileInput = document.getElementById('media-file-input');

  // Guided Architecture & Tech Stack Elements (Menu 1: PRD)
  const prdArchGuide = document.getElementById('prd-arch-guide');
  const btnToggleArch = document.getElementById('btn-toggle-arch');
  const btnResetGolden = document.getElementById('btn-reset-golden');
  const archBadgeStatus = document.getElementById('arch-badge-status');
  const archSummaryChips = document.getElementById('arch-summary-chips');
  const selectArchPattern = document.getElementById('select-arch-pattern');
  const selectArchState = document.getElementById('select-arch-state');
  const selectArchDatabase = document.getElementById('select-arch-database');
  const selectArchNav = document.getElementById('select-arch-nav');
  const selectArchModel = document.getElementById('select-arch-model');
  const selectArchNetwork = document.getElementById('select-arch-network');

  // Color System & Material 3 Tokens Elements
  const selectColorPalette = document.getElementById('select-color-palette');
  const selectColorMode = document.getElementById('select-color-mode');
  const swatchPrimaryDot = document.getElementById('swatch-primary-dot');
  const swatchAccentDot = document.getElementById('swatch-accent-dot');
  const swatchPrimaryHex = document.getElementById('swatch-primary-hex');
  const swatchAccentHex = document.getElementById('swatch-accent-hex');
  const customHexContainer = document.getElementById('custom-hex-container');
  const inputCustomPrimary = document.getElementById('input-custom-primary');
  const inputCustomAccent = document.getElementById('input-custom-accent');
  const pickerCustomPrimary = document.getElementById('picker-custom-primary');
  const pickerCustomAccent = document.getElementById('picker-custom-accent');
  const archColorChips = document.getElementById('arch-color-chips');

  // Konfigurasi API Backend
  const isLocalServer = window.location.origin.includes(':3000');
  const BACKEND_BASE = isLocalServer ? '' : 'http://localhost:3000';
  const CHAT_ENDPOINT = `${BACKEND_BASE}/chat`;
  const HEALTH_ENDPOINT = `${BACKEND_BASE}/health`;
  const MULTIMODAL_ENDPOINT = `${BACKEND_BASE}/generate-multimodal`;

  // State percakapan, media & PRD aktif
  let currentMode = 'prd'; // default: Bikin Plan / PRD (Langkah 1)
  let latestActivePRD = ''; // PRD aktif yang dapat diedit & dirujuk oleh Menu 2 dan 3
  let conversationHistory = [];
  let isGenerating = false;
  let selectedMediaFile = null;

  // Global Toast Helper
  function showToast(message, type = 'info') {
    let toast = document.getElementById('app-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'app-toast';
      toast.className = 'app-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = `app-toast show ${type}`;
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
      toast.className = 'app-toast';
    }, 3800);
  }

  const MODE_CONFIG = {
    flutter_ui: {
      placeholder: 'Deskripsikan screen Flutter yang ingin dibuat (contoh: Halaman Detail Produk dengan image carousel, specs, & sticky bottom bar)...',
      statusText: 'FlutterCraft sedang merancang widget modern Anti-Slop...',
    },
    prd: {
      placeholder: 'Deskripsikan ide fitur atau modul aplikasi Flutter yang ingin dibuatkan PRD lengkap...',
      statusText: 'FlutterCraft sedang menyusun Product Requirement Document (PRD)...',
    },
    state: {
      placeholder: 'Sebutkan kebutuhan state management (contoh: Riverpod AsyncNotifier untuk fitur Auth & OTP verification)...',
      statusText: 'FlutterCraft sedang merancang arsitektur state & data layer...',
    },
    general: {
      placeholder: 'Konsultasi arsitektur, troubleshooting bug Flutter, atau kode Dart 3...',
      statusText: 'FlutterCraft sedang menganalisis arsitektur Flutter...',
    },
  };

  // ==========================================
  // 2. SISTEM PEMILIH MODEL AI (DEFAULT: MODEL TERBARU)
  // ==========================================
  const DEFAULT_MODELS = [
    {
      id: 'gemini-3.8-flash',
      shortName: '3.8-flash',
      name: 'Gemini 3.8 Flash',
      tag: 'Terbaru ⚡',
      badgeClass: 'badge-terbaru',
      desc: 'Model terbaru & rekomendasi utama: respons kilat, cerdas, & efisien untuk PRD & Flutter UI.',
    },
    {
      id: 'gemini-2.5-pro',
      shortName: '2.5-pro',
      name: 'Gemini 2.5 Pro',
      tag: 'Pro 🧠',
      badgeClass: 'badge-pro',
      desc: 'Penalaran mendalam (Deep Reasoning) untuk audit arsitektur mobile & logika kompleks.',
    },
    {
      id: 'gemini-2.5-flash',
      shortName: '2.5-flash',
      name: 'Gemini 2.5 Flash',
      tag: 'Flash ⚡',
      badgeClass: 'badge-flash',
      desc: 'Model Flash stabil generasi sebelumnya dengan latensi konsisten.',
    },
    {
      id: 'gemini-3.1-flash-lite',
      shortName: '3.1-flash-lite',
      name: 'Gemini 3.1 Flash Lite',
      tag: 'Lite 🪶',
      badgeClass: 'badge-lite',
      desc: 'Varian super hemat kuota token, respon ultra ringan & fallback andal.',
    },
  ];

  let availableModels = DEFAULT_MODELS;
  // Default: selalu memakai model terbaru (gemini-3.8-flash) kecuali user memilih yang lain
  let selectedModelId = localStorage.getItem('fluttercraft_selected_model') || 'gemini-3.8-flash';

  function updateModelBadgeUI() {
    const current = availableModels.find((m) => m.id === selectedModelId) || availableModels[0];
    if (modelBadge && current) {
      modelBadge.textContent = current.shortName;
    }
    if (modelBadgeBtn && current) {
      modelBadgeBtn.title = `Model Aktif: ${current.name} (${current.tag}) - Klik untuk mengganti`;
    }
  }

  function renderModelDropdown() {
    if (!modelOptionsList) return;
    modelOptionsList.innerHTML = '';

    availableModels.forEach((m) => {
      const isSelected = m.id === selectedModelId;
      const itemBtn = document.createElement('button');
      itemBtn.type = 'button';
      itemBtn.className = `model-option-item ${isSelected ? 'active' : ''}`;
      itemBtn.setAttribute('role', 'option');
      itemBtn.setAttribute('aria-selected', isSelected);

      itemBtn.innerHTML = `
        <span class="model-option-radio">${isSelected ? '●' : '○'}</span>
        <div class="model-option-info">
          <div class="model-option-title-row">
            <span class="model-option-name">${m.name}</span>
            <span class="model-option-badge ${m.badgeClass || 'badge-flash'}">${m.tag}</span>
          </div>
          <span class="model-option-desc">${m.desc}</span>
        </div>
      `;

      itemBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedModelId = m.id;
        localStorage.setItem('fluttercraft_selected_model', selectedModelId);
        updateModelBadgeUI();
        renderModelDropdown();
        closeModelDropdown();
        showToast(`✓ Model AI dialihkan ke: ${m.name}`, 'info');
      });

      modelOptionsList.appendChild(itemBtn);
    });
  }

  function toggleModelDropdown() {
    if (!modelDropdownMenu || !modelSelectorWrap) return;
    const isHidden = modelDropdownMenu.classList.contains('hidden');
    if (isHidden) {
      modelDropdownMenu.classList.remove('hidden');
      modelSelectorWrap.classList.add('open');
      if (modelBadgeBtn) modelBadgeBtn.setAttribute('aria-expanded', 'true');
    } else {
      closeModelDropdown();
    }
  }

  function closeModelDropdown() {
    if (!modelDropdownMenu || !modelSelectorWrap) return;
    modelDropdownMenu.classList.add('hidden');
    modelSelectorWrap.classList.remove('open');
    if (modelBadgeBtn) modelBadgeBtn.setAttribute('aria-expanded', 'false');
  }

  if (modelBadgeBtn) {
    modelBadgeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleModelDropdown();
    });
  }

  document.addEventListener('click', (e) => {
    if (modelSelectorWrap && !modelSelectorWrap.contains(e.target)) {
      closeModelDropdown();
    }
  });

  // Render awal pemilih model
  updateModelBadgeUI();
  renderModelDropdown();

  // ==========================================
  // 3. CEK KONEKSI SERVER & MODEL INFO
  // ==========================================
  async function checkServerConnection() {
    const statusDot = serverStatus.querySelector('.status-dot');
    const statusLabel = serverStatus.querySelector('.status-label');

    statusDot.className = 'status-dot checking';
    statusLabel.textContent = 'Memeriksa koneksi...';

    try {
      const res = await fetch(HEALTH_ENDPOINT, { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        statusDot.className = 'status-dot online';
        statusLabel.textContent = 'Terhubung ke Server';

        if (Array.isArray(data.availableModels) && data.availableModels.length > 0) {
          availableModels = data.availableModels.map((m) => ({
            ...m,
            badgeClass: m.id.includes('pro') ? 'badge-pro' : (m.id.includes('lite') ? 'badge-lite' : (m.isDefault ? 'badge-terbaru' : 'badge-flash')),
          }));
          renderModelDropdown();
        }

        // Jika user belum pernah memilih model manual, pakai default dari server (AI terbaru)
        if (!localStorage.getItem('fluttercraft_selected_model') && data.defaultModel) {
          selectedModelId = data.defaultModel;
        }

        updateModelBadgeUI();
      } else {
        throw new Error('Server non-200');
      }
    } catch (err) {
      statusDot.className = 'status-dot offline';
      statusLabel.textContent = 'Server Offline (Port 3000)';
    }
  }

  checkServerConnection();
  setInterval(checkServerConnection, 20000);

  // ==========================================
  // 3. MODE SELECTOR (TABS) & GUIDED ARCHITECTURE (MENU 1)
  // ==========================================
  const GOLDEN_STACK_DEFAULTS = {
    pattern: 'Clean Architecture (Feature-First)',
    state: 'flutter_bloc & Cubit (UDF & Event-Driven)',
    database: 'Drift SQLite (Type-Safe Relasional & Stream)',
    nav: 'GoRouter (Declarative & Redirect Guard)',
    model: 'Freezed + json_serializable (Immutable Unions)',
    network: 'Dio + Pretty Dio Logger & Interceptors',
  };

  function getSelectedArchitecture() {
    return {
      pattern: selectArchPattern ? selectArchPattern.value : GOLDEN_STACK_DEFAULTS.pattern,
      state: selectArchState ? selectArchState.value : GOLDEN_STACK_DEFAULTS.state,
      database: selectArchDatabase ? selectArchDatabase.value : GOLDEN_STACK_DEFAULTS.database,
      nav: selectArchNav ? selectArchNav.value : GOLDEN_STACK_DEFAULTS.nav,
      model: selectArchModel ? selectArchModel.value : GOLDEN_STACK_DEFAULTS.model,
      network: selectArchNetwork ? selectArchNetwork.value : GOLDEN_STACK_DEFAULTS.network,
    };
  }

  function updateArchSummary() {
    const arch = getSelectedArchitecture();
    if (archSummaryChips) {
      const parts = [
        arch.pattern.includes('Tidak Ada') ? 'Tanpa Pola Khusus' : arch.pattern.split(' ')[0],
        arch.state.includes('Tidak Ada') ? 'StatefulWidget' : arch.state.split(' ')[0],
        arch.database.includes('Tidak Ada') ? 'Tanpa DB Lokal' : arch.database.split(' ')[0],
        arch.nav.includes('Tidak Ada') ? 'Navigator 1.0' : arch.nav.split(' ')[0],
        arch.model.includes('Tidak Ada') ? 'Plain Dart' : arch.model.split(' ')[0],
        arch.network.includes('Tidak Ada') ? 'Full Offline 📴' : arch.network.split(' ')[0],
      ];
      archSummaryChips.textContent = parts.join(' • ');
    }

    const isGolden =
      arch.pattern.includes('Feature-First') &&
      arch.state.includes('flutter_bloc') &&
      arch.database.includes('Drift') &&
      arch.nav.includes('GoRouter') &&
      arch.model.includes('Freezed') &&
      arch.network.includes('Dio');

    if (archBadgeStatus) {
      if (isGolden) {
        archBadgeStatus.textContent = '⚡ Golden Stack Aktif';
        archBadgeStatus.className = 'arch-badge-golden';
      } else {
        const isOffline = arch.network.includes('Tidak Ada') || arch.network.includes('Offline');
        archBadgeStatus.textContent = isOffline ? '📴 Mode Full Offline' : '🛠️ Arsitektur Kustom';
        archBadgeStatus.className = 'arch-badge-golden custom';
      }
    }
  }

  function getColorConfig() {
    if (!selectColorPalette) {
      return {
        name: 'Oceanic FinTech',
        primary: '#0A2540',
        accent: '#00D4B2',
        mode: 'Dua Mode (Light & Dark Theme Otomatis)',
      };
    }

    const selectedOpt = selectColorPalette.options[selectColorPalette.selectedIndex];
    const paletteVal = selectedOpt ? selectedOpt.value : 'Oceanic FinTech';
    let primary = selectedOpt ? selectedOpt.getAttribute('data-primary') || '#0A2540' : '#0A2540';
    let accent = selectedOpt ? selectedOpt.getAttribute('data-accent') || '#00D4B2' : '#00D4B2';
    const mode = selectColorMode ? selectColorMode.value : 'Dua Mode (Light & Dark Theme Otomatis)';

    if (paletteVal === 'Kustom Brand Hex') {
      if (inputCustomPrimary && inputCustomPrimary.value) {
        primary = inputCustomPrimary.value.trim();
      }
      if (inputCustomAccent && inputCustomAccent.value) {
        accent = inputCustomAccent.value.trim();
      }
    }

    return {
      name: paletteVal,
      primary,
      accent,
      mode,
    };
  }

  function updateColorUI() {
    const color = getColorConfig();

    if (customHexContainer) {
      if (color.name === 'Kustom Brand Hex') {
        customHexContainer.classList.remove('hidden');
      } else {
        customHexContainer.classList.add('hidden');
      }
    }

    if (swatchPrimaryDot) swatchPrimaryDot.style.backgroundColor = color.primary;
    if (swatchAccentDot) swatchAccentDot.style.backgroundColor = color.accent;
    if (swatchPrimaryHex) swatchPrimaryHex.textContent = color.primary;
    if (swatchAccentHex) swatchAccentHex.textContent = color.accent;

    if (archColorChips) {
      const modeShort = color.mode.includes('Light & Dark') ? 'Dual Mode' : (color.mode.includes('Dark') ? 'Dark' : 'Light');
      archColorChips.textContent = `${color.name} (${color.primary} / ${color.accent}) • ${modeShort}`;
    }
  }

  function resetToGoldenStack() {
    if (selectArchPattern) selectArchPattern.selectedIndex = 0;
    if (selectArchState) selectArchState.selectedIndex = 0;
    if (selectArchDatabase) selectArchDatabase.selectedIndex = 0;
    if (selectArchNav) selectArchNav.selectedIndex = 0;
    if (selectArchModel) selectArchModel.selectedIndex = 0;
    if (selectArchNetwork) selectArchNetwork.selectedIndex = 0;
    if (selectColorPalette) selectColorPalette.selectedIndex = 0;
    if (selectColorMode) selectColorMode.selectedIndex = 0;
    updateColorUI();
    updateArchSummary();
  }

  function getSelectedArchitecturePrompt(rawUserPrompt) {
    const arch = getSelectedArchitecture();
    const color = getColorConfig();
    const isOffline = arch.network.includes('Tidak Ada') || arch.network.includes('Offline');
    const isNoDb = arch.database.includes('Tidak Ada') || arch.database.includes('In-Memory');
    const isNoStateLib = arch.state.includes('Tidak Ada') || arch.state.includes('StatefulWidget');
    const isNoNavLib = arch.nav.includes('Tidak Ada') || arch.nav.includes('Navigator 1.0');
    const isNoGenerator = arch.model.includes('Tidak Ada') || arch.model.includes('Plain Dart');

    const notes = [];
    if (isOffline) {
      notes.push('• CATATAN NETWORK: Aplikasi ini dirancang 100% FULL OFFLINE (Standalone). DILARANG menambahkan ketergantungan API, endpoint REST, Dio, atau internet pada PRD.');
    }
    if (isNoDb) {
      notes.push('• CATATAN DATABASE: Tidak menggunakan database lokal permanen (Data dikelola secara in-memory/runtime session).');
    }
    if (isNoStateLib) {
      notes.push('• CATATAN STATE: Menggunakan StatefulWidget standar Flutter bawaan tanpa dependensi library eksternal.');
    }
    if (isNoNavLib) {
      notes.push('• CATATAN NAVIGASI: Menggunakan Navigator 1.0 bawaan tanpa routing library eksternal.');
    }
    if (isNoGenerator) {
      notes.push('• CATATAN MODEL: Menggunakan class Dart murni tanpa build_runner / Freezed.');
    }

    const specialInstructions = notes.length > 0
      ? `\n[PANDUAN ADAPTASI KHUSUS PILIHAN DEVELOPER]:\n${notes.join('\n')}\n`
      : '';

    return `[PANDUAN KONFIGURASI ARSITEKTUR & TECH STACK PILIHAN DEVELOPER]:
1. Pola Arsitektur: ${arch.pattern}
2. State Management: ${arch.state}
3. Database Lokal & Persistence: ${arch.database}
4. Navigasi & Routing: ${arch.nav}
5. Data Modeling & Immutability: ${arch.model}
6. Network Client: ${arch.network}

[PANDUAN SISTEM PEWARNAAN & MATERIAL 3 DESIGN TOKENS]:
• Palet Warna UI: ${color.name} (Primary: ${color.primary}, Accent/Secondary: ${color.accent})
• Mode Tema: ${color.mode}
• Aturan Desain Wajib: Bagian UI/UX Specs WAJIB memuat tabel Material 3 ColorScheme Tokens (Primary: ${color.primary}, Accent: ${color.accent}, Surface, Error, Outline) dan class AppColors / AppTheme. DILARANG menggunakan warna hardcoded sembarangan!

[ATURAN MAIN WAJIB RESPONSIF TABLET, TAMPILAN TABEL & BEBAS UI OVERFLOWED]:
1. BREAKPOINTS & TAMPILAN ADAPTIF:
   • Mobile (< 600dp): BottomNavigationBar, Single-column vertical scroll, Fullscreen Modal.
   • Tablet Portrait (600dp - 840dp): NavigationRail terkompresi, Grid 2 kolom, Dialog terpusat (max-width 560dp).
   • Tablet Landscape (> 840dp): Extended NavigationRail / Permanent Drawer, Master-Detail split pane (Daftar di kiri, Detail di kanan), Grid 3-4 kolom.
2. TAMPILAN TABEL & DATA LIST (ANTI-OVERFLOW TABLE RULE):
   • Di Mobile (< 600dp): Data tabular DILARANG menggunakan DataTable statis yang memicu horizontal RenderFlex overflow! Wajib dialihkan ke Adaptive Card List bertumpuk atau jika tetap menggunakan DataTable wajib dibungkus SingleChildScrollView(scrollDirection: Axis.horizontal).
   • Di Tablet (>= 600dp): Gunakan PaginatedDataTable / DataTable dengan lebar kolom proporsional, column sorting, dan TextOverflow.ellipsis untuk teks panjang.
3. ZERO RENDERFLEX OVERFLOW GUARD (100% BEBAS ERROR GARIS KUNING-HITAM):
   • Form & Input Safety: Seluruh form input wajib Scaffold(resizeToAvoidBottomInset: true) + SingleChildScrollView(physics: ClampingScrollPhysics()) + SafeArea.
   • Row Dynamic Safety: Setiap Row dengan teks dinamis bersama icon/tombol WAJIB membungkus widget teks dengan Flexible atau Expanded.
[ATURAN MAIN SYARAT GOOGLE TERBARU (ANDROID VITALS & PERFORMA MEMORI)]:
1. DYNAMIC MEMORY USAGE (ANONYMOUS RSS + SWAP):
   • Alokasi memori dinamis ketat: Wajib spesifikasikan lifecycle cleanup (dispose controller/animation/streams, close bloc/cubit) untuk membasmi memory leak.
   • Batasi in-memory retention: Gunakan chunking pagination dan LRU eviction policy agar Anonymous RSS + Swap tetap rendah, mencegah LMK kill di background & sanksi Android Vitals.
2. BITMAP MEMORY USAGE OPTIMIZATION:
   • Dilarang decode gambar resolusi penuh: Wajib tentukan cacheWidth & cacheHeight (atau ResizeImage) sesuai ukuran widget fisik pada layar untuk menekan Graphic Buffer / ashmem.
   • Gunakan format WebP / SVG vektor dan konfigurasi batasan ImageCache (maximumSizeBytes).
3. OPTIMIZED DEX CODE & BUILD RELEASE:
   • Konfigurasi R8 Code & Resource Shrinking (minifyEnabled true, shrinkResources true, proguard-android-optimize.txt) agar method count dan ukuran DEX minimal.
   • Baseline Profiles (androidx.profileinstaller) untuk AOT compilation DEX code, memangkas cold-start latency dan runtime memory overhead.
   • Distribusi menggunakan Android App Bundle (.aab) dengan dynamic split APKs.
${specialInstructions}
[INSTRUKSI WAJIB]:
Sajikan dokumen PRD teknis lengkap yang secara patuh mengintegrasikan arsitektur, teknologi, sistem pewarnaan, aturan responsif tablet, serta syarat Google Vitals terbaru (Dynamic RSS/Swap, Bitmap Memory, Optimized DEX) ke dalam seluruh bagian (Screen Breakdown, GoRouter, State Management, Data Contracts, UI/UX Specs, dan Acceptance Criteria).

[KEBUTUHAN FITUR / APLIKASI DARI USER]:
${rawUserPrompt}`;
  }

  if (btnResetGolden) {
    btnResetGolden.addEventListener('click', resetToGoldenStack);
  }

  if (btnToggleArch && prdArchGuide) {
    btnToggleArch.addEventListener('click', () => {
      const isCollapsed = prdArchGuide.classList.toggle('collapsed');
      const toggleText = btnToggleArch.querySelector('.toggle-text');
      if (toggleText) {
        toggleText.textContent = isCollapsed ? 'Buka' : 'Tutup';
      }
      btnToggleArch.setAttribute('aria-expanded', !isCollapsed);
    });
  }

  [
    selectArchPattern,
    selectArchState,
    selectArchDatabase,
    selectArchNav,
    selectArchModel,
    selectArchNetwork,
  ].forEach((sel) => {
    if (sel) {
      sel.addEventListener('change', updateArchSummary);
    }
  });

  if (selectColorPalette) {
    selectColorPalette.addEventListener('change', updateColorUI);
  }
  if (selectColorMode) {
    selectColorMode.addEventListener('change', updateColorUI);
  }

  if (pickerCustomPrimary && inputCustomPrimary) {
    pickerCustomPrimary.addEventListener('input', () => {
      inputCustomPrimary.value = pickerCustomPrimary.value;
      updateColorUI();
    });
    inputCustomPrimary.addEventListener('input', () => {
      if (inputCustomPrimary.value.startsWith('#')) {
        pickerCustomPrimary.value = inputCustomPrimary.value;
      }
      updateColorUI();
    });
  }

  if (pickerCustomAccent && inputCustomAccent) {
    pickerCustomAccent.addEventListener('input', () => {
      inputCustomAccent.value = pickerCustomAccent.value;
      updateColorUI();
    });
    inputCustomAccent.addEventListener('input', () => {
      if (inputCustomAccent.value.startsWith('#')) {
        pickerCustomAccent.value = inputCustomAccent.value;
      }
      updateColorUI();
    });
  }

  updateArchSummary();
  updateColorUI();

  function switchMode(modeKey) {
    if (!MODE_CONFIG[modeKey]) return;
    currentMode = modeKey;

    modeTabs.forEach((tab) => {
      tab.classList.toggle('active', tab.getAttribute('data-mode') === modeKey);
    });

    // Tampilkan panel pilihan arsitektur hanya pada Menu 1 (PRD)
    if (prdArchGuide) {
      if (modeKey === 'prd') {
        prdArchGuide.classList.remove('hidden');
      } else {
        prdArchGuide.classList.add('hidden');
      }
    }

    userInput.placeholder = MODE_CONFIG[modeKey].placeholder;
    typingStatusText.textContent = MODE_CONFIG[modeKey].statusText;
  }

  modeTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const selected = tab.getAttribute('data-mode');
      switchMode(selected);
    });
  });

  // Inisialisasi awal ke mode PRD (Langkah 1)
  switchMode('prd');

  // ==========================================
  // 4. THEME TOGGLE (DARK/LIGHT) - DEFAULT: LIGHT
  // ==========================================
  const savedTheme = localStorage.getItem('fluttercraft_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);

  btnTheme.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('fluttercraft_theme', next);
  });

  // ==========================================
  // 5. AUTO-RESIZE TEXTAREA & SHORTCUT ENTER
  // ==========================================
  function autoResizeTextarea() {
    userInput.style.height = 'auto';
    const targetH = Math.min(userInput.scrollHeight, 140);
    userInput.style.height = `${targetH}px`;

    if (inputWrapper) {
      if (targetH > 32) {
        inputWrapper.classList.add('multi-line');
      } else {
        inputWrapper.classList.remove('multi-line');
      }
    }
  }

  userInput.addEventListener('input', autoResizeTextarea);

  userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isGenerating && userInput.value.trim().length > 0) {
        chatForm.dispatchEvent(new Event('submit'));
      }
    }
  });

  // ==========================================
  // 6. SUGGESTION CHIPS
  // ==========================================
  chipButtons.forEach((chip) => {
    chip.addEventListener('click', () => {
      const mode = chip.getAttribute('data-mode') || 'flutter_ui';
      const prompt = chip.getAttribute('data-prompt');

      switchMode(mode);

      if (prompt) {
        userInput.value = prompt;
        autoResizeTextarea();
        chatForm.dispatchEvent(new Event('submit'));
      }
    });
  });

  // ==========================================
  // 7. RENDER PESAN & DOWNLOAD PRD
  // ==========================================
  function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function getFileIcon(filename = '') {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext)) return '🖼️';
    if (['mp3', 'wav', 'm4a', 'aac', 'ogg'].includes(ext)) return '🎙️';
    if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) return '🎬';
    return '📄';
  }

  function downloadAsMarkdown(filename, content) {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function appendMessage(sender, text, isError = false, msgMode = currentMode, attachment = null) {
    if (welcomeScreen) {
      welcomeScreen.style.display = 'none';
    }

    let rawText = text;
    const isPRDDoc = sender === 'bot' && !isError && (
      msgMode === 'prd' ||
      rawText.includes('# 1. 📌') ||
      rawText.includes('Product Requirement Document') ||
      rawText.toLowerCase().includes('ringkasan eksekutif')
    );

    if (isPRDDoc) {
      latestActivePRD = rawText;
    }

    const wrapper = document.createElement('div');
    wrapper.classList.add('message-wrapper', sender);

    // Avatar
    const avatar = document.createElement('div');
    avatar.classList.add('avatar', `${sender}-avatar`);
    if (sender === 'user') {
      avatar.textContent = 'Dev';
    } else {
      avatar.innerHTML = `<img src="flutter-logo.png?v=3" alt="FlutterCraft" class="bot-avatar-img" />`;
    }

    // Message Bubble
    const bubble = document.createElement('div');
    bubble.classList.add('message-bubble');
    if (isError) bubble.classList.add('error-bubble');

    let contentContainer = null;
    let editContainer = null;
    let editTextarea = null;

    // Jika pesan user memiliki attachment file
    if (sender === 'user' && attachment) {
      const attachBadge = document.createElement('div');
      attachBadge.classList.add('msg-attachment-badge');
      const icon = getFileIcon(attachment.name);
      attachBadge.innerHTML = `<span>${icon}</span> <span>${attachment.name} (${formatBytes(attachment.size)})</span>`;
      bubble.appendChild(attachBadge);

      if (rawText) {
        const textElem = document.createElement('div');
        textElem.textContent = rawText;
        bubble.appendChild(textElem);
      }
    } else if (sender === 'bot') {
      // 1. Rendered Markdown Container
      contentContainer = document.createElement('div');
      contentContainer.classList.add('message-rendered-content');
      if (typeof marked !== 'undefined' && typeof marked.parse === 'function') {
        contentContainer.innerHTML = marked.parse(rawText);
      } else {
        contentContainer.textContent = rawText;
      }
      bubble.appendChild(contentContainer);

      // 2. In-Place PRD Editor (Hanya untuk dokumen PRD)
      if (isPRDDoc) {
        editContainer = document.createElement('div');
        editContainer.classList.add('prd-edit-container', 'hidden');

        const editHeader = document.createElement('div');
        editHeader.classList.add('prd-edit-header');
        editHeader.innerHTML = `
          <span class="prd-edit-title">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            Mode Edit PRD (Markdown)
          </span>
        `;

        const editActions = document.createElement('div');
        editActions.classList.add('prd-edit-actions');

        const btnCancelEdit = document.createElement('button');
        btnCancelEdit.type = 'button';
        btnCancelEdit.classList.add('btn-cancel-edit');
        btnCancelEdit.textContent = '❌ Batal';

        const btnSaveEdit = document.createElement('button');
        btnSaveEdit.type = 'button';
        btnSaveEdit.classList.add('btn-save-edit');
        btnSaveEdit.innerHTML = `💾 Simpan Perubahan`;

        editActions.appendChild(btnCancelEdit);
        editActions.appendChild(btnSaveEdit);
        editHeader.appendChild(editActions);

        editTextarea = document.createElement('textarea');
        editTextarea.classList.add('prd-edit-textarea');
        editTextarea.spellcheck = false;
        editTextarea.placeholder = 'Tulis atau edit teks markdown PRD di sini...';

        editContainer.appendChild(editHeader);
        editContainer.appendChild(editTextarea);
        bubble.appendChild(editContainer);

        // Handler Batal Edit
        btnCancelEdit.addEventListener('click', () => {
          editContainer.classList.add('hidden');
          contentContainer.classList.remove('hidden');
          meta.classList.remove('hidden');
          if (pipelineBar) pipelineBar.classList.remove('hidden');
        });

        // Handler Simpan Perubahan Edit
        btnSaveEdit.addEventListener('click', () => {
          const updatedVal = editTextarea.value.trim();
          if (updatedVal) {
            rawText = updatedVal;
            latestActivePRD = updatedVal;
            if (typeof marked !== 'undefined' && typeof marked.parse === 'function') {
              contentContainer.innerHTML = marked.parse(rawText);
            } else {
              contentContainer.textContent = rawText;
            }
            editContainer.classList.add('hidden');
            contentContainer.classList.remove('hidden');
            meta.classList.remove('hidden');
            if (pipelineBar) pipelineBar.classList.remove('hidden');
            showToast('✓ Dokumen PRD berhasil diperbarui!', 'success');
          }
        });
      }
    } else {
      if (sender === 'user' && msgMode === 'prd') {
        const archBadge = document.createElement('div');
        archBadge.classList.add('user-arch-tag');
        const arch = getSelectedArchitecture();
        const color = getColorConfig();
        const isOffline = arch.network.includes('Tidak Ada') || arch.network.includes('Offline');
        const netTag = isOffline ? '📴 Offline' : arch.network.split(' ')[0];
        const colorTag = color.name.includes('Tidak Ada') ? 'Polos' : color.name.split(' ')[0];
        archBadge.textContent = `🏛️ ${arch.pattern.split(' ')[0]} • ${arch.state.split(' ')[0]} • ${netTag} • 🎨 ${colorTag}`;
        bubble.appendChild(archBadge);
      }
      const textElem = document.createElement('div');
      textElem.textContent = rawText;
      bubble.appendChild(textElem);
    }

    // Metadata & Action Buttons
    const meta = document.createElement('div');
    meta.classList.add('message-meta');

    const timeSpan = document.createElement('span');
    timeSpan.textContent = getCurrentTime();
    meta.appendChild(timeSpan);

    let pipelineBar = null;

    if (sender === 'bot' && !isError) {
      // Tombol Salin
      const copyBtn = document.createElement('button');
      copyBtn.classList.add('copy-btn');
      copyBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        Salin
      `;
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(rawText).then(() => {
          copyBtn.innerHTML = '✓ Tersalin!';
          setTimeout(() => {
            copyBtn.innerHTML = `
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              Salin
            `;
          }, 1800);
        });
      });
      meta.appendChild(copyBtn);

      // Tombol Edit PRD (In-Place Markdown Editor)
      if (isPRDDoc && editContainer && editTextarea) {
        const editBtn = document.createElement('button');
        editBtn.classList.add('edit-prd-btn');
        editBtn.innerHTML = `
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
          Edit PRD
        `;
        editBtn.addEventListener('click', () => {
          editTextarea.value = rawText;
          contentContainer.classList.add('hidden');
          meta.classList.add('hidden');
          if (pipelineBar) pipelineBar.classList.add('hidden');
          editContainer.classList.remove('hidden');
          editTextarea.focus();
        });
        meta.appendChild(editBtn);
      }

      // Tombol Download Markdown / PRD
      if (isPRDDoc || rawText.includes('## ') || rawText.includes('# ')) {
        const downloadBtn = document.createElement('button');
        downloadBtn.classList.add('download-prd-btn');
        downloadBtn.innerHTML = `
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          Download .md (PRD)
        `;
        downloadBtn.addEventListener('click', () => {
          const dateStr = new Date().toISOString().slice(0, 10);
          const filename = isPRDDoc ? `Flutter_Feature_PRD_${dateStr}.md` : `Flutter_Architecture_${dateStr}.md`;
          downloadAsMarkdown(filename, rawText);
        });
        meta.appendChild(downloadBtn);
      }
    }

    bubble.appendChild(meta);

    // ==========================================
    // ALUR PIPELINE TERKONTROL (TANPA AUTO-SUBMIT)
    // ==========================================
    if (sender === 'bot' && !isError) {
      pipelineBar = document.createElement('div');
      pipelineBar.classList.add('pipeline-action-bar');

      if (isPRDDoc) {
        // Tombol 1: Bawa ke Menu 2 (UI Flutter) - Siapkan Draft tanpa langsung auto-submit
        const btnNextUI = document.createElement('button');
        btnNextUI.classList.add('pipeline-btn');
        btnNextUI.innerHTML = `
          <span>🎨</span>
          <span>Bawa ke Menu 2: Siapkan UI Flutter</span>
        `;
        btnNextUI.addEventListener('click', () => {
          switchMode('flutter_ui');
          latestActivePRD = rawText;
          userInput.value = 'Berdasarkan PRD di atas, tolong buatkan kode Flutter UI modern (Material 3 Anti-Slop, Atomic Widgets, Shimmer Loading, Anti-Overflow) untuk screen: \n[Sebutkan nama screen spesifik dari PRD, misal: HomeScreen / DetailScreen]';
          autoResizeTextarea();
          userInput.focus();
          showToast('🎨 Draf UI disiapkan di Menu 2! Tentukan nama screen lalu klik Kirim.');
        });
        pipelineBar.appendChild(btnNextUI);

        // Tombol 2: Bawa ke Menu 3 (Arsitektur & State) - Siapkan Draft tanpa langsung auto-submit
        const btnNextState = document.createElement('button');
        btnNextState.classList.add('pipeline-btn', 'accent');
        btnNextState.innerHTML = `
          <span>⚙️</span>
          <span>Bawa ke Menu 3: Siapkan State & Logic</span>
        `;
        btnNextState.addEventListener('click', () => {
          switchMode('state');
          latestActivePRD = rawText;
          userInput.value = 'Berdasarkan PRD di atas, tolong rancang arsitektur State Management (BLoC/Cubit), UseCases, Repository, dan Data Flow untuk modul: \n[Sebutkan nama modul atau fitur spesifik dari PRD di sini]';
          autoResizeTextarea();
          userInput.focus();
          showToast('⚙️ Draf State disiapkan di Menu 3! Tentukan modul lalu klik Kirim.');
        });
        pipelineBar.appendChild(btnNextState);
      } else if (msgMode === 'flutter_ui') {
        // Tombol dari UI ke State - Siapkan Draft tanpa auto-submit
        const btnNextState = document.createElement('button');
        btnNextState.classList.add('pipeline-btn', 'accent');
        btnNextState.innerHTML = `
          <span>⚙️</span>
          <span>Bawa ke Menu 3: Siapkan State untuk UI Ini</span>
        `;
        btnNextState.addEventListener('click', () => {
          switchMode('state');
          userInput.value = 'Berdasarkan kode UI Flutter yang telah dibuat di atas, buatkan arsitektur state management (BLoC/Cubit), controller, dan data handling-nya.';
          autoResizeTextarea();
          userInput.focus();
          showToast('⚙️ Draf State disiapkan di Menu 3! Silakan periksa lalu klik Kirim.');
        });
        pipelineBar.appendChild(btnNextState);
      }

      if (pipelineBar.children.length > 0) {
        bubble.appendChild(pipelineBar);
      }
    }
    wrapper.appendChild(avatar);
    wrapper.appendChild(bubble);

    chatBox.appendChild(wrapper);
    scrollToBottom();
    return wrapper;
  }

  function scrollToBottom() {
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  const btnStopInline = document.getElementById('btn-stop-inline');

  let currentAbortController = null;

  function stopGeneration() {
    if (isGenerating && currentAbortController) {
      currentAbortController.abort();
      currentAbortController = null;
    }
  }

  if (btnStopInline) {
    btnStopInline.addEventListener('click', stopGeneration);
  }

  function setGenerating(loading) {
    isGenerating = loading;
    userInput.disabled = loading;

    if (loading) {
      typingIndicator.classList.remove('hidden');
      sendButton.classList.add('btn-stop');
      sendButton.title = 'Hentikan respon (Stop)';
      sendButton.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <rect x="5" y="5" width="14" height="14" rx="2" />
        </svg>
      `;
      sendButton.disabled = false; // Tetap aktif agar bisa diklik untuk STOP!
      scrollToBottom();
    } else {
      typingIndicator.classList.add('hidden');
      sendButton.classList.remove('btn-stop');
      sendButton.title = 'Kirim pesan';
      sendButton.innerHTML = `
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
      `;
      userInput.focus();
    }
  }

  // ==========================================
  // 8. ATTACHMENT HANDLERS (DOKUMEN, GAMBAR, AUDIO, VIDEO)
  // ==========================================
  if (btnAttach && attachmentMenu) {
    btnAttach.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = attachmentMenu.classList.contains('hidden');
      if (isHidden) {
        attachmentMenu.classList.remove('hidden');
        btnAttach.classList.add('active');
      } else {
        attachmentMenu.classList.add('hidden');
        btnAttach.classList.remove('active');
      }
    });

    document.addEventListener('click', (e) => {
      if (!attachmentMenu.contains(e.target) && e.target !== btnAttach && !btnAttach.contains(e.target)) {
        attachmentMenu.classList.add('hidden');
        btnAttach.classList.remove('active');
      }
    });

    attachmentOptions.forEach((opt) => {
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        const type = opt.getAttribute('data-type');
        if (type === 'image') {
          mediaFileInput.accept = 'image/*';
        } else if (type === 'document') {
          mediaFileInput.accept = '.pdf,.txt,.csv,.json,.doc,.docx';
        } else if (type === 'audio') {
          mediaFileInput.accept = 'audio/*';
        } else if (type === 'video') {
          mediaFileInput.accept = 'video/*';
        }
        attachmentMenu.classList.add('hidden');
        btnAttach.classList.remove('active');
        mediaFileInput.click();
      });
    });

    mediaFileInput.addEventListener('change', () => {
      if (mediaFileInput.files && mediaFileInput.files.length > 0) {
        selectedMediaFile = mediaFileInput.files[0];
        fileChipIcon.textContent = getFileIcon(selectedMediaFile.name);
        fileChipName.textContent = selectedMediaFile.name;
        fileChipSize.textContent = formatBytes(selectedMediaFile.size);
        filePreviewBar.classList.remove('hidden');
        userInput.focus();
      }
    });

    if (btnRemoveFile) {
      btnRemoveFile.addEventListener('click', () => {
        selectedMediaFile = null;
        mediaFileInput.value = '';
        filePreviewBar.classList.add('hidden');
      });
    }
  }

  // ==========================================
  // 9. HANDLE SUBMIT PESAN & STOP CONTROL
  // ==========================================
  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Jika sedang generating dan tombol ditekan, hentikan generasi
    if (isGenerating) {
      stopGeneration();
      return;
    }

    const userMessage = userInput.value.trim();
    if (!userMessage && !selectedMediaFile) return;

    const requestMode = currentMode;
    const fileToSend = selectedMediaFile;

    // Reset file selection UI
    if (selectedMediaFile) {
      appendMessage('user', userMessage, false, requestMode, fileToSend);
      selectedMediaFile = null;
      if (mediaFileInput) mediaFileInput.value = '';
      if (filePreviewBar) filePreviewBar.classList.add('hidden');
    } else {
      appendMessage('user', userMessage, false, requestMode);
    }

    userInput.value = '';
    userInput.style.height = 'auto';
    if (inputWrapper) inputWrapper.classList.remove('multi-line');

    setGenerating(true);
    currentAbortController = new AbortController();

    try {
      let data;
      let messageToSend = userMessage;
      if (requestMode === 'prd') {
        messageToSend = getSelectedArchitecturePrompt(userMessage);
      } else if (latestActivePRD && (requestMode === 'flutter_ui' || requestMode === 'state') && userMessage.toLowerCase().includes('prd')) {
        messageToSend = `[REFERENSI DOKUMEN PRD YANG TELAH DISETUJUI & DIEDIT]:
${latestActivePRD}

[INSTRUKSI DEVELOPER]:
${userMessage}`;
      }

      if (fileToSend) {
        typingStatusText.textContent = 'FlutterCraft sedang menganalisis berkas media...';
        const formData = new FormData();
        formData.append('file', fileToSend);
        if (userMessage) {
          formData.append('prompt', messageToSend);
        }
        formData.append('mode', requestMode);
        if (selectedModelId) {
          formData.append('model', selectedModelId);
        }

        const response = await fetch(MULTIMODAL_ENDPOINT, {
          method: 'POST',
          body: formData,
          signal: currentAbortController.signal,
        });

        data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || `Server error (${response.status})`);
        }
      } else {
        const response = await fetch(CHAT_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: messageToSend,
            history: conversationHistory,
            mode: requestMode,
            model: selectedModelId,
          }),
          signal: currentAbortController.signal,
        });

        data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || `Server error (${response.status})`);
        }

        if (Array.isArray(data.history)) {
          conversationHistory = data.history;
        }
      }

      appendMessage('bot', data.result || 'Tidak ada balasan.', false, requestMode);
    } catch (err) {
      if (err.name === 'AbortError') {
        appendMessage('bot', '⏹️ *Generasi dihentikan oleh pengguna.*', false, requestMode);
        return;
      }

      console.error('Chat error:', err);

      let errorMsg = `⚠️ **Gagal terhubung ke FlutterCraft Backend.**\n\n`;
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        errorMsg += `Pastikan server backend Node.js di terminal sudah berjalan:\n\`\`\`bash\nnpm run dev\n# atau node index.js di port 3000\n\`\`\``;
      } else {
        errorMsg += `Detail kendala: ${err.message}`;
      }

      const errWrapper = appendMessage('bot', errorMsg, true);

      const retryBtn = document.createElement('button');
      retryBtn.classList.add('retry-btn');
      retryBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="1 4 1 10 7 10"></polyline>
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
        </svg>
        Coba Kirim Ulang
      `;
      retryBtn.addEventListener('click', () => {
        errWrapper.remove();
        userInput.value = userMessage;
        chatForm.dispatchEvent(new Event('submit'));
      });
      errWrapper.querySelector('.message-bubble').appendChild(retryBtn);
    } finally {
      currentAbortController = null;
      setGenerating(false);
    }
  });

  // ==========================================
  // 9. BERSIHKAN PERCAKAPAN
  // ==========================================
  btnClear.addEventListener('click', () => {
    if (chatBox.children.length === 0 && conversationHistory.length === 0) return;

    if (confirm('Apakah kamu yakin ingin membersihkan riwayat percakapan ini?')) {
      chatBox.innerHTML = '';
      conversationHistory = [];
      if (welcomeScreen) {
        welcomeScreen.style.display = 'flex';
      }
      userInput.value = '';
      userInput.focus();
    }
  });
});
