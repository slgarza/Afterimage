import { describe, expect, it } from 'vitest';
import { decodeLobbyConfiguration } from '../../src/parallel100/lobby-config-decoder.js';

const base = {
  name: 'Mira', seats: 5, roundSeconds: 30, fillBots: false,
  difficulty: 'calm', listed: false, requirePasscode: false, passcode: null,
} as const;

function rejected(input: unknown): void {
  expect(decodeLobbyConfiguration(input)).toEqual({ ok: false, error: { code: 'invalid-input' } });
}

describe('decodeLobbyConfiguration', () => {
  it('accepts every supported configuration combination', () => {
    for (const seats of [5, 6, 7, 8, 9, 10])
      for (const roundSeconds of [30, 60, 90, 120])
        for (const fillBots of [false, true])
          for (const listed of [false, true])
            for (const difficulty of ['calm', 'standard', 'sharp'])
              for (const requirePasscode of [false, true]) {
                const input = { ...base, seats, roundSeconds, fillBots, listed, difficulty,
                  requirePasscode, passcode: requirePasscode ? 'transient' : null };
                expect(decodeLobbyConfiguration(input)).toEqual({ ok: true, value: input });
              }
  });

  it('requires canonical names measured in Unicode scalars', () => {
    for (const name of ['A', '🌙'.repeat(48), 'e\u0301', 'A  B'])
      expect(decodeLobbyConfiguration({ ...base, name }).ok).toBe(true);
    for (const name of ['', ' ', ' Mira', 'Mira ', '\u00a0Mira', '🌙'.repeat(49),
      'a\nb', 'a\u0000b', 'a\u007fb', 'a\u0085b', '\ud800', '\udfff', null, 1])
      rejected({ ...base, name });
  });

  it('validates transient passcodes without normalizing them', () => {
    for (const passcode of ['x', ' ', ' x ', '🌙'.repeat(64)]) {
      const input = { ...base, requirePasscode: true, passcode };
      expect(decodeLobbyConfiguration(input)).toEqual({ ok: true, value: input });
    }
    for (const passcode of [null, undefined, '', 1, false, '🌙'.repeat(65),
      '\ud800', '\udfff', 'x\n', '\u0000', '\u007f', '\u0085'])
      rejected({ ...base, requirePasscode: true, passcode });
    for (const passcode of ['', 'transient', undefined, false]) rejected({ ...base, passcode });
  });

  it('rejects unsupported values, missing fields and authority fields', () => {
    for (const seats of [4, 11, 5.5, '5', NaN, Infinity, null]) rejected({ ...base, seats });
    for (const roundSeconds of [0, 29, 31, 45, 121, '30', null]) rejected({ ...base, roundSeconds });
    for (const difficulty of ['easy', 'CALM', '', null]) rejected({ ...base, difficulty });
    for (const key of ['fillBots', 'listed', 'requirePasscode'])
      for (const value of [0, 1, 'true', null, undefined]) rejected({ ...base, [key]: value });
    for (const key of Object.keys(base)) {
      const input: Record<string, unknown> = { ...base };
      delete input[key];
      rejected(input);
    }
    for (const key of ['hostId', 'role', 'seed', '__proto__', 'constructor'])
      rejected({ ...base, [key]: 'authority' });
    for (const input of [null, undefined, true, 1, 'text', [], () => base]) rejected(input);
  });

  it('inspects data descriptors without invoking getters', () => {
    let calls = 0;
    for (const key of Object.keys(base)) {
      const input = { ...base };
      Object.defineProperty(input, key, { get() { calls++; throw new Error('private'); } });
      rejected(input);
    }
    expect(calls).toBe(0);
    rejected({ ...base, [Symbol('extra')]: true });
    rejected(Object.defineProperty({ ...base }, 'authority', { value: true }));
    const nonEnumerable = Object.defineProperty({ ...base }, 'name', { value: 'Mira', enumerable: false });
    expect(decodeLobbyConfiguration(nonEnumerable)).toEqual({ ok: true, value: base });
  });

  it('rejects custom/inherited prototypes and catches every inspection failure', () => {
    rejected(Object.create(base));
    rejected(Object.assign(Object.create({ authority: true }), base));
    for (const trap of ['getPrototypeOf', 'ownKeys', 'getOwnPropertyDescriptor'] as const) {
      const proxy = new Proxy({ ...base }, { [trap]() { throw new Error('private'); } });
      rejected(proxy);
    }
    const revocable = Proxy.revocable({ ...base }, {});
    revocable.revoke();
    rejected(revocable.proxy);
    rejected(new Proxy({ ...base }, { getOwnPropertyDescriptor() { return undefined; } }));
    let reads = 0;
    const proxy = new Proxy({ ...base }, { get() { reads++; throw new Error('private'); } });
    expect(decodeLobbyConfiguration(proxy)).toEqual({ ok: true, value: base });
    expect(reads).toBe(0);
  });

  it('returns detached records, accepts null prototypes and allows duplicate aliases', () => {
    const input = { ...base, name: 'Shared' };
    const first = decodeLobbyConfiguration(input);
    const second = decodeLobbyConfiguration(Object.assign(Object.create(null), input));
    expect(first).toEqual(second);
    expect(first.ok && second.ok && first.value !== second.value).toBe(true);
    input.name = 'Changed';
    expect(first).toEqual({ ok: true, value: { ...base, name: 'Shared' } });
  });
});
