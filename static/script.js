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

  // Konfigurasi API Backend
  const isLocalServer = window.location.origin.includes(':3000');
  const BACKEND_BASE = isLocalServer ? '' : 'http://localhost:3000';
  const CHAT_ENDPOINT = `${BACKEND_BASE}/chat`;
  const HEALTH_ENDPOINT = `${BACKEND_BASE}/health`;
  const MULTIMODAL_ENDPOINT = `${BACKEND_BASE}/generate-multimodal`;

  // State percakapan & media
  let currentMode = 'prd'; // default: Bikin Plan / PRD (Langkah 1)
  let conversationHistory = [];
  let isGenerating = false;
  let selectedMediaFile = null;

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
  // 2. CEK KONEKSI SERVER & MODEL INFO
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

        if (data.currentModel) {
          modelBadge.textContent = data.currentModel.replace('gemini-', '');
        }
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
  // 3. MODE SELECTOR (TABS)
  // ==========================================
  function switchMode(modeKey) {
    if (!MODE_CONFIG[modeKey]) return;
    currentMode = modeKey;

    modeTabs.forEach((tab) => {
      tab.classList.toggle('active', tab.getAttribute('data-mode') === modeKey);
    });

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

    const wrapper = document.createElement('div');
    wrapper.classList.add('message-wrapper', sender);

    // Avatar
    const avatar = document.createElement('div');
    avatar.classList.add('avatar', `${sender}-avatar`);
    if (sender === 'user') {
      avatar.textContent = 'Dev';
    } else {
      avatar.innerHTML = `<img src="flutter-logo.png" alt="FlutterCraft" class="bot-avatar-img" />`;
    }

    // Message Bubble
    const bubble = document.createElement('div');
    bubble.classList.add('message-bubble');
    if (isError) bubble.classList.add('error-bubble');

    // Jika pesan user memiliki attachment file
    if (sender === 'user' && attachment) {
      const attachBadge = document.createElement('div');
      attachBadge.classList.add('msg-attachment-badge');
      const icon = getFileIcon(attachment.name);
      attachBadge.innerHTML = `<span>${icon}</span> <span>${attachment.name} (${formatBytes(attachment.size)})</span>`;
      bubble.appendChild(attachBadge);

      if (text) {
        const textElem = document.createElement('div');
        textElem.textContent = text;
        bubble.appendChild(textElem);
      }
    } else if (sender === 'bot') {
      if (typeof marked !== 'undefined' && typeof marked.parse === 'function') {
        bubble.innerHTML = marked.parse(text);
      } else {
        bubble.textContent = text;
      }
    } else {
      bubble.textContent = text;
    }

    // Metadata & Action Buttons
    const meta = document.createElement('div');
    meta.classList.add('message-meta');

    const timeSpan = document.createElement('span');
    timeSpan.textContent = getCurrentTime();
    meta.appendChild(timeSpan);

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
        navigator.clipboard.writeText(text).then(() => {
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

      // Tombol Download Markdown / PRD
      if (msgMode === 'prd' || text.toLowerCase().includes('prd') || text.includes('## ') || text.includes('# ')) {
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
          const filename = msgMode === 'prd' ? `Flutter_Feature_PRD_${dateStr}.md` : `Flutter_Architecture_${dateStr}.md`;
          downloadAsMarkdown(filename, text);
        });
        meta.appendChild(downloadBtn);
      }
    }

    bubble.appendChild(meta);

    // ==========================================
    // ALUR OTOMATIS: PIPELINE NEXT-STEP BUTTONS
    // ==========================================
    if (sender === 'bot' && !isError) {
      const pipelineBar = document.createElement('div');
      pipelineBar.classList.add('pipeline-action-bar');

      if (msgMode === 'prd' || text.toLowerCase().includes('prd')) {
        // Tombol Lanjut ke Langkah 2: UI Flutter
        const btnNextUI = document.createElement('button');
        btnNextUI.classList.add('pipeline-btn');
        btnNextUI.innerHTML = `
          <span>🎨</span>
          <span>Lanjut Langkah 2: Buat UI Flutter dari PRD Ini</span>
        `;
        btnNextUI.addEventListener('click', () => {
          switchMode('flutter_ui');
          userInput.value = 'Berdasarkan PRD di atas, buatkan kode UI Flutter modern (Material 3 Anti-Slop, atomic widgets, shimmer skeleton loading, dan micro-interactions) untuk screen utamanya.';
          autoResizeTextarea();
          chatForm.dispatchEvent(new Event('submit'));
        });
        pipelineBar.appendChild(btnNextUI);

        // Tombol Lanjut ke Langkah 3: Arsitektur & State
        const btnNextState = document.createElement('button');
        btnNextState.classList.add('pipeline-btn', 'accent');
        btnNextState.innerHTML = `
          <span>⚙️</span>
          <span>Lanjut Langkah 3: Buat State & Logic</span>
        `;
        btnNextState.addEventListener('click', () => {
          switchMode('state');
          userInput.value = 'Berdasarkan PRD di atas, rancang arsitektur state management (Riverpod AsyncNotifier / BLoC), model data DTO, dan repository pattern-nya.';
          autoResizeTextarea();
          chatForm.dispatchEvent(new Event('submit'));
        });
        pipelineBar.appendChild(btnNextState);
      } else if (msgMode === 'flutter_ui') {
        // Tombol Lanjut dari UI ke State
        const btnNextState = document.createElement('button');
        btnNextState.classList.add('pipeline-btn', 'accent');
        btnNextState.innerHTML = `
          <span>⚙️</span>
          <span>Lanjut Langkah 3: Buat State Management untuk UI Ini</span>
        `;
        btnNextState.addEventListener('click', () => {
          switchMode('state');
          userInput.value = 'Berdasarkan kode UI Flutter di atas, buatkan arsitektur state management (Riverpod/BLoC), controller, dan data handling-nya.';
          autoResizeTextarea();
          chatForm.dispatchEvent(new Event('submit'));
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
      if (fileToSend) {
        typingStatusText.textContent = 'FlutterCraft sedang menganalisis berkas media...';
        const formData = new FormData();
        formData.append('file', fileToSend);
        if (userMessage) {
          formData.append('prompt', userMessage);
        }
        formData.append('mode', requestMode);

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
            message: userMessage,
            history: conversationHistory,
            mode: requestMode,
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
