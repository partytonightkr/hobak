import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { env } from '../config/env';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
]);

// Map of allowed MIME types to their valid file extensions.
// This prevents MIME type spoofing (e.g., uploading .html with mimetype image/jpeg).
const MIME_TO_EXTENSIONS: Record<string, Set<string>> = {
  'image/jpeg': new Set(['.jpg', '.jpeg']),
  'image/png': new Set(['.png']),
  'image/gif': new Set(['.gif']),
  'image/webp': new Set(['.webp']),
  'video/mp4': new Set(['.mp4']),
  'video/webm': new Set(['.webm']),
};

// Magic byte signatures for file type validation
const MAGIC_BYTES: Array<{ mime: string; bytes: number[]; offset?: number }> = [
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: 'image/gif', bytes: [0x47, 0x49, 0x46, 0x38] }, // GIF8
  { mime: 'image/webp', bytes: [0x57, 0x45, 0x42, 0x50], offset: 8 }, // WEBP at offset 8 in RIFF container
  { mime: 'video/mp4', bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 }, // ftyp at offset 4
  { mime: 'video/webm', bytes: [0x1a, 0x45, 0xdf, 0xa3] }, // EBML header
];

// Safe Content-Type headers for serving uploaded files
const EXTENSION_TO_CONTENT_TYPE: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};

/**
 * Validate file magic bytes match the declared MIME type.
 * Returns the detected MIME type or null if no match.
 */
export function detectMimeFromBytes(buffer: Buffer): string | null {
  for (const sig of MAGIC_BYTES) {
    const offset = sig.offset ?? 0;
    if (buffer.length < offset + sig.bytes.length) continue;
    const matches = sig.bytes.every((b, i) => buffer[offset + i] === b);
    if (matches) return sig.mime;
  }
  return null;
}

/**
 * Validate an uploaded file's magic bytes match its declared MIME type.
 * Deletes the file and throws if validation fails.
 */
export async function validateFileMagicBytes(filePath: string, declaredMime: string): Promise<void> {
  const fd = await fs.promises.open(filePath, 'r');
  try {
    const header = Buffer.alloc(16);
    await fd.read(header, 0, 16, 0);
    const detectedMime = detectMimeFromBytes(header);
    if (!detectedMime || detectedMime !== declaredMime) {
      // Delete the spoofed file
      await fs.promises.unlink(filePath).catch(() => {});
      throw new Error(
        `File content does not match declared type ${declaredMime}` +
          (detectedMime ? ` (detected: ${detectedMime})` : ''),
      );
    }
  } finally {
    await fd.close();
  }
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, env.UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    // Use the expected extension for the MIME type, not the user-provided one
    const allowedExts = MIME_TO_EXTENSIONS[file.mimetype];
    const userExt = path.extname(file.originalname).toLowerCase();
    const ext = allowedExts?.has(userExt) ? userExt : (allowedExts ? [...allowedExts][0] : '');
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

function fileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(new Error(`File type ${file.mimetype} is not allowed`));
    return;
  }

  // Validate that the file extension matches the declared MIME type
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = MIME_TO_EXTENSIONS[file.mimetype];
  if (allowedExts && !allowedExts.has(ext)) {
    cb(new Error(`File extension ${ext} does not match type ${file.mimetype}`));
    return;
  }

  cb(null, true);
}

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.MAX_FILE_SIZE,
    files: 4,
  },
});

export function getFileUrl(filename: string): string {
  return `/uploads/${filename}`;
}

/**
 * Get the safe Content-Type for a filename based on its extension.
 * Returns 'application/octet-stream' for unknown extensions.
 */
export function getSafeContentType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return EXTENSION_TO_CONTENT_TYPE[ext] || 'application/octet-stream';
}
