import { describe, expect, it } from 'vitest';
import { idempotencyDecision } from '../../src/parallel100/request-idempotency.js';

const request = { actorId: 'actor_1', requestId: 'request-1', requestDigest: 'ab'.repeat(32) };
const record = { ...request, resultReference: 'opaque://private/result?version=1' };
const invalid = { ok: false, error: { code: 'invalid-input' } };
function decide(value: unknown) {
  return idempotencyDecision(value as Parameters<typeof idempotencyDecision>[0]);
}

describe('idempotencyDecision', () => {
  it('executes first requests and replays their exact original reference on every retry', () => {
    expect(decide({ ...request, existing: null })).toEqual({
      ok: true, value: { action: 'execute', resultReference: null },
    });
    const input = Object.freeze({ ...request, existing: Object.freeze({ ...record }) });
    const before = JSON.stringify(input);
    const first = decide(input);
    expect(first).toEqual({ ok: true, value: { action: 'replay', resultReference: record.resultReference } });
    const second = decide(input);
    expect(second).toEqual(first);
    expect(second).not.toBe(first);
    if (first.ok && second.ok) expect(first.value).not.toBe(second.value);
    expect(JSON.stringify(input)).toBe(before);
  });

  it.each([
    { actorId: 'another' }, { requestId: 'another' }, { requestDigest: '0'.repeat(64) },
  ])('forbids mismatched actor, request or payload without disclosing the result: %j', (change) => {
    expect(decide({ ...request, ...change, existing: record })).toEqual({
      ok: false, error: { code: 'forbidden' },
    });
  });

  it('accepts canonical boundary identities and opaque string references without normalization', () => {
    for (const id of ['a', '_', '-', 'Z9_-', 'a'.repeat(64)]) {
      const values = { actorId: id, requestId: id, requestDigest: '0123456789abcdef'.repeat(4) };
      for (const reference of ['', 'arbitrary opaque text', '日本語\nref']) {
        expect(decide({ ...values, existing: { ...values, resultReference: reference } })).toEqual({
          ok: true, value: { action: 'replay', resultReference: reference },
        });
      }
    }
  });

  it('rejects malformed identities and digests at both levels without echoing input', () => {
    const badIds: unknown[] = ['', 'a'.repeat(65), ' name', 'a\n', 'é', 'a/b', 1, null, {}, ['a']];
    const badDigests: unknown[] = ['', 'a'.repeat(63), 'a'.repeat(65), 'A'.repeat(64),
      'g'.repeat(64), 'a'.repeat(64) + '\n', null, 12, {}];
    for (const [key, values] of [['actorId', badIds], ['requestId', badIds], ['requestDigest', badDigests]] as const) {
      for (const value of values) {
        expect(decide({ ...request, [key]: value, existing: null })).toEqual(invalid);
        expect(decide({ ...request, existing: { ...record, [key]: value } })).toEqual(invalid);
      }
    }
  });

  it('rejects malformed containers, missing fields and nonstring references', () => {
    for (const value of [undefined, null, false, 1, 'private', [], () => record]) {
      expect(decide(value)).toEqual(invalid);
      if (value !== null) expect(decide({ ...request, existing: value })).toEqual(invalid);
    }
    for (const key of Object.keys({ ...request, existing: null })) {
      const value: Record<string, unknown> = { ...request, existing: null };
      delete value[key];
      expect(decide(value)).toEqual(invalid);
    }
    for (const key of Object.keys(record)) {
      const value: Record<string, unknown> = { ...record };
      delete value[key];
      expect(decide({ ...request, existing: value })).toEqual(invalid);
    }
    for (const reference of [undefined, null, 1, {}, [], new String('private')]) {
      expect(decide({ ...request, existing: { ...record, resultReference: reference } })).toEqual(invalid);
    }
  });

  it('never invokes getters or string conversion, and catches hostile proxy reflection', () => {
    let calls = 0;
    const hostile = { toString() { calls++; throw new Error('private'); } };
    expect(decide({ ...request, actorId: hostile, existing: null })).toEqual(invalid);
    for (const key of Object.keys({ ...request, existing: null })) {
      const input = Object.defineProperty({ ...request, existing: null }, key, { get() { calls++; return 'private'; } });
      expect(decide(input)).toEqual(invalid);
    }
    for (const key of Object.keys(record)) {
      const existing = Object.defineProperty({ ...record }, key, { get() { calls++; return 'private'; } });
      expect(decide({ ...request, existing })).toEqual(invalid);
    }
    const proxy = new Proxy({}, { getOwnPropertyDescriptor() { throw new Error('private'); } });
    expect(decide(proxy)).toEqual(invalid);
    expect(decide({ ...request, existing: proxy })).toEqual(invalid);
    const revoked = Proxy.revocable({}, {});
    revoked.revoke();
    expect(decide(revoked.proxy)).toEqual(invalid);
    expect(calls).toBe(0);
  });

  it('requires own data fields but permits null-prototype records and ignores extra private fields', () => {
    expect(decide(Object.create({ ...request, existing: null }))).toEqual(invalid);
    const existing = Object.assign(Object.create(null), record, { privatePayload: 'hidden' });
    const input = Object.assign(Object.create(null), request, { existing });
    Object.defineProperty(input, 'unrelated', { get() { throw new Error('must not read'); } });
    expect(decide(input)).toEqual({ ok: true, value: { action: 'replay', resultReference: record.resultReference } });
  });
});
