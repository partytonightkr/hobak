import axios from 'axios';

const API_BASE_URL = '/api/v1';

// -------------------------------------------------------------------
// In-memory access token storage.
// The token is NEVER written to localStorage, cookies, or any other
// persistent browser storage.  It lives only as a JS variable, which
// makes it inaccessible to XSS-injected scripts that read storage.
// After a full page reload the token is lost; the silent refresh
// (HTTP-only cookie) will obtain a new one.
// -------------------------------------------------------------------
let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string): void {
  accessToken = token;
}

export function clearAccessToken(): void {
  accessToken = null;
}

export async function refreshAccessToken(): Promise<string | null> {
  try {
    // Refresh token is sent via HTTP-only cookie automatically
    const { data } = await axios.post(
      `${API_BASE_URL}/auth/refresh`,
      {},
      { withCredentials: true },
    );
    setAccessToken(data.accessToken);
    return data.accessToken;
  } catch {
    clearAccessToken();
    return null;
  }
}

let logoutTimer: ReturnType<typeof setTimeout> | null = null;

export function scheduleAutoLogout(expiresInMs: number, onLogout: () => void): void {
  if (logoutTimer) {
    clearTimeout(logoutTimer);
  }
  // Schedule logout 1 minute before token expires
  const timeout = Math.max(expiresInMs - 60_000, 0);
  logoutTimer = setTimeout(onLogout, timeout);
}

export function cancelAutoLogout(): void {
  if (logoutTimer) {
    clearTimeout(logoutTimer);
    logoutTimer = null;
  }
}

export function parseJwtExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp) {
      return payload.exp * 1000; // convert to milliseconds
    }
    return null;
  } catch {
    return null;
  }
}

// Password validation matching NIST SP 800-63B rules
// No composition rules -- only length + breached-password check
const COMMON_PASSWORDS = new Set([
  'password', '12345678', '123456789', '1234567890', 'qwerty123',
  'password1', 'iloveyou', 'sunshine1', 'princess1', 'football1',
  'trustno1', 'letmein01', 'baseball1', 'master123', 'dragon123',
  'monkey123', 'shadow123', 'abcdefgh', 'abcd1234', 'abc12345',
  'qwerty12', 'password123', 'welcome1', 'admin123', 'passw0rd',
  'changeme', 'p@ssword',
]);

export function validatePassword(password: string): string[] {
  const errors: string[] = [];
  if (password.length < 8) errors.push('At least 8 characters');
  if (password.length > 128) errors.push('At most 128 characters');
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    errors.push('This password is too common. Please choose a different one.');
  }
  return errors;
}

export function validateUsername(username: string): string[] {
  const errors: string[] = [];
  if (username.length < 3) errors.push('At least 3 characters');
  if (username.length > 30) errors.push('At most 30 characters');
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) errors.push('Only letters, numbers, underscores, and hyphens');
  return errors;
}
