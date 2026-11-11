import { describe, expect, it } from 'vitest';
import { revisionPrecondition, type Result } from '../../src/parallel100/revision-precondition.js';

type Input = Parameters<typeof revisionPrecondition>[0];
const check = (input: unknown) => revisionPrecondition(input as Input);
const invalid = { ok: false, error: { code: 'invalid-input' } };

describe('revisionPrecondition', () => {
  it.each([0, 1, 2 ** 32, 2 ** 52, Number.MAX_SAFE_INTEGER - 1])(
    'advances equal safe revision %s exactly once', (revision) => {
      const input = Object.freeze({ actualRevision: revision, expectedRevision: revision });
      const result: Result<{ readonly nextRevision: number }> = revisionPrecondition(input);
      expect(result).toEqual({ ok: true, value: { nextRevision: revision + 1 } });
      expect(input).toEqual({ actualRevision: revision, expectedRevision: revision });
      expect(revisionPrecondition(input)).toEqual(result);
    },
  );

  it.each([[5, 4], [5, 6], [0, Number.MAX_SAFE_INTEGER], [Number.MAX_SAFE_INTEGER, 0]])(
    'rejects unequal valid revisions %s / %s with only a stale code', (actual, expected) => {
      expect(check({ actualRevision: actual, expectedRevision: expected, room: 'private' }))
        .toEqual({ ok: false, error: { code: 'stale' } });
    },
  );

  const malformed = [-1, 0.5, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1,
    '1', '0', true, false, null, undefined, 1n, Symbol('revision'),
    { valueOf: () => { throw new Error('must not coerce'); } }];
  it.each(malformed)('rejects malformed revision %s in either operand', (revision) => {
    expect(check({ actualRevision: revision, expectedRevision: 0 })).toEqual(invalid);
    expect(check({ actualRevision: 0, expectedRevision: revision })).toEqual(invalid);
    expect(check({ actualRevision: revision, expectedRevision: revision })).toEqual(invalid);
  });

  it('rejects overflow without mutating the input', () => {
    const input = Object.freeze({
      actualRevision: Number.MAX_SAFE_INTEGER, expectedRevision: Number.MAX_SAFE_INTEGER,
    });
    expect(revisionPrecondition(input)).toEqual(invalid);
    expect(input.actualRevision).toBe(Number.MAX_SAFE_INTEGER);
    expect(input.expectedRevision).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('rejects malformed containers and missing fields', () => {
    for (const input of [null, undefined, 0, '0', {}, { actualRevision: 0 },
      { expectedRevision: 0 }]) expect(check(input)).toEqual(invalid);
    const proxy = Proxy.revocable({}, {});
    proxy.revoke();
    expect(check(proxy.proxy)).toEqual(invalid);
  });

  it('does not invoke property getters', () => {
    let reads = 0;
    for (const field of ['actualRevision', 'expectedRevision']) {
      const input = { actualRevision: 0, expectedRevision: 0 };
      Object.defineProperty(input, field, { get: () => { reads += 1; return 0; } });
      expect(check(input)).toEqual(invalid);
    }
    expect(reads).toBe(0);
  });

  it('returns independent outputs', () => {
    const input = Object.freeze({ actualRevision: 0, expectedRevision: 0 });
    const first = revisionPrecondition(input);
    const second = revisionPrecondition(input);
    expect(first).not.toBe(second);
    if (first.ok && second.ok) expect(first.value).not.toBe(second.value);
  });
});
