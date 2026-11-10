import { describe, expect, it } from 'vitest';
import {
  clearSessionHint, loadSessionHint, saveSessionHint, SESSION_HINT_KEY,
  type SessionHint, type SessionHintStorage,
} from './index.js';

class MemoryStorage implements SessionHintStorage {
  readonly entries = new Map<string, string>([['unrelated', 'keep']]);
  readonly calls: string[] = [];
  fail: 'read' | 'write' | 'remove' | null = null;

  getItem(key: string): string | null {
    this.calls.push(`get:${key}`);
    if (this.fail === 'read') throw new Error('unavailable');
    return this.entries.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.calls.push(`set:${key}`);
    if (this.fail === 'write') throw new Error('unavailable');
    this.entries.set(key, value);
  }

  removeItem(key: string): void {
    this.calls.push(`remove:${key}`);
    if (this.fail === 'remove') throw new Error('unavailable');
    this.entries.delete(key);
  }
}

const hint: SessionHint = Object.freeze({ roomCode: 'AB12Z9', playerId: 'player_1-A' });
const stored = JSON.stringify({ version: 1, ...hint });

describe('session hint storage', () => {
  it('uses the dedicated key and roundtrips fresh allowlisted hints', () => {
    const storage = new MemoryStorage();
    expect(SESSION_HINT_KEY).toBe('afterimage.session-hint.v1');
    expect(saveSessionHint(storage, hint)).toBe(true);
    expect(storage.entries.get(SESSION_HINT_KEY)).toBe(stored);
    const first = loadSessionHint(storage);
    const second = loadSessionHint(storage);
    expect(first).toEqual(hint);
    expect(first).not.toBe(hint);
    expect(second).not.toBe(first);
    expect(Object.keys(first!)).toEqual(['roomCode', 'playerId']);
    expect(storage.calls).toEqual([
      `set:${SESSION_HINT_KEY}`, `get:${SESSION_HINT_KEY}`, `get:${SESSION_HINT_KEY}`,
    ]);
    expect(clearSessionHint(storage)).toBe(true);
    expect(storage.entries.has(SESSION_HINT_KEY)).toBe(false);
    expect(storage.entries.get('unrelated')).toBe('keep');
  });

  it('ignores extra properties, including secrets and custom serialization', () => {
    const storage = new MemoryStorage();
    const input = Object.freeze({
      ...hint, version: 99, token: 'synthetic-token', role: 'synthetic-role',
      privateChoices: { synthetic: 'private' }, toJSON: () => ({ token: 'synthetic-token' }),
    });
    expect(saveSessionHint(storage, input)).toBe(true);
    expect(storage.entries.get(SESSION_HINT_KEY)).toBe(stored);
    expect(loadSessionHint(storage)).toEqual(hint);
  });

  it('returns null for an absent entry without removing anything', () => {
    const storage = new MemoryStorage();
    expect(loadSessionHint(storage)).toBeNull();
    expect(storage.calls).toEqual([`get:${SESSION_HINT_KEY}`]);
    expect(clearSessionHint(storage)).toBe(true);
  });

  const invalidHints: unknown[] = [
    null, undefined, [], 'hint', {}, { roomCode: hint.roomCode }, { playerId: hint.playerId },
    ...['abc123', ' ABC12', 'ABC12 ', 'ABC12', 'ABC1234', 'ABCDE\n', 'ＡBC123', 123456]
      .map((roomCode) => ({ ...hint, roomCode })),
    ...['', 'a'.repeat(65), 'player name', 'player.', 'player\n', 'é', 1, null]
      .map((playerId) => ({ ...hint, playerId })),
  ];

  it.each(invalidHints)('invalid save preserves existing data (%#)', (input) => {
    const storage = new MemoryStorage();
    storage.entries.set(SESSION_HINT_KEY, stored);
    expect(saveSessionHint(storage, input as SessionHint)).toBe(false);
    expect(storage.entries.get(SESSION_HINT_KEY)).toBe(stored);
    expect(storage.entries.get('unrelated')).toBe('keep');
    expect(storage.calls).toEqual([]);
  });

  const corruptEntries = [
    '', '{', 'null', '[]', '1', '"hint"',
    ...invalidHints.filter((value) => value !== undefined)
      .map((value) => JSON.stringify(
        typeof value === 'object' && value !== null && !Array.isArray(value)
          ? { version: 1, ...value } : value,
      )),
    ...[undefined, 0, 2, '1', null].map((version) => JSON.stringify({ ...hint, version })),
    JSON.stringify({ version: 1, ...hint, token: 'synthetic-token' }),
    JSON.stringify({ version: 1, ...hint, role: 'synthetic-role' }),
    JSON.stringify({ version: 1, ...hint, privateChoices: {} }),
    JSON.stringify({ version: 1, ...hint, unknown: true }),
  ];

  it.each(corruptEntries)('rejects corrupt data and removes only its key (%#)', (raw) => {
    const storage = new MemoryStorage();
    storage.entries.set(SESSION_HINT_KEY, raw);
    expect(loadSessionHint(storage)).toBeNull();
    expect(storage.entries.has(SESSION_HINT_KEY)).toBe(false);
    expect(storage.entries.get('unrelated')).toBe('keep');
    expect(storage.calls).toEqual([`get:${SESSION_HINT_KEY}`, `remove:${SESSION_HINT_KEY}`]);
  });

  it.each(['a', 'a'.repeat(64), 'A_0-z'])('accepts player ID boundaries: %s', (playerId) => {
    const storage = new MemoryStorage();
    expect(saveSessionHint(storage, { ...hint, playerId })).toBe(true);
    expect(loadSessionHint(storage)).toEqual({ ...hint, playerId });
  });

  it('handles read, write, and remove failures without throwing', () => {
    const storage = new MemoryStorage();
    storage.entries.set(SESSION_HINT_KEY, stored);
    storage.fail = 'read';
    expect(loadSessionHint(storage)).toBeNull();
    expect(storage.entries.get(SESSION_HINT_KEY)).toBe(stored);
    expect(storage.calls).toEqual([`get:${SESSION_HINT_KEY}`]);
    storage.fail = 'write';
    expect(saveSessionHint(storage, { ...hint, playerId: 'new-player' })).toBe(false);
    expect(storage.entries.get(SESSION_HINT_KEY)).toBe(stored);
    storage.fail = 'remove';
    expect(clearSessionHint(storage)).toBe(false);
    storage.entries.set(SESSION_HINT_KEY, '{');
    expect(loadSessionHint(storage)).toBeNull();
    expect(storage.entries.get(SESSION_HINT_KEY)).toBe('{');
    expect(storage.entries.get('unrelated')).toBe('keep');
  });
});
