import { describe, expect, it } from 'vitest';
import { decodeLobbyProfilePatch, type Result } from '../../src/parallel100/lobby-profile-patch.js';

const registry = Object.freeze(['moon', 'star']);
const patch = { alias: 'Mira', avatarKey: 'moon', expectedRevision: 0 };
const failure = { ok: false, error: { code: 'invalid-input' } };

function rejected(input: unknown, avatars: readonly string[] = registry): void {
  expect(decodeLobbyProfilePatch(input, avatars)).toEqual(failure);
}

describe('decodeLobbyProfilePatch', () => {
  it('preserves Unicode scalar aliases and allows repeated display aliases', () => {
    for (const alias of ['Mira', '星', 'é', 'e\u0301', 'A  B', '🌙'.repeat(24), 'a'.repeat(24)]) {
      const input = Object.freeze({ ...patch, alias });
      const first: Result<typeof patch> = decodeLobbyProfilePatch(input, registry);
      expect(first).toEqual({ ok: true, value: input });
      expect(decodeLobbyProfilePatch(input, registry)).toEqual(first);
      if (first.ok) expect(first.value).not.toBe(input);
    }
    expect(decodeLobbyProfilePatch({ ...patch, avatarKey: 'star', expectedRevision: Number.MAX_SAFE_INTEGER }, registry))
      .toEqual({ ok: true, value: { ...patch, avatarKey: 'star', expectedRevision: Number.MAX_SAFE_INTEGER } });
  });

  it('detaches output from subsequent input and registry changes', () => {
    const input = { ...patch };
    const avatars = ['moon'];
    const result = decodeLobbyProfilePatch(input, avatars);
    input.alias = 'Changed';
    input.avatarKey = 'unknown';
    input.expectedRevision = 10;
    avatars[0] = 'unknown';
    expect(result).toEqual({ ok: true, value: patch });
    expect(decodeLobbyProfilePatch(Object.assign(Object.create(null), patch), registry))
      .toEqual({ ok: true, value: patch });
  });

  it('rejects empty, untrimmed, long, control and non-scalar aliases', () => {
    for (const alias of ['', ' ', ' Mira', 'Mira ', '\u00a0Mira', 'Mira\uFEFF', 'a'.repeat(25),
      '🌙'.repeat(25), 'a\u0000b', 'a\nb', 'a\tb', 'a\u007fb', 'a\u0085b', '\ud800', '\udfff',
      'a\ud800b', null, undefined, 1, new String('Mira')]) rejected({ ...patch, alias });
    for (let control = 0; control <= 0x9f; control += 1) {
      if (control < 0x20 || control >= 0x7f) rejected({ ...patch, alias: `a${String.fromCharCode(control)}b` });
    }
  });

  it('requires approved avatars and safe nonnegative integer revisions', () => {
    for (const avatarKey of ['', 'unknown', 'Moon', null, undefined, 1, new String('moon')]) {
      rejected({ ...patch, avatarKey });
    }
    for (const expectedRevision of [-1, 0.5, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1,
      '0', null, undefined, 0n]) rejected({ ...patch, expectedRevision });
  });

  it('rejects extra authority fields, symbols, missing fields and prototype objects', () => {
    for (const input of [null, undefined, 1, 'Mira', true, [], new Date(), new Map(),
      Object.create(patch), Object.assign(Object.create({}), patch)]) rejected(input);
    for (const key of Object.keys(patch)) {
      const input: Record<string, unknown> = { ...patch };
      delete input[key];
      rejected(input);
    }
    for (const key of ['subjectId', 'playerId', 'actorId', 'hostId', 'host', 'role', '__proto__']) {
      rejected({ ...patch, [key]: 'secret' });
    }
    rejected({ ...patch, [Symbol('hidden')]: true });
    rejected(Object.defineProperty({ ...patch }, 'hidden', { value: 'secret' }));
  });

  it('rejects malformed registries, including empty and duplicate entries', () => {
    for (const avatars of [[], [''], ['moon', ''], ['moon', 'moon'], ['star', 'star', 'moon'],
      new Array<string>(1), Object.assign(['moon'], { extra: true }),
      Object.assign(['moon'], { [Symbol('hidden')]: true })]) rejected(patch, avatars);
    for (const avatars of [null, undefined, 'moon', { 0: 'moon', length: 1 }, [1], [new String('moon')]]) {
      expect(decodeLobbyProfilePatch(patch, avatars as unknown as readonly string[])).toEqual(failure);
    }
    rejected(patch, Object.setPrototypeOf(['moon'], {}));
  });

  it('never invokes submitted getters or string conversions', () => {
    let reads = 0;
    const getter = (): never => { reads += 1; throw new Error('private-value'); };
    for (const key of Object.keys(patch)) {
      rejected(Object.defineProperty({ ...patch }, key, { get: getter }));
    }
    rejected(Object.defineProperty({ ...patch }, 'role', { get: getter }));
    const avatars = ['moon'];
    Object.defineProperty(avatars, '0', { get: getter });
    rejected(patch, avatars);
    const value = { toString: getter, valueOf: getter };
    rejected({ ...patch, alias: value });
    rejected({ ...patch, avatarKey: value });
    rejected({ ...patch, expectedRevision: value });
    expect(reads).toBe(0);
  });

  it('contains inspection failures in fixed errors without echoing submitted data', () => {
    const traps = [
      { ownKeys() { throw new Error('private-value'); } },
      { getPrototypeOf() { throw new Error('private-value'); } },
      { getOwnPropertyDescriptor() { throw new Error('private-value'); } },
    ];
    for (const trap of traps) {
      rejected(new Proxy({ ...patch }, trap));
      rejected(patch, new Proxy(['moon'], trap));
    }
    const revoked = Proxy.revocable({}, {});
    revoked.revoke();
    rejected(revoked.proxy);
    const revokedRegistry = Proxy.revocable(['moon'], {});
    revokedRegistry.revoke();
    rejected(patch, revokedRegistry.proxy);
  });
});
