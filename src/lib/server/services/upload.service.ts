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

const MIME_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
};

// Magic byte signatures for file type validation
const MAGIC_BYTES: Array<{ mime: string; bytes: number[]; offset?: number }> = [
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: 'image/gif', bytes: [0x47, 0x49, 0x46, 0x38] },
  { mime: 'image/webp', bytes: [0x57, 0x45, 0x42, 0x50], offset: 8 },
  { mime: 'video/mp4', bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 },
  { mime: 'video/webm', bytes: [0x1a, 0x45, 0xdf, 0xa3] },
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
 * Save a Web API File to the upload directory.
 * Returns the relative URL for the saved file.
 */
export async function saveUploadedFile(file: File): Promise<string> {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error(`File type ${file.type} is not allowed`);
  }
  if (file.size > env.MAX_FILE_SIZE) {
    throw new Error(`File size exceeds limit of ${env.MAX_FILE_SIZE} bytes`);
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Validate magic bytes
  const detectedMime = detectMimeFromBytes(buffer);
  if (!detectedMime || detectedMime !== file.type) {
    throw new Error(
      `File content does not match declared type ${file.type}` +
        (detectedMime ? ` (detected: ${detectedMime})` : ''),
    );
  }

  const ext = MIME_TO_EXTENSION[file.type] || '';
  const filename = `${crypto.randomBytes(16).toString('hex')}${ext}`;
  const filepath = path.join(env.UPLOAD_DIR, filename);

  // Ensure upload directory exists
  await fs.promises.mkdir(env.UPLOAD_DIR, { recursive: true });
  await fs.promises.writeFile(filepath, buffer);

  return `/uploads/${filename}`;
}

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
