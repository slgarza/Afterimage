import { describe, expect, it } from 'vitest';

import { selectRepairCrew } from '../../src/parallel100/crew-selection.js';

const candidate = (id: string, votes = 2, lastCrewRound: number | null = null) =>
  ({ id, votes, lastCrewRound });
const input = (candidates = [candidate('a'), candidate('b')], seed = 0) =>
  ({ candidates, currentRound: 8, rng: { value: seed } });
const invalid = { ok: false, error: { code: 'invalid-input' } };

describe('selectRepairCrew', () => {
  it('prioritizes votes over history and chooses the oldest history for the second seat', () => {
    expect(selectRepairCrew(input([
      candidate('recent', 5, 8), candidate('older', 3, 2), candidate('newer', 3, 6),
      candidate('never', 1),
    ]))).toEqual({ ok: true, value: {
      crewIds: ['recent', 'older'], draws: [], rng: { value: 0 },
    } });
  });

  it('treats never served as older than round zero without consuming RNG', () => {
    expect(selectRepairCrew(input([
      candidate('zero', 2, 0), candidate('never'), candidate('top', 3, 8),
    ], 0xffffffff))).toEqual({ ok: true, value: {
      crewIds: ['top', 'never'], draws: [], rng: { value: 0xffffffff },
    } });
  });

  it('draws both seats reproducibly in supplied order, removing the first winner', () => {
    const request = input([candidate('z'), candidate('a'), candidate('m')]);
    const expected = { ok: true, value: {
      crewIds: ['z', 'a'],
      draws: [
        { candidates: ['z', 'a', 'm'], selectedId: 'z' },
        { candidates: ['a', 'm'], selectedId: 'a' },
      ],
      rng: { value: 3663131626 },
    } };
    expect(selectRepairCrew(request)).toEqual(expected);
    expect(selectRepairCrew(request)).toEqual(expected);
  });

  it('draws only among exact history ties, including for a second-seat-only tie', () => {
    expect(selectRepairCrew(input([
      candidate('top', 4, 7), candidate('recent', 2, 4),
      candidate('z', 2, 1), candidate('a', 2, 1), candidate('low', 0),
    ]))).toEqual({ ok: true, value: {
      crewIds: ['top', 'z'],
      draws: [{ candidates: ['z', 'a'], selectedId: 'z' }],
      rng: { value: 1831565813 },
    } });
  });

  it('does not draw again when the remaining second-seat winner is unique', () => {
    expect(selectRepairCrew(input())).toEqual({ ok: true, value: {
      crewIds: ['a', 'b'],
      draws: [{ candidates: ['a', 'b'], selectedId: 'a' }],
      rng: { value: 1831565813 },
    } });
  });

  it.each([{ candidates: [] }, { candidates: [candidate('only')] }])('leaves an insufficient eligible pool unresolved: %j', ({ candidates }) => {
    expect(selectRepairCrew(input(candidates))).toEqual({
      ok: false, error: { code: 'decision-required', decisionId: 'D-ELIGIBLE-POOL' },
    });
  });

  it.each([-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])('rejects invalid counts/history/rounds: %s', value => {
    expect(selectRepairCrew(input([candidate('a', value), candidate('b')]))).toEqual(invalid);
    expect(selectRepairCrew(input([candidate('a', 2, value), candidate('b')]))).toEqual(invalid);
    expect(selectRepairCrew({ ...input(), currentRound: value })).toEqual(invalid);
  });

  it.each([-1, 0x100000000, 1.5, NaN, Infinity])('rejects invalid RNG: %s', seed => {
    expect(selectRepairCrew(input(undefined, seed))).toEqual(invalid);
  });

  it('rejects duplicate or malformed identities and future history', () => {
    for (const candidates of [
      [candidate('a'), candidate('a')],
      [candidate('a'), candidate('bad id')],
      [candidate(''), candidate('b')],
      [candidate('a'.repeat(65)), candidate('b')],
      [candidate('a', 2, 9), candidate('b')],
      [candidate('a', -1)],
    ]) expect(selectRepairCrew(input(candidates))).toEqual(invalid);
  });

  it('rejects malformed runtime data without executing getters or conversions', () => {
    let invoked = false;
    const getter = { get id() { invoked = true; return 'a'; }, votes: 2, lastCrewRound: null };
    const convert = { toString() { invoked = true; return 'a'; } };
    for (const malformed of [
      null, {}, { ...input(), candidates: null }, { ...input(), rng: null },
      { ...input(), candidates: [getter, candidate('b')] },
      { ...input(), candidates: [{ ...candidate('a'), id: convert }, candidate('b')] },
      { ...input(), candidates: new Array(2) },
      { ...input(), get currentRound() { invoked = true; return 8; } },
    ]) {
      expect(selectRepairCrew(malformed as Parameters<typeof selectRepairCrew>[0])).toEqual(invalid);
    }
    expect(invoked).toBe(false);
  });

  it('accepts boundary identities and detaches outputs from frozen inputs', () => {
    const candidates = Object.freeze([
      Object.freeze(candidate('A_-09', Number.MAX_SAFE_INTEGER, 0)),
      Object.freeze(candidate('x'.repeat(64), 0)),
    ]);
    const rng = Object.freeze({ value: 0xffffffff });
    const request = Object.freeze({ candidates, currentRound: 8, rng });
    const result = selectRepairCrew(request);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('Expected valid crew');
    expect(result.value.crewIds).toEqual(['A_-09', 'x'.repeat(64)]);
    expect(result.value.rng).not.toBe(rng);
    expect(selectRepairCrew(request)).toEqual(result);
  });
});
