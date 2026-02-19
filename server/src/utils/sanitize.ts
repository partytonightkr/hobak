/**
 * Input sanitization utilities for user-generated content.
 * Defense-in-depth: sanitize on input even though the primary
 * consumer (React/Next.js) escapes output by default.
 */

/**
 * Strips HTML tags from a string. Preserves the text content.
 * Use this for all user-generated text fields (post content, comments, bios, messages).
 *
 * Order of operations:
 * 1. Decode HTML entities FIRST (so encoded tags like &lt;script&gt; become real tags)
 * 2. Strip all HTML tags
 * This prevents the bypass where entity-encoded tags survive tag stripping
 * and are then decoded into executable HTML.
 */
export function stripHtml(input: string): string {
  // Step 1: Decode HTML entities so encoded tags become real tags
  let decoded = input
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&'); // &amp; must be last to avoid double-decode

  // Step 2: Strip all HTML tags (now including any that were entity-encoded)
  return decoded.replace(/<[^>]*>/g, '');
}

/**
 * Escapes HTML special characters to prevent XSS when content
 * might be rendered in a non-React context (emails, push notifications, etc.).
 */
export function escapeHtml(input: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  return input.replace(/[&<>"'/]/g, (char) => map[char]);
}

/**
 * Sanitizes user-generated content by stripping HTML tags
 * and normalizing whitespace. Preserves @mentions and #hashtags.
 */
export function sanitizeContent(input: string): string {
  let cleaned = stripHtml(input);
  // Normalize excessive whitespace/newlines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.replace(/[ \t]{2,}/g, ' ');
  return cleaned.trim();
}

/**
 * Sanitizes a username: lowercase, strip non-allowed chars.
 */
export function sanitizeUsername(input: string): string {
  return input
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .substring(0, 30);
}

/**
 * Sanitizes a display name: strip HTML, limit length.
 */
export function sanitizeDisplayName(input: string): string {
  return stripHtml(input).trim().substring(0, 50);
}

/**
 * Validates that a URL is safe (http/https only, no javascript: protocol).
 */
export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Validates that a redirect URL belongs to the allowed domain.
 * Prevents open redirect vulnerabilities.
 */
export function isSafeRedirect(url: string, allowedOrigins: string[]): boolean {
  try {
    const parsed = new URL(url);
    return allowedOrigins.some((origin) => {
      const allowed = new URL(origin);
      return parsed.origin === allowed.origin;
    });
  } catch {
    // Relative URLs are safe
    return url.startsWith('/') && !url.startsWith('//');
  }
}

/**
 * Validates a file extension against an allowlist.
 */
export function isAllowedFileExtension(filename: string, allowedExtensions: string[]): boolean {
  const ext = filename.split('.').pop()?.toLowerCase();
  return ext ? allowedExtensions.includes(`.${ext}`) : false;
}

const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const ALLOWED_VIDEO_EXTENSIONS = ['.mp4', '.webm'];
const ALLOWED_MEDIA_EXTENSIONS = [...ALLOWED_IMAGE_EXTENSIONS, ...ALLOWED_VIDEO_EXTENSIONS];

/**
 * Validates that a filename has an allowed media extension.
 */
export function isAllowedMediaFile(filename: string): boolean {
  return isAllowedFileExtension(filename, ALLOWED_MEDIA_EXTENSIONS);
}

/**
 * Prevents path traversal in filenames.
 * Returns a safe filename or null if the input is unsafe.
 */
export function sanitizeFilename(filename: string): string | null {
  // Remove path components
  const basename = filename.replace(/^.*[\\/]/, '');
  // Remove null bytes
  const cleaned = basename.replace(/\0/g, '');
  // Reject if it contains path traversal
  if (cleaned.includes('..') || cleaned.includes('/') || cleaned.includes('\\')) {
    return null;
  }
  // Reject empty filenames
  if (cleaned.length === 0) {
    return null;
  }
  return cleaned;
}
