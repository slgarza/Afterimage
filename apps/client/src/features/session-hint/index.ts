/** A convenience hint only; callers must revalidate membership with the service. */
export interface SessionHint {
  readonly roomCode: string;
  readonly playerId: string;
}

export interface SessionHintStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const SESSION_HINT_KEY = 'afterimage.session-hint.v1';

function isHint(value: unknown): value is SessionHint {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const hint = value as Record<string, unknown>;
  return typeof hint.roomCode === 'string'
    && hint.roomCode.length === 6
    && !/[^A-Z0-9]/u.test(hint.roomCode)
    && typeof hint.playerId === 'string'
    && hint.playerId.length >= 1 && hint.playerId.length <= 64
    && !/[^A-Za-z0-9_-]/u.test(hint.playerId);
}

export function clearSessionHint(storage: SessionHintStorage): boolean {
  try {
    storage.removeItem(SESSION_HINT_KEY);
    return true;
  } catch {
    return false;
  }
}

export function loadSessionHint(storage: SessionHintStorage): SessionHint | null {
  let raw: string | null;
  try {
    raw = storage.getItem(SESSION_HINT_KEY);
  } catch {
    return null;
  }
  if (raw === null) return null;

  try {
    const value: unknown = JSON.parse(raw);
    if (isHint(value)
      && Object.keys(value).length === 3
      && Object.hasOwn(value, 'version')
      && (value as SessionHint & { version: unknown }).version === 1) {
      return { roomCode: value.roomCode, playerId: value.playerId };
    }
  } catch {
    // Corrupt entries are discarded below, without exposing their contents.
  }
  clearSessionHint(storage);
  return null;
}

export function saveSessionHint(storage: SessionHintStorage, hint: SessionHint): boolean {
  try {
    if (!isHint(hint)) return false;
    storage.setItem(SESSION_HINT_KEY, JSON.stringify({
      version: 1,
      roomCode: hint.roomCode,
      playerId: hint.playerId,
    }));
    return true;
  } catch {
    return false;
  }
}
