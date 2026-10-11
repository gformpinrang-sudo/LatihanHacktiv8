import { geminiService } from '../services/gemini.service.js';
import { extractUploadedFile, getMediaCategory, createMediaPart } from '../utils/file.util.js';
import { sanitizePrompt, safeErrorMessage } from '../utils/sanitizer.util.js';
import { SYSTEM_PRESETS } from '../constants/presets.constants.js';

/**
 * Controller untuk endpoints generasi konten AI & analisis multimodal.
 * Memisahkan logika HTTP dari logika AI (Single Responsibility Principle).
 */
export class AiController {
  /**
   * POST /generate-text
   */
  static async generateText(req, res) {
    const prompt = sanitizePrompt(req.body?.prompt);

    if (!prompt) {
      return res.status(400).json({ message: 'Field "prompt" wajib diisi dan tidak boleh kosong.' });
    }

    try {
      const response = await geminiService.generateContentWithRetry(prompt);
      return res.status(200).json({ result: response.text });
    } catch (e) {
      console.error('Error /generate-text:', e?.message || e);
      return res.status(e?.status || 500).json({ message: safeErrorMessage(e) });
    }
  }

  /**
   * POST /generate-from-image
   */
  static async generateFromImage(req, res) {
    const file = extractUploadedFile(req);
    const prompt = sanitizePrompt(req.body?.prompt) || 'Deskripsikan dan analisis gambar ini secara detail.';

    if (!file) {
      return res.status(400).json({ message: 'File gambar wajib diunggah (field: image atau file).' });
    }

    if (!file.mimetype?.startsWith('image/')) {
      return res.status(400).json({
        message: `File harus berupa gambar, namun terdeteksi: ${file.mimetype || 'tidak dikenal'}`,
      });
    }

    try {
      const media = await createMediaPart(file);
      const contents = [prompt, media.part];

      const response = await geminiService.generateContentWithRetry(contents);
      return res.status(200).json({
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
      return res.status(e?.status || 500).json({ message: safeErrorMessage(e) });
    }
  }

  /**
   * POST /generate-from-document
   */
  static async generateFromDocument(req, res) {
    const file = extractUploadedFile(req);
    const prompt = sanitizePrompt(req.body?.prompt) || 'Analisis dan buat ringkasan poin-poin penting dari dokumen ini.';

    if (!file) {
      return res.status(400).json({ message: 'File dokumen wajib diunggah (field: document atau file).' });
    }

    const category = getMediaCategory(file.mimetype);
    if (category !== 'document' && !file.mimetype.includes('pdf')) {
      return res.status(400).json({
        message: `File harus berupa dokumen (PDF/Teks/CSV), namun terdeteksi: ${file.mimetype || 'tidak dikenal'}`,
      });
    }

    try {
      const media = await createMediaPart(file);
      const contents = [prompt, media.part];

      const response = await geminiService.generateContentWithRetry(contents);
      return res.status(200).json({
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
      return res.status(e?.status || 500).json({ message: safeErrorMessage(e) });
    }
  }

  /**
   * POST /generate-from-audio
   */
  static async generateFromAudio(req, res) {
    const file = extractUploadedFile(req);
    const prompt = sanitizePrompt(req.body?.prompt) || 'Transkripsikan isi audio ini dan jelaskan intisari pembicaraannya.';

    if (!file) {
      return res.status(400).json({ message: 'File audio wajib diunggah (field: audio atau file).' });
    }

    if (!file.mimetype?.startsWith('audio/')) {
      return res.status(400).json({
        message: `File harus berupa audio, namun terdeteksi: ${file.mimetype || 'tidak dikenal'}`,
      });
    }

    try {
      const media = await createMediaPart(file);
      const contents = [prompt, media.part];

      const response = await geminiService.generateContentWithRetry(contents);
      return res.status(200).json({
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
      return res.status(e?.status || 500).json({ message: safeErrorMessage(e) });
    }
  }

  /**
   * POST /generate-from-video
   */
  static async generateFromVideo(req, res) {
    const file = extractUploadedFile(req);
    const prompt = sanitizePrompt(req.body?.prompt) || 'Jelaskan apa yang terjadi dalam video ini secara kronologis dan detail.';

    if (!file) {
      return res.status(400).json({ message: 'File video wajib diunggah (field: video atau file).' });
    }

    if (!file.mimetype?.startsWith('video/')) {
      return res.status(400).json({
        message: `File harus berupa video, namun terdeteksi: ${file.mimetype || 'tidak dikenal'}`,
      });
    }

    try {
      const media = await createMediaPart(file);
      const contents = [prompt, media.part];

      const response = await geminiService.generateContentWithRetry(contents);
      return res.status(200).json({
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
      return res.status(e?.status || 500).json({ message: safeErrorMessage(e) });
    }
  }

  /**
   * POST /generate-multimodal
   */
  static async generateMultimodal(req, res) {
    const file = extractUploadedFile(req);

    if (!file) {
      return res.status(400).json({
        message: 'File media wajib diunggah (field: file, media, image, audio, video, atau document).',
      });
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
    const modelOverride = req.body?.model || null;

    try {
      const media = await createMediaPart(file);
      const contents = [prompt, media.part];

      const response = await geminiService.generateContentWithRetry(
        contents,
        {
          systemInstruction: selectedSystemInstruction,
        },
        modelOverride
      );

      return res.status(200).json({
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
      return res.status(e?.status || 500).json({ message: safeErrorMessage(e) });
    }
  }
}
