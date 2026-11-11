import { describe, expect, it, vi } from 'vitest';
import { hostAdvancePermission } from '../../src/parallel100/host-advance-command.js';

type Input = Parameters<typeof hostAdvancePermission>[0];
const base: Input = Object.freeze({
  verifiedPlayerId: 'host_1', hostPlayerId: 'host_1', actualRevision: 4,
  expectedRevision: 4, trustedNowMs: 100, persistedDeadlineMs: 100, terminal: false,
});
const invalid = { ok: false, error: { code: 'invalid-input' } };
const checkRuntime = (input: unknown) => hostAdvancePermission(input as Input);

describe('hostAdvancePermission', () => {
  it.each([[99, false], [100, true], [101, true], [Number.MAX_SAFE_INTEGER, true]])(
    'compares injected time %s to the persisted deadline', (trustedNowMs, mayAdvance) => {
      expect(hostAdvancePermission({ ...base, trustedNowMs })).toEqual({ ok: true, value: { mayAdvance } });
    },
  );

  it('denies a different host even after deadline and denies stale revisions', () => {
    expect(hostAdvancePermission({ ...base, verifiedPlayerId: 'other', trustedNowMs: 101 }))
      .toEqual({ ok: false, error: { code: 'forbidden' } });
    for (const expectedRevision of [3, 5]) {
      expect(hostAdvancePermission({ ...base, expectedRevision }))
        .toEqual({ ok: false, error: { code: 'stale' } });
    }
  });

  it.each([99, 100, 101])('never permits terminal advance at %s', (trustedNowMs) => {
    expect(hostAdvancePermission({ ...base, terminal: true, trustedNowMs }))
      .toEqual({ ok: true, value: { mayAdvance: false } });
  });

  it('accepts identity bounds and zero and maximum safe counters', () => {
    for (const id of ['a', 'A_09-', 'x'.repeat(64)]) {
      for (const counter of [0, Number.MAX_SAFE_INTEGER]) {
        expect(hostAdvancePermission({ verifiedPlayerId: id, hostPlayerId: id,
          actualRevision: counter, expectedRevision: counter, trustedNowMs: counter,
          persistedDeadlineMs: counter, terminal: false }))
          .toEqual({ ok: true, value: { mayAdvance: true } });
      }
    }
  });

  it('rejects malformed identities without coercion', () => {
    const toString = vi.fn(() => 'host_1');
    for (const field of ['verifiedPlayerId', 'hostPlayerId']) {
      for (const value of ['', 'x'.repeat(65), 'a b', 'é', 'a\n', null, 1, { toString }]) {
        expect(checkRuntime({ ...base, [field]: value })).toEqual(invalid);
      }
    }
    expect(toString).not.toHaveBeenCalled();
  });

  it('rejects malformed revisions and authority milliseconds', () => {
    for (const field of ['actualRevision', 'expectedRevision', 'trustedNowMs', 'persistedDeadlineMs']) {
      for (const value of [-1, 0.5, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1,
        '100', null, undefined, 100n]) {
        expect(checkRuntime({ ...base, [field]: value })).toEqual(invalid);
      }
    }
    for (const terminal of [0, 'false', null, undefined]) {
      expect(checkRuntime({ ...base, terminal })).toEqual(invalid);
    }
  });

  it('rejects missing fields, accessors and inspection failures with fixed errors', () => {
    const getter = vi.fn(() => 'host_1');
    expect(checkRuntime(Object.defineProperty({ ...base }, 'verifiedPlayerId', { get: getter })))
      .toEqual(invalid);
    expect(getter).not.toHaveBeenCalled();
    for (const key of Object.keys(base)) {
      const input: Record<string, unknown> = { ...base };
      delete input[key];
      expect(checkRuntime(input)).toEqual(invalid);
    }
    for (const value of [null, undefined, [], 10, 'host', Object.create(base),
      new Proxy(base, { getOwnPropertyDescriptor() { throw new Error('private input'); } })]) {
      expect(checkRuntime(value)).toEqual(invalid);
    }
  });

  it('uses no wall clock, leaves frozen authority facts unchanged and detaches results', () => {
    const now = vi.spyOn(Date, 'now').mockImplementation(() => { throw new Error('wall clock'); });
    try {
      const before = { ...base };
      const first = hostAdvancePermission(base);
      expect(first).toEqual({ ok: true, value: { mayAdvance: true } });
      const second = hostAdvancePermission(base);
      expect(second).toEqual(first);
      expect(second).not.toBe(first);
      if (first.ok && second.ok) expect(first.value).not.toBe(second.value);
      expect(base).toEqual(before);
      expect(now).not.toHaveBeenCalled();
    } finally {
      now.mockRestore();
    }
  });
});
