import { describe, expect, it } from 'vitest';

import { advanceCityTracks } from '../../src/parallel100/track-advance.js';

type Input = Parameters<typeof advanceCityTracks>[0];
const valid: Input = { repair: 2, sabotage: 3, outcome: 'repair', nullDisconnected: false };
const invalid = { ok: false, error: { code: 'invalid-input' } };
const outcomes = ['repair', 'sabotage', 'anomaly'] as const;

const scores = Array.from({ length: 6 }, (_, repair) =>
  Array.from({ length: 6 }, (_, sabotage) => ({ repair, sabotage }))).flat();

describe('advanceCityTracks', () => {
  it.each(scores)('advances exactly the selected track from $repair/$sabotage', ({ repair, sabotage }) => {
    for (const outcome of outcomes) {
      const input = Object.freeze({ repair, sabotage, outcome, nullDisconnected: false });
      const nextRepair = outcome === 'repair' ? repair + 1 : repair;
      const nextSabotage = outcome === 'sabotage' ? sabotage + 1 : sabotage;
      const expected = {
        ok: true,
        value: {
          repair: nextRepair, sabotage: nextSabotage,
          winner: outcome === 'repair' && repair === 5 ? 'archivists'
            : outcome === 'sabotage' && sabotage === 5 ? 'static' : null,
          momentKey: outcome === 'repair' ? `city.repair.r${repair + 1}`
            : outcome === 'sabotage' ? `city.sabotage.s${sabotage + 1}` : null,
        },
      };
      expect(advanceCityTracks(input)).toEqual(expected);
      expect(advanceCityTracks(input)).toEqual(expected);
      expect(input).toEqual({ repair, sabotage, outcome, nullDisconnected: false });
    }
  });

  it.each(scores)('Disconnect wins immediately at $repair/$sabotage for any outcome', ({ repair, sabotage }) => {
    for (const outcome of outcomes) {
      expect(advanceCityTracks(Object.freeze({ repair, sabotage, outcome, nullDisconnected: true })))
        .toEqual({ ok: true, value: { repair, sabotage, winner: 'archivists', momentKey: null } });
    }
  });

  it.each([-1, 0.5, 5.5, 6, 7, NaN, Infinity, -Infinity, '3', null, undefined])(
    'rejects invalid track %s even with Disconnect', (score) => {
      for (const key of ['repair', 'sabotage']) {
        for (const nullDisconnected of [false, true]) {
          expect(advanceCityTracks({ ...valid, [key]: score, nullDisconnected } as Input)).toEqual(invalid);
        }
      }
    },
  );

  it.each(['Repair', 'static', '', null, undefined, 1, {}, []])('rejects invalid outcome %s', (outcome) => {
    for (const nullDisconnected of [false, true]) {
      expect(advanceCityTracks({ ...valid, outcome, nullDisconnected } as Input)).toEqual(invalid);
    }
  });

  it.each([undefined, null, 0, 1, 'true', {}])('requires a boolean Disconnect flag %s', (nullDisconnected) => {
    expect(advanceCityTracks({ ...valid, nullDisconnected } as Input)).toEqual(invalid);
  });

  it.each([null, undefined, [], 3, 'input', {}, true])('rejects malformed input %s', (input) => {
    expect(advanceCityTracks(input as Input)).toEqual(invalid);
  });

  it('does not invoke accessors or string conversions', () => {
    for (const key of Object.keys(valid)) {
      const input = Object.defineProperty({ ...valid }, key, {
        get() { throw new Error('getter must not run'); },
      });
      expect(advanceCityTracks(input)).toEqual(invalid);
    }
    const outcome = { toString() { throw new Error('conversion must not run'); } };
    expect(advanceCityTracks({ ...valid, outcome } as unknown as Input)).toEqual(invalid);
  });

  it('returns detached results that cannot affect input or later calls', () => {
    const input = Object.freeze({ ...valid });
    const first = advanceCityTracks(input);
    const second = advanceCityTracks(input);
    expect(first).not.toBe(second);
    if (!first.ok || !second.ok) throw new Error('expected success');
    expect(first.value).not.toBe(second.value);
    Object.assign(first.value, { repair: 100 });
    expect(second.value.repair).toBe(3);
    expect(input.repair).toBe(2);
    expect(advanceCityTracks(input)).toEqual(second);
  });
});
