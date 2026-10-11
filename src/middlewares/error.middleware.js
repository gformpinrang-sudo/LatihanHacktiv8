import multer from 'multer';

/**
 * Middleware untuk menangani request ke rute yang tidak terdaftar (404).
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    message: `Rute ${req.method} ${req.originalUrl} tidak ditemukan.`,
  });
}

/**
 * Global Error Handler Middleware terpusat untuk aplikasi Express.
 */
export function globalErrorHandler(err, req, res, next) {
  // Tangani kesalahan ukuran atau batas file dari Multer
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

  // Tangani JSON parsing error
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ message: 'Format JSON body tidak valid.' });
  }

  // Tangani penolakan file terlarang dari fileFilter
  if (err?.message?.includes('dilarang demi keamanan')) {
    return res.status(400).json({ message: err.message });
  }

  console.error('Unhandled Server Error:', err?.message || err);
  res.status(500).json({ message: 'Terjadi kesalahan internal server.' });
}
