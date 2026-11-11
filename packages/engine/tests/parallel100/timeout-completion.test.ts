import { afterEach, describe, expect, it, vi } from 'vitest';
import * as engine from '../../src/index.js';
import { completeTimedOutActions } from '../../src/parallel100/timeout-completion.js';

type Input = Parameters<typeof completeTimedOutActions>[0];
const batch = (): Input => ({
  kind: 'vote', rng: { value: 0 },
  pending: [
    { actorId: 'seat-z', legalOptionIds: ['route/alpha', 'route/beta', 'route/gamma'] },
    { actorId: 'seat-a', legalOptionIds: ['only'] },
  ],
});
const invalid = { ok: false, error: { code: 'invalid-input' } };
const run = (input: unknown) => completeTimedOutActions(input as Input);
afterEach(() => vi.restoreAllMocks());

describe('completeTimedOutActions', () => {
  it.each([
    ['vote', 'timeout_vote'], ['operation', 'timeout_operation'], ['power-target', 'timeout_power_target'],
  ] as const)('replays %s in supplied seat order with one draw per actor', (kind, reason) => {
    const input = { ...batch(), kind };
    const spy = vi.spyOn(engine, 'nextRandom');
    const result = completeTimedOutActions(input);
    expect(spy).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ ok: true, value: {
      completions: [
        { actorId: 'seat-z', optionId: 'route/alpha', reason },
        { actorId: 'seat-a', optionId: 'only', reason },
      ], rng: { value: 3663131626 },
    } });
    expect(completeTimedOutActions(input)).toEqual(result);
  });

  it('consumes no draws for an empty batch and detaches RNG', () => {
    const input = { ...batch(), pending: [] };
    const spy = vi.spyOn(engine, 'nextRandom');
    const result = completeTimedOutActions(input);
    expect(spy).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: true, value: { completions: [], rng: { value: 0 } } });
    if (result.ok) expect(result.value.rng).not.toBe(input.rng);
  });

  it('preserves frozen input and always chooses from each legal set across seeds', () => {
    const input = batch();
    input.pending.forEach((actor) => { Object.freeze(actor.legalOptionIds); Object.freeze(actor); });
    Object.freeze(input.pending);
    Object.freeze(input.rng);
    Object.freeze(input);
    for (let seed = 0; seed < 100; seed += 1) {
      const result = completeTimedOutActions({ ...input, rng: { value: seed } });
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('Expected a valid batch');
      result.value.completions.forEach((choice, index) => {
        expect(input.pending[index]?.legalOptionIds).toContain(choice.optionId);
        expect(choice).not.toBe(input.pending[index]);
      });
    }
    expect(input).toEqual(batch());
  });

  it.each(['vote', 'operation', 'power-target'] as const)('rejects empty legal sets for %s', (kind) => {
    const spy = vi.spyOn(engine, 'nextRandom');
    expect(completeTimedOutActions({ ...batch(), kind, pending: [{ actorId: 'a', legalOptionIds: [] }] }))
      .toEqual(kind === 'vote'
        ? { ok: false, error: { code: 'decision-required', decisionId: 'D-ELIGIBLE-POOL' } }
        : invalid);
    expect(spy).not.toHaveBeenCalled();
  });

  it.each([
    null, {}, { ...batch(), kind: 'unknown' },
    ...[NaN, Infinity, -1, 0.5, 4294967296, '0', undefined].map((value) => ({ ...batch(), rng: { value } })),
    { ...batch(), pending: [{ actorId: 'a', legalOptionIds: ['x'] }, { actorId: 'a', legalOptionIds: ['y'] }] },
    { ...batch(), pending: [{ actorId: 'a', legalOptionIds: ['x'] }, { actorId: 'b', legalOptionIds: ['y', 'y'] }] },
    ...['', 'bad actor', 'a'.repeat(65)].map((actorId) => ({ ...batch(), pending: [{ actorId, legalOptionIds: ['x'] }] })),
    ...['', 1, null].map((option) => ({ ...batch(), pending: [{ actorId: 'a', legalOptionIds: [option] }] })),
    { ...batch(), pending: new Array(1) },
    { ...batch(), now: 123 }, { ...batch(), authorityOverride: true },
  ])('atomically rejects malformed input %#', (input) => {
    const spy = vi.spyOn(engine, 'nextRandom');
    expect(run(input)).toEqual(invalid);
    expect(spy).not.toHaveBeenCalled();
  });

  it('does not evaluate caller getters at any decoded level', () => {
    const getter = vi.fn(() => { throw new Error('must not execute'); });
    const options = ['x'];
    Object.defineProperty(options, '0', { get: getter });
    for (const input of [
      Object.defineProperty(batch(), 'kind', { get: getter }),
      { ...batch(), rng: Object.defineProperty({}, 'value', { get: getter }) },
      { ...batch(), pending: [Object.defineProperty({}, 'actorId', { get: getter })] },
      { ...batch(), pending: [{ actorId: 'a', legalOptionIds: options }] },
    ]) expect(run(input)).toEqual(invalid);
    expect(getter).not.toHaveBeenCalled();
  });
});
