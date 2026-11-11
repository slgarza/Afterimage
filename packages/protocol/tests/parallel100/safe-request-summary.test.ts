import { describe, expect, it } from 'vitest';
import { safeRequestSummary } from '../../src/parallel100/safe-request-summary.js';

describe('safeRequestSummary', () => {
  it.each([
    'lobby-create', 'lobby-join', 'profile', 'ready', 'settings', 'crew-vote',
    'operation-choice', 'power-target', 'containment-vote', 'request-advance',
  ])('preserves only the approved %s kind and request identity', (type) => {
    const input = Object.freeze({
      type, requestId: 'Req_01-A', candidate: 'private-candidate',
      option: 'private-option', target: 'private-target', roomCode: 'PRIVATE',
      alias: 'private-alias', passcode: 'private-passcode', seed: 12345,
      role: 'private-role', subjectId: 'private-subject',
      payload: { passcode: 'nested-secret' }, intent: { option: 'nested-choice' },
      rawRequest: 'private-raw',
    });
    const summary = safeRequestSummary(input);
    expect(summary).toEqual({ kind: type, requestId: 'Req_01-A' });
    expect(JSON.stringify(summary)).toBe(JSON.stringify({ kind: type, requestId: 'Req_01-A' }));
    expect(Object.keys(summary)).toEqual(['kind', 'requestId']);
    expect(safeRequestSummary(input)).not.toBe(summary);
  });

  it.each(['a', 'A'.repeat(64), 'azAZ09_-'])('accepts bounded ASCII ID %s', (requestId) => {
    expect(safeRequestSummary({ type: 'ready', requestId })).toEqual({ kind: 'ready', requestId });
  });

  it.each(['', 'a'.repeat(65), 'a\n', ' a', 'a b', 'é', '😀', 'a\0', 'a/b',
    1, true, null, undefined, {}, ['a'], new String('a'), Symbol('id')])(
    'rejects unsafe ID %# without discarding a valid kind', (requestId) => {
      expect(safeRequestSummary({ type: 'ready', requestId })).toEqual({ kind: 'ready', requestId: null });
    },
  );

  it.each(['unknown', 'toString', '__proto__', 'READY', '', 1, null, {},
    new String('ready'), Symbol('type')])('rejects unsafe kind %# independently', (type) => {
    expect(safeRequestSummary({ type, requestId: 'id' })).toEqual({ kind: 'unknown', requestId: 'id' });
  });

  it.each([null, undefined, false, 1, 'ready', Symbol('input'), 1n])('handles primitive input %#', (input) => {
    expect(safeRequestSummary(input)).toEqual({ kind: 'unknown', requestId: null });
  });

  it('ignores inherited fields and accepts nonenumerable own data on null-prototype objects', () => {
    expect(safeRequestSummary(Object.create({ type: 'ready', requestId: 'id' })))
      .toEqual({ kind: 'unknown', requestId: null });
    const input: object = Object.create(null) as object;
    Object.defineProperties(input, { type: { value: 'profile' }, requestId: { value: 'id' } });
    expect(safeRequestSummary(input)).toEqual({ kind: 'profile', requestId: 'id' });
  });

  it('never invokes accessors, payload access, serialization or coercion hooks', () => {
    const fail = (): never => { throw new Error('private getter must not run'); };
    const accessors = Object.defineProperties({}, {
      type: { get: fail }, requestId: { get: fail }, payload: { get: fail }, intent: { get: fail },
    });
    expect(safeRequestSummary(accessors)).toEqual({ kind: 'unknown', requestId: null });
    const hostile = { toString: fail, valueOf: fail, toJSON: fail, [Symbol.toPrimitive]: fail };
    expect(safeRequestSummary({ type: hostile, requestId: hostile }))
      .toEqual({ kind: 'unknown', requestId: null });
    const input = Object.defineProperties({ type: 'ready', requestId: 'id' }, {
      payload: { get: fail }, intent: { get: fail }, toJSON: { value: fail },
    });
    expect(JSON.stringify(safeRequestSummary(input))).toBe('{"kind":"ready","requestId":"id"}');
  });

  it.each(['type', 'requestId'])('isolates descriptor failure for %s', (failedKey) => {
    const touched: PropertyKey[] = [];
    const input = new Proxy({ type: 'ready', requestId: 'id' }, {
      getOwnPropertyDescriptor(target, key) {
        touched.push(key);
        if (key === failedKey) throw new Error('private trap detail');
        return Reflect.getOwnPropertyDescriptor(target, key);
      },
      get() { throw new Error('must not read properties'); },
      ownKeys() { throw new Error('must not enumerate'); },
      getPrototypeOf() { throw new Error('must not inspect prototype'); },
    });
    expect(safeRequestSummary(input)).toEqual({
      kind: failedKey === 'type' ? 'unknown' : 'ready',
      requestId: failedKey === 'requestId' ? null : 'id',
    });
    expect(touched).toEqual(['type', 'requestId']);
  });

  it('contains revoked proxy failures', () => {
    const { proxy, revoke } = Proxy.revocable({}, {});
    revoke();
    expect(safeRequestSummary(proxy)).toEqual({ kind: 'unknown', requestId: null });
  });
});
