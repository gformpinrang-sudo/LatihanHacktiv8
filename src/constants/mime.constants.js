/**
 * Pemetaan Ekstensi File ke MIME Type Resmi
 */
export const MIME_BY_EXT = Object.freeze({
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
});

/**
 * Ekstensi File yang Dilarang Keras demi Keamanan Server (Mencegah Eksekusi Malware / Script)
 */
export const DANGEROUS_EXTENSIONS = Object.freeze(
  new Set([
    'exe', 'bat', 'cmd', 'sh', 'php', 'phtml', 'dll', 'com', 'vbs',
    'ps1', 'jar', 'scr', 'msi', 'bin', 'py', 'pl'
  ])
);
