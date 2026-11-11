import { describe, expect, it } from 'vitest';
import { roundCapabilities } from '../../src/parallel100/round-capabilities.js';

const eligible = (id: string) => ({ id, active: true, jammed: false, crewCooldown: false });
const decode = (input: unknown) => roundCapabilities(input as Parameters<typeof roundCapabilities>[0]);
const invalid = { ok: false, error: { code: 'invalid-input' } };

describe('roundCapabilities', () => {
  it('implements all status combinations, including an eligible current Shift Lead', () => {
    const players = [
      { id: 'spectator', active: false, jammed: false, crewCooldown: false },
      { id: 'spectatorCooldown', active: false, jammed: false, crewCooldown: true },
      { id: 'spectatorJammed', active: false, jammed: true, crewCooldown: false },
      { id: 'spectatorBoth', active: false, jammed: true, crewCooldown: true },
      eligible('currentShiftLead'),
      { id: 'cooldown', active: true, jammed: false, crewCooldown: true },
      { id: 'jammed', active: true, jammed: true, crewCooldown: false },
      { id: 'both', active: true, jammed: true, crewCooldown: true },
    ];
    expect(roundCapabilities({ players })).toEqual({ ok: true, value: {
      players: [
        ...players.slice(0, 4).map(({ id }) => ({ id, mayVote: false, mayServe: false, mayChat: false })),
        { id: 'currentShiftLead', mayVote: true, mayServe: true, mayChat: true },
        { id: 'cooldown', mayVote: true, mayServe: false, mayChat: true },
        { id: 'jammed', mayVote: false, mayServe: false, mayChat: true },
        { id: 'both', mayVote: false, mayServe: false, mayChat: true },
      ], eligibleCrewIds: ['currentShiftLead'], unresolvedDecision: 'D-ELIGIBLE-POOL',
    } });
  });

  it.each([[], ['only'], ['z', 'a'], ['z', 'a', 'm']])('preserves the exact pool %j', (...ids: string[]) => {
    // Vitest spreads array rows; each row is the complete candidate list.
    const result = roundCapabilities({ players: ids.map(eligible) });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.eligibleCrewIds).toEqual(ids);
    expect(result.value.unresolvedDecision).toBe(ids.length < 2 ? 'D-ELIGIBLE-POOL' : null);
  });

  it('rejects duplicate and noncanonical identities without coercion', () => {
    expect(roundCapabilities({ players: [eligible('same'), eligible('same')] })).toEqual(invalid);
    for (const id of ['', 'a b', 'é', 'x'.repeat(65), 1, null, { toString: () => { throw new Error('coercion'); } }]) {
      expect(decode({ players: [{ ...eligible('valid'), id }] })).toEqual(invalid);
    }
    expect(roundCapabilities({ players: [eligible('A_z-09'), eligible('x'.repeat(64))] }).ok).toBe(true);
  });

  it('rejects malformed containers, entries and each malformed flag', () => {
    for (const input of [null, undefined, {}, { players: null }, { players: {} }, { players: [null] }, { players: Array(1) }]) {
      expect(decode(input)).toEqual(invalid);
    }
    for (const key of ['active', 'jammed', 'crewCooldown']) {
      for (const value of [undefined, null, 0, 1, 'true', {}, []]) {
        expect(decode({ players: [{ ...eligible('p'), [key]: value }] })).toEqual(invalid);
      }
    }
  });

  it('does not invoke getters at any decoded boundary', () => {
    let calls = 0;
    const getter = { get: () => { calls += 1; return true; } };
    const input = Object.defineProperty({}, 'players', getter);
    expect(decode(input)).toEqual(invalid);
    for (const key of ['id', 'active', 'jammed', 'crewCooldown']) {
      expect(decode({ players: [Object.defineProperty(eligible('p'), key, getter)] })).toEqual(invalid);
    }
    const players = Object.defineProperty([eligible('p')], '0', getter);
    expect(decode({ players })).toEqual(invalid);
    expect(calls).toBe(0);
  });

  it('accepts frozen inputs and returns independent arrays and records', () => {
    const player = Object.freeze(eligible('p'));
    const input = Object.freeze({ players: Object.freeze([player]) });
    const first = roundCapabilities(input);
    const second = roundCapabilities(input);
    expect(first).toEqual(second);
    if (!first.ok || !second.ok) throw new Error('Expected valid input');
    expect(first.value.players).not.toBe(input.players);
    expect(first.value.players[0]).not.toBe(player);
    expect(first.value.players).not.toBe(second.value.players);
    expect(first.value.players[0]).not.toBe(second.value.players[0]);
    expect(first.value.eligibleCrewIds).not.toBe(second.value.eligibleCrewIds);
  });
});
