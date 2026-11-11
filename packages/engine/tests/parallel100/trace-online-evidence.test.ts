import { describe, expect, it } from 'vitest';
import { traceOnlineEvidence } from '../../src/parallel100/trace-online-evidence.js';

type Input = Parameters<typeof traceOnlineEvidence>[0];
const classes = ['safe', 'corrupted', 'mixed'] as const;
const invalid = { ok: false, error: { code: 'invalid-input' } };
const decode = (input: unknown) => traceOnlineEvidence(input as Input);

describe('traceOnlineEvidence', () => {
  for (let repair = 0; repair <= 6; repair++) {
    for (const operationResolved of [false, true]) {
      for (const pairClass of classes) {
        it(`projects Repair ${repair}, resolved ${operationResolved}, ${pairClass}`, () => {
          const visible = repair >= 2 && operationResolved;
          expect(traceOnlineEvidence({ repair, operationResolved, pairClass })).toEqual({
            ok: true, value: { visible, classification: visible ? pairClass : null },
          });
        });
      }
    }
  }

  it.each([-1, 7, 1.5, NaN, Infinity, -Infinity, '2', null, undefined, {}, 2n])(
    'rejects invalid repair %s even when unresolved', (repair) => {
      expect(decode({ repair, operationResolved: false, pairClass: 'safe' })).toEqual(invalid);
    },
  );

  it.each([undefined, null, 0, 1, 'true', {}, []])('rejects invalid resolution %s', (operationResolved) => {
    expect(decode({ repair: 2, operationResolved, pairClass: 'safe' })).toEqual(invalid);
  });

  it.each([undefined, null, '', 'SAFE', 'accused', 1, {}, ['safe']])(
    'rejects invalid pair class %s even before disclosure', (pairClass) => {
      for (const repair of [0, 2, 6]) {
        expect(decode({ repair, operationResolved: false, pairClass })).toEqual(invalid);
      }
    },
  );

  it.each([undefined, null, false, 'safe', 2, [], {}, () => undefined])(
    'rejects malformed input %s', (input) => expect(decode(input)).toEqual(invalid),
  );

  it('rejects missing, inherited and accessor fields without executing getters', () => {
    let reads = 0;
    for (const field of ['repair', 'operationResolved', 'pairClass']) {
      const input: Record<string, unknown> = { repair: 2, operationResolved: true, pairClass: 'safe' };
      delete input[field];
      expect(decode(input)).toEqual(invalid);
      Object.defineProperty(input, field, { get: () => { reads++; return 'secret'; } });
      expect(decode(input)).toEqual(invalid);
    }
    expect(decode(Object.create({ repair: 2, operationResolved: true, pairClass: 'safe' }))).toEqual(invalid);
    expect(reads).toBe(0);
  });

  it('fails safely when descriptor inspection throws', () => {
    const input = new Proxy({}, { getOwnPropertyDescriptor() { throw new Error('private'); } });
    expect(decode(input)).toEqual(invalid);
  });

  it('serializes only the evidence projection without reading extra authority fields', () => {
    const input = Object.freeze({
      repair: 2, operationResolved: true, pairClass: 'mixed' as const,
      operatorChoices: ['private'], secretAlignment: 'private', accusation: 'private',
      get extra() { throw new Error('must not read'); },
    });
    const first = traceOnlineEvidence(input);
    const second = traceOnlineEvidence(input);
    expect(JSON.stringify(first)).toBe('{"ok":true,"value":{"visible":true,"classification":"mixed"}}');
    expect(first).not.toBe(second);
    if (first.ok && second.ok) expect(first.value).not.toBe(second.value);
    expect(input.operatorChoices).toEqual(['private']);
  });
});
