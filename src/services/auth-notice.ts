/**
 * A failed sign-in usually unmounts the form that would have shown the error:
 * Firebase publishes the new auth state before the flow finishes, the login page
 * redirects away, and the redirect back mounts a blank form. Notices live here
 * instead, so the reason survives that round trip.
 *
 * It is a subscribable store rather than a plain read-on-mount value because the
 * failure can be recorded either before or after the page remounts, depending on
 * whether the flow signed out before throwing.
 */
const AUTH_NOTICE_KEY = 'authNotice';

const listeners = new Set<() => void>();
let notice = read();

function read(): string {
  try {
    return sessionStorage.getItem(AUTH_NOTICE_KEY) ?? '';
  } catch {
    // Storage can be unavailable (private mode, blocked cookies); the console
    // error from the original failure is then the only record.
    return '';
  }
}

function write(message: string): void {
  try {
    if (message) {
      sessionStorage.setItem(AUTH_NOTICE_KEY, message);
    } else {
      sessionStorage.removeItem(AUTH_NOTICE_KEY);
    }
  } catch {
    // ignore
  }
}

function publish(message: string): void {
  notice = message;
  write(message);
  listeners.forEach((listener) => listener());
}

export function setAuthNotice(message: string): void {
  publish(message);
}

export function clearAuthNotice(): void {
  publish('');
}

export function getAuthNotice(): string {
  return notice;
}

export function subscribeAuthNotice(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
