import { MIME_BY_EXT } from '../constants/mime.constants.js';

/**
 * Mengekstrak file dari request multer (mendukung req.file atau req.files dengan multi-field).
 * Membetulkan koreksi MIME type jika client mengirimkan octet-stream generic.
 * @param {import('express').Request} req
 * @returns {Express.Multer.File | null}
 */
export function extractUploadedFile(req) {
  let file = null;

  if (req.file) {
    file = req.file;
  } else if (req.files) {
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

/**
 * Mengelompokkan MIME type ke dalam kategori media (image, audio, video, document, unknown).
 * @param {string} [mimetype]
 * @returns {'image' | 'audio' | 'video' | 'document' | 'unknown'}
 */
export function getMediaCategory(mimetype = '') {
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

/**
 * Format part media untuk Gemini API (inlineData Base64).
 * @param {Express.Multer.File} file
 * @returns {Promise<{ part: { inlineData: { mimeType: string, data: string } }, cleanup: null }>}
 */
export async function createMediaPart(file) {
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
