import { describe, expect, it } from 'vitest';
import { authorityDeadlineDecision } from '../../src/parallel100/authority-deadline-guard.js';

type Input = Parameters<typeof authorityDeadlineDecision>[0];
const base: Input = { trustedNowMs: 99, deadlineMs: 100, action: 'player-input' };
const reject = (input: unknown): void => {
  expect(authorityDeadlineDecision(input as Input)).toEqual({
    ok: false, error: { code: 'invalid-input' },
  });
};

describe('authorityDeadlineDecision', () => {
  it('closes input and opens advance at the exact deadline, including later times', () => {
    for (const trustedNowMs of [99, 100, 101, Number.MAX_SAFE_INTEGER]) {
      const deadlineReached = trustedNowMs >= 100;
      for (const action of ['player-input', 'host-advance'] as const) {
        expect(authorityDeadlineDecision({ ...base, trustedNowMs, action })).toEqual({
          ok: true, value: {
            allowed: action === 'host-advance' ? deadlineReached : !deadlineReached,
            deadlineReached,
          },
        });
      }
    }
  });

  it('accepts zero and the largest safe authority timestamps', () => {
    for (const deadlineMs of [0, Number.MAX_SAFE_INTEGER]) {
      expect(authorityDeadlineDecision({ ...base, deadlineMs, trustedNowMs: deadlineMs })).toEqual({
        ok: true, value: { allowed: false, deadlineReached: true },
      });
    }
    expect(authorityDeadlineDecision({ ...base, trustedNowMs: 0, deadlineMs: Number.MAX_SAFE_INTEGER }))
      .toEqual({ ok: true, value: { allowed: true, deadlineReached: false } });
  });

  it('rejects malformed timestamps in either field without coercion', () => {
    const coercible = { valueOf() { throw new Error('must not coerce'); } };
    for (const value of [-1, 0.5, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1,
      '99', null, undefined, true, 99n, coercible]) {
      reject({ ...base, trustedNowMs: value });
      reject({ ...base, deadlineMs: value });
    }
  });

  it('rejects missing fields, malformed records and unknown actions safely', () => {
    for (const input of [null, undefined, [], 1, 'input', {}, Object.create(base)]) reject(input);
    for (const key of Object.keys(base)) {
      const input: Record<string, unknown> = { ...base };
      delete input[key];
      reject(input);
    }
    for (const action of ['', 'advance', 'PLAYER-INPUT', null, undefined, 1, {}]) {
      reject({ ...base, action });
    }
  });

  it('never invokes getters and safely rejects failed inspection', () => {
    let reads = 0;
    for (const key of Object.keys(base)) {
      reject(Object.defineProperty({ ...base }, key, { get() { reads++; return 100; } }));
    }
    expect(reads).toBe(0);
    reject(new Proxy(base, { getOwnPropertyDescriptor() { throw new Error('private'); } }));
    const revoked = Proxy.revocable(base, {});
    revoked.revoke();
    reject(revoked.proxy);
  });

  it('preserves the persisted deadline across repeated input and returns fresh decisions', () => {
    const input = Object.freeze({ ...base });
    const first = authorityDeadlineDecision(input);
    expect(authorityDeadlineDecision(input)).toEqual(first);
    expect(authorityDeadlineDecision(input)).not.toBe(first);
    expect(input).toEqual(base);
    expect(authorityDeadlineDecision({ ...input, trustedNowMs: 100 })).toEqual({
      ok: true, value: { allowed: false, deadlineReached: true },
    });
    expect(input.deadlineMs).toBe(100);
  });
});
