import { describe, expect, it, vi } from 'vitest';
import { nextRandom } from '../../src/index.js';
import { assignCrewOperators } from '../../src/parallel100/crew-operator-assignment.js';

type Input = Parameters<typeof assignCrewOperators>[0];
const invalid = { ok: false, error: { code: 'invalid-input' } };
const call = (input: unknown) => assignCrewOperators(input as Input);

describe('assignCrewOperators', () => {
  it.each([
    [0, 'first', 'second', 1831565813],
    [1, 'second', 'first', 1831565814],
  ] as const)('assigns both draw halves with one advancement from seed %i', (
    value, routeOperatorId, gateOperatorId, advanced,
  ) => {
    expect(assignCrewOperators({ crewIds: ['first', 'second'], rng: { value } }))
      .toEqual({ ok: true, value: { routeOperatorId, gateOperatorId, rng: { value: advanced } } });
  });

  it('uses supplied order and replays frozen inputs without global randomness', () => {
    const input: Input = Object.freeze({
      crewIds: Object.freeze(['A', 'b_-9'] as const), rng: Object.freeze({ value: 1 }),
    });
    const random = vi.spyOn(Math, 'random').mockImplementation(() => {
      throw new Error('Global randomness used');
    });
    try {
      const result = assignCrewOperators(input);
      expect(assignCrewOperators(input)).toEqual(result);
      expect(result).toEqual({ ok: true, value: {
        routeOperatorId: 'b_-9', gateOperatorId: 'A', rng: { value: 1831565814 },
      } });
      expect(assignCrewOperators({ ...input, crewIds: ['b_-9', 'A'] })).toEqual({
        ok: true, value: { routeOperatorId: 'A', gateOperatorId: 'b_-9', rng: { value: 1831565814 } },
      });
      if (result.ok) expect(result.value.rng).not.toBe(input.rng);
      expect(input.rng.value).toBe(1);
      expect(random).not.toHaveBeenCalled();
    } finally {
      random.mockRestore();
    }
  });

  it.each([0, 1, 0x7fffffff, 0xffffffff])('accepts uint32 seed %i and canonical IDs', (value) => {
    const [draw, rng] = nextRandom({ value });
    const crewIds = ['a'.repeat(64), 'Z_0-'] as const;
    expect(assignCrewOperators({ crewIds, rng: { value } })).toEqual({ ok: true, value: {
      routeOperatorId: crewIds[draw < 0.5 ? 0 : 1],
      gateOperatorId: crewIds[draw < 0.5 ? 1 : 0], rng,
    } });
  });

  it.each([
    [], ['a'], ['a', 'b', 'c'], ['a', 'a'], ['', 'b'], ['a', ''],
    ['a'.repeat(65), 'b'], ['private\nsecret', 'b'], ['a.b', 'b'], ['é', 'b'],
    [' a', 'b'], ['a\n', 'b'], [1, 'b'], [null, 'b'], Array(2),
    { 0: 'a', 1: 'b', length: 2 }, null,
  ].map((crewIds) => ({ crewIds })))('rejects malformed crew case %# with a fixed safe error', ({ crewIds }) => {
    expect(call({ crewIds, rng: { value: 1 } })).toEqual(invalid);
  });

  it.each([-1, 0x100000000, 0.5, NaN, Infinity, -Infinity, '1', null, undefined])(
    'rejects invalid RNG case %#', (value) => {
      expect(call({ crewIds: ['a', 'b'], rng: { value } })).toEqual(invalid);
    },
  );

  it.each([null, undefined, {}, { crewIds: ['a', 'b'] }, { crewIds: ['a', 'b'], rng: null }])(
    'rejects malformed input case %#', (input) => expect(call(input)).toEqual(invalid),
  );

  it('does not invoke accessors or identity conversions', () => {
    const getter = vi.fn(() => { throw new Error('private-secret'); });
    const crew = ['a', 'b'];
    Object.defineProperty(crew, '0', { get: getter });
    const inputs = [
      Object.defineProperty({}, 'crewIds', { get: getter }),
      Object.defineProperty({ crewIds: ['a', 'b'] }, 'rng', { get: getter }),
      { crewIds: crew, rng: { value: 1 } },
      { crewIds: ['a', 'b'], rng: Object.defineProperty({}, 'value', { get: getter }) },
      { crewIds: [{ toString: getter }, 'b'], rng: { value: 1 } },
    ];
    for (const input of inputs) expect(call(input)).toEqual(invalid);
    expect(getter).not.toHaveBeenCalled();
  });

  it('does not mutate invalid frozen input or expose extra private fields', () => {
    const input = Object.freeze({
      crewIds: Object.freeze(['a', 'a']), rng: Object.freeze({ value: 1 }), role: 'private-secret',
    });
    expect(call(input)).toEqual(invalid);
    expect(input.crewIds).toEqual(['a', 'a']);
    expect(input.rng.value).toBe(1);
    expect(call({ ...input, crewIds: ['a', 'b'] })).toEqual({ ok: true, value: {
      routeOperatorId: 'b', gateOperatorId: 'a', rng: { value: 1831565814 },
    } });
  });
});
