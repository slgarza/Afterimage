import { describe, expect, it } from 'vitest';
import { nextIncident, type IncidentId } from '../../src/parallel100/incident-queue.js';

type Input = Parameters<typeof nextIncident>[0];
const invalid = { ok: false, error: { code: 'invalid-input' } };
function draw(input: Input) {
  const result = nextIncident(input);
  if (!result.ok) throw new Error('Expected a valid draw');
  return result.value;
}

describe('nextIncident', () => {
  it.each([
    [0, ['I06', 'I03', 'I04', 'I05', 'I01', 'I02'], 567894473],
    [1, ['I05', 'I02', 'I06', 'I03', 'I01', 'I04'], 567894474],
    [4294967295, ['I05', 'I02', 'I04', 'I03', 'I01', 'I06'], 567894472],
  ] as const)('matches the exact shuffled queue and RNG for seed %s', (seed, queue, value) => {
    expect(draw({ remaining: [], previous: null, rng: { value: seed } })).toEqual({
      incidentId: queue[0], remaining: queue.slice(1), rng: { value },
    });
  });

  it('swaps a repeated first incident with the next without advancing RNG', () => {
    expect(draw({ remaining: [], previous: 'I06', rng: { value: 0 } })).toEqual({
      incidentId: 'I03', remaining: ['I06', 'I04', 'I05', 'I01', 'I02'], rng: { value: 567894473 },
    });
  });

  it('consumes supplied order without advancing RNG and detaches frozen inputs', () => {
    const input = Object.freeze({ remaining: Object.freeze(['I04', 'I02', 'I01'] as const),
      previous: 'I06' as const, rng: Object.freeze({ value: 42 }) });
    const output = draw(input);
    expect(output).toEqual({ incidentId: 'I04', remaining: ['I02', 'I01'], rng: { value: 42 } });
    expect(output.remaining).not.toBe(input.remaining);
    expect(output.rng).not.toBe(input.rng);
    (output.remaining as IncidentId[]).push('I05');
    (output.rng as { value: number }).value = 0;
    expect(draw(input)).toEqual({ incidentId: 'I04', remaining: ['I02', 'I01'], rng: { value: 42 } });
  });

  it('replays exact state across many complete cycles without adjacent repeats', () => {
    for (let seed = 0; seed < 64; seed++) {
      let state: Input = { remaining: [], previous: null, rng: { value: seed } };
      for (let cycle = 0; cycle < 8; cycle++) {
        const seen = new Set<IncidentId>();
        for (let index = 0; index < 6; index++) {
          const output = draw(state);
          expect(draw(state)).toEqual(output);
          expect(output.incidentId).not.toBe(state.previous);
          seen.add(output.incidentId);
          state = { remaining: output.remaining, previous: output.incidentId, rng: output.rng };
        }
        expect([...seen].sort()).toEqual(['I01', 'I02', 'I03', 'I04', 'I05', 'I06']);
        expect(state.remaining).toEqual([]);
      }
    }
  });

  it.each([NaN, Infinity, -Infinity, -1, 0.5, 4294967296, '0', null, undefined])(
    'rejects invalid RNG %s even for a supplied queue', (value) => {
      expect(nextIncident({ remaining: ['I01'], previous: null, rng: { value } } as Input)).toEqual(invalid);
    });

  it.each([
    null, undefined, {}, { remaining: [], previous: null, rng: null },
    { remaining: 'I01', previous: null, rng: { value: 0 } },
    { remaining: ['I07'], previous: null, rng: { value: 0 } },
    { remaining: ['I01', 'I01'], previous: null, rng: { value: 0 } },
    { remaining: [], previous: 'I00', rng: { value: 0 } },
    { remaining: ['I01'], previous: 'I01', rng: { value: 0 } },
    { remaining: new Array(2), previous: null, rng: { value: 0 } },
    { remaining: [{}], previous: null, rng: { value: 0 } },
    { remaining: [], rng: { value: 0 } },
  ])('rejects malformed runtime state without exposing input', (input) => {
    expect(nextIncident(input as Input)).toEqual(invalid);
  });

  it('does not invoke supplied getters or conversions', () => {
    const fail = () => { throw new Error('Caller code ran'); };
    for (const field of ['remaining', 'previous', 'rng']) {
      const input = { remaining: [], previous: null, rng: { value: 0 } };
      Object.defineProperty(input, field, { get: fail });
      expect(nextIncident(input)).toEqual(invalid);
    }
    expect(nextIncident({ remaining: [], previous: null, rng: Object.defineProperty({}, 'value', { get: fail }) } as unknown as Input)).toEqual(invalid);
    const queue = Object.defineProperty(['I01'], '0', { get: fail });
    expect(nextIncident({ remaining: queue as IncidentId[], previous: null, rng: { value: 0 } })).toEqual(invalid);
    expect(nextIncident({ remaining: [{ toString: fail }], previous: null, rng: { value: 0 } } as unknown as Input)).toEqual(invalid);
  });
});
