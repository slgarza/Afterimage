import { describe, expect, it } from 'vitest';
import { reconnectPresence, type Result } from '../../src/parallel100/reconnect-presence.js';

const member = {
  verifiedPlayerId: 'member_1', boundPlayerId: 'member_1',
  previousGeneration: 0, requestedGeneration: 1, permanentlyDisconnected: false,
} as const;

function runtime(input: unknown): ReturnType<typeof reconnectPresence> {
  return reconnectPresence(input as Parameters<typeof reconnectPresence>[0]);
}

const invalid = { ok: false, error: { code: 'invalid-input' } } as const;

describe('reconnectPresence', () => {
  it.each([false, true])('restores presence while preserving permanent Disconnect=%s', (permanentlyDisconnected) => {
    const input = Object.freeze({ ...member, permanentlyDisconnected });
    const result: Result<{ connected: true; generation: number; active: boolean; discardPrivateCache: true }> = reconnectPresence(input);
    expect(result).toEqual({ ok: true, value: {
      connected: true, generation: 1, active: !permanentlyDisconnected, discardPrivateCache: true,
    } });
    expect(input).toEqual({ ...member, permanentlyDisconnected });
    const again = reconnectPresence(input);
    expect(again).toEqual(result);
    if (again.ok && result.ok) expect(again.value).not.toBe(result.value);
  });

  it('binds identity exactly and rejects reused or older generations', () => {
    expect(reconnectPresence({ ...member, verifiedPlayerId: 'Member_1' })).toEqual({ ok: false, error: { code: 'forbidden' } });
    for (const requestedGeneration of [0, 2, 3]) {
      expect(reconnectPresence({ ...member, previousGeneration: 3, requestedGeneration }))
        .toEqual({ ok: false, error: { code: 'stale' } });
    }
  });

  it('accepts bounded ASCII identities and safe generation boundaries', () => {
    for (const id of ['a', 'Z_9-'.repeat(16)]) {
      expect(reconnectPresence({ ...member, verifiedPlayerId: id, boundPlayerId: id,
        previousGeneration: Number.MAX_SAFE_INTEGER - 1, requestedGeneration: Number.MAX_SAFE_INTEGER }))
        .toEqual({ ok: true, value: { connected: true, generation: Number.MAX_SAFE_INTEGER, active: true, discardPrivateCache: true } });
    }
  });

  it('rejects malformed identities, generations and Disconnect flags without coercion', () => {
    for (const key of ['verifiedPlayerId', 'boundPlayerId']) {
      for (const value of ['', 'x'.repeat(65), 'a b', 'é', 'a\n', null, 1, undefined, {}]) {
        expect(runtime({ ...member, [key]: value })).toEqual(invalid);
      }
    }
    for (const key of ['previousGeneration', 'requestedGeneration']) {
      for (const value of [-1, 0.5, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1, '1', null, undefined, 1n]) {
        expect(runtime({ ...member, [key]: value })).toEqual(invalid);
      }
    }
    for (const permanentlyDisconnected of [null, undefined, 0, 1, 'false', {}]) {
      expect(runtime({ ...member, permanentlyDisconnected })).toEqual(invalid);
    }
  });

  it('rejects missing fields and malformed runtime records', () => {
    for (const key of Object.keys(member)) {
      const input: Record<string, unknown> = { ...member };
      delete input[key];
      expect(runtime(input)).toEqual(invalid);
    }
    for (const input of [null, undefined, false, 1, 'member_1', [], Object.create(member)]) {
      expect(runtime(input)).toEqual(invalid);
    }
  });

  it('never reads or returns old private payloads, even on rejection', () => {
    let reads = 0;
    const input = { ...member, get oldRole() { reads += 1; throw new Error('private'); }, diagnostics: 'private' };
    expect(runtime(input)).toEqual(reconnectPresence(member));
    expect(runtime({ ...member, verifiedPlayerId: 'other', oldRole: 'private' }))
      .toEqual({ ok: false, error: { code: 'forbidden' } });
    expect(reads).toBe(0);
  });

  it('does not invoke required-field getters or conversions and contains inspection failures', () => {
    let reads = 0;
    for (const key of Object.keys(member)) {
      const input = Object.defineProperty({ ...member }, key, { get() { reads += 1; throw new Error('private'); } });
      expect(runtime(input)).toEqual(invalid);
    }
    expect(runtime({ ...member, verifiedPlayerId: { toString() { reads += 1; return 'member_1'; } } })).toEqual(invalid);
    expect(runtime(new Proxy(member, { getOwnPropertyDescriptor() { throw new Error('private'); } }))).toEqual(invalid);
    const revoked = Proxy.revocable(member, {});
    revoked.revoke();
    expect(runtime(revoked.proxy)).toEqual(invalid);
    expect(reads).toBe(0);
  });
});
