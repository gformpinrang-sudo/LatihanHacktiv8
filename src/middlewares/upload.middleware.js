import multer from 'multer';
import { ENV } from '../config/env.config.js';
import { DANGEROUS_EXTENSIONS } from '../constants/mime.constants.js';

/**
 * Konfigurasi penyimpanan memori Multer dengan batasan ketat demi keamanan server.
 */
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: ENV.MAX_FILE_SIZE_BYTES, // Batas memori 25 MB
    files: 1,                          // Maksimal 1 file per request
  },
  fileFilter: (req, file, cb) => {
    const ext = file.originalname?.split('.').pop()?.toLowerCase();
    if (ext && DANGEROUS_EXTENSIONS.has(ext)) {
      return cb(new Error(`File berekstensi .${ext} dilarang demi keamanan.`));
    }
    cb(null, true);
  },
});

/**
 * Middleware fleksibel untuk menangani upload dari berbagai nama field standar.
 */
export const uploadMedia = upload.fields([
  { name: 'file', maxCount: 1 },
  { name: 'image', maxCount: 1 },
  { name: 'document', maxCount: 1 },
  { name: 'audio', maxCount: 1 },
  { name: 'video', maxCount: 1 },
  { name: 'media', maxCount: 1 },
]);
