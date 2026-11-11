import { describe, expect, it } from 'vitest';

import { incidentAnomalyEffect, type IncidentId } from '../../src/parallel100/anomaly-effects.js';

describe('incidentAnomalyEffect', () => {
  it.each([
    ['I01', 'reduce-next-round-by-10', 'D-TIMER-COMPOSITION'],
    ['I02', 'shuffle-vote-cards', null],
    ['I03', 'redact-one-feed-line', null],
    ['I05', 'obscure-map-route', null],
    ['I06', 'suppress-last-ten-audio-once', null],
  ] as const)('returns only the specified semantic consequence for %s', (incidentId, effect, decisionRequired) => {
    expect(incidentAnomalyEffect(Object.freeze({ incidentId }))).toStrictEqual({
      ok: true, value: { effect, decisionRequired },
    });
  });

  it('leaves the Jam target unresolved without choosing a victim', () => {
    expect(incidentAnomalyEffect({ incidentId: 'I04' })).toStrictEqual({
      ok: false, error: { code: 'decision-required', decisionId: 'D-I04-JAM-TARGET' },
    });
  });

  it.each([
    null, undefined, false, 1, 'I01', [], {},
    ...['I00', 'I07', 'i01', '', null, undefined, 1, {}, ['I01']].map((incidentId) => ({ incidentId })),
  ])('rejects malformed runtime input without echoing it (%j)', (input) => {
    expect(incidentAnomalyEffect(input as { readonly incidentId: IncidentId })).toStrictEqual({
      ok: false, error: { code: 'invalid-input' },
    });
  });

  it('does not invoke getters or convert incident values to strings', () => {
    const fail = () => { throw new Error('must not execute caller code'); };
    const inputs = [
      Object.defineProperty({}, 'incidentId', { get: fail }),
      { incidentId: { toString: fail, valueOf: fail } },
      Object.create({ incidentId: 'I01' }) as unknown,
    ];
    for (const input of inputs) {
      expect(incidentAnomalyEffect(input as { readonly incidentId: IncidentId })).toStrictEqual({
        ok: false, error: { code: 'invalid-input' },
      });
    }
  });

  it('preserves authority state and emits no extra payload even when supplied', () => {
    const input = Object.freeze({
      incidentId: 'I02' as const,
      seats: Object.freeze(['seat-a', 'seat-b']),
      rng: Object.freeze({ value: 123 }),
      repair: 2, sabotage: 3, role: 'private-role', choice: 'private-choice',
      get unrelated() { throw new Error('must not inspect unrelated fields'); },
    });
    const first = incidentAnomalyEffect(input);
    const second = incidentAnomalyEffect(input);
    expect(first).toStrictEqual({ ok: true, value: { effect: 'shuffle-vote-cards', decisionRequired: null } });
    expect(second).toStrictEqual(first);
    expect(second).not.toBe(first);
    if (first.ok && second.ok) expect(second.value).not.toBe(first.value);
    expect(input.seats).toStrictEqual(['seat-a', 'seat-b']);
    expect(input.rng).toStrictEqual({ value: 123 });
    expect([input.repair, input.sabotage]).toStrictEqual([2, 3]);
  });
});
