import { describe, expect, it } from 'vitest';
import { hostLobbyPermission } from '../../src/parallel100/host-lobby-permissions.js';

type Input = Parameters<typeof hostLobbyPermission>[0];
const players = ['host', 'p2', 'p3', 'p4', 'p5'];
const base: Input = {
  verifiedPlayerId: 'host', hostPlayerId: 'host', phase: 'lobby', action: 'start',
  targetId: null, playerIds: players, configuredSeats: 5, readyPlayerIds: players, fillBots: false,
};
const allowed = { ok: true, value: { allowed: true, reason: 'allowed' } };
const invalid = { ok: false, error: { code: 'invalid-input' } };
const denied = (reason: string) => ({ ok: true, value: { allowed: false, reason } });
const check = (patch: Partial<Input>) => hostLobbyPermission({ ...base, ...patch });

describe('hostLobbyPermission', () => {
  it.each(['configure', 'kick', 'start'] as const)('requires the lobby host for %s', action => {
    expect(check({ action, targetId: 'p2' })).toEqual(allowed);
    expect(check({ action, verifiedPlayerId: 'p2' })).toEqual(denied('host-only'));
    expect(check({ action, verifiedPlayerId: 'outsider' })).toEqual(denied('host-only'));
    for (const phase of ['match', 'ended'] as const) {
      expect(check({ action, phase })).toEqual(denied('phase'));
    }
  });

  it.each([5, 6, 7, 8, 9, 10])('admits a full ready %i-seat table', configuredSeats => {
    const ids = Array.from({ length: configuredSeats }, (_, i) => i === 0 ? 'host' : `p${i}`);
    expect(check({ configuredSeats, playerIds: ids, readyPlayerIds: ids })).toEqual(allowed);
    expect(check({ action: 'configure', configuredSeats })).toEqual(allowed);
  });

  it('admits trusted bot fill only with all humans ready', () => {
    expect(check({ configuredSeats: 10 })).toEqual(denied('not-ready'));
    expect(check({ configuredSeats: 10, fillBots: true })).toEqual(allowed);
    expect(check({ playerIds: ['host'], readyPlayerIds: ['host'], fillBots: true })).toEqual(allowed);
    for (const fillBots of [false, true]) {
      expect(check({ fillBots, readyPlayerIds: players.slice(1) })).toEqual(denied('not-ready'));
    }
    expect(check({ action: 'configure', readyPlayerIds: [] })).toEqual(allowed);
  });

  it.each([null, 'host', 'absent'])('denies invalid kick target %s', targetId => {
    expect(check({ action: 'kick', targetId })).toEqual(denied('target'));
  });

  it.each([
    { playerIds: ['host', 'host'] }, { readyPlayerIds: ['host', 'host'] },
    { playerIds: ['p2'], readyPlayerIds: [] }, { readyPlayerIds: ['absent'] },
    { configuredSeats: 4 }, { configuredSeats: 11 }, { configuredSeats: 5.5 },
    { configuredSeats: NaN }, { configuredSeats: Infinity },
    { playerIds: [...players, 'p6'] }, { verifiedPlayerId: '' },
    { hostPlayerId: 'bad id' }, { targetId: 'é' },
    { verifiedPlayerId: 'a'.repeat(65) }, { playerIds: ['host', 'bad/id'] },
  ])('rejects inconsistent or malformed input %j', patch => {
    expect(check(patch)).toEqual(invalid);
  });

  it('accepts the identity boundary without treating display names as IDs', () => {
    const host = 'a'.repeat(64);
    expect(check({ verifiedPlayerId: host, hostPlayerId: host,
      playerIds: [host, '_-09'], readyPlayerIds: [host, '_-09'], fillBots: true })).toEqual(allowed);
  });

  it('rejects malformed runtime shapes safely', () => {
    for (const input of [null, undefined, 1, 'input', {}, { ...base, phase: 'unknown' },
      { ...base, action: 'unknown' }, { ...base, fillBots: 1 },
      { ...base, playerIds: {} }, { ...base, readyPlayerIds: [null] },
      { ...base, playerIds: new Array(5) }, { ...base, targetId: undefined }]) {
      expect(hostLobbyPermission(input as Input)).toEqual(invalid);
    }
  });

  it('does not invoke input accessors or coercions', () => {
    let invoked = 0;
    const getter = () => { invoked++; throw new Error('must not execute'); };
    for (const key of Object.keys(base)) {
      const input = Object.defineProperty({ ...base }, key, { get: getter });
      expect(hostLobbyPermission(input)).toEqual(invalid);
    }
    const ids = Object.defineProperty([...players], '0', { get: getter });
    expect(check({ playerIds: ids })).toEqual(invalid);
    expect(check({ verifiedPlayerId: { toString: getter } as unknown as string })).toEqual(invalid);
    expect(invoked).toBe(0);
    expect(hostLobbyPermission(new Proxy(base, {
      getOwnPropertyDescriptor() { throw new Error('inspection failure'); },
    }))).toEqual(invalid);
  });

  it('is deterministic, detached and leaves frozen inputs untouched', () => {
    const input = Object.freeze({ ...base, playerIds: Object.freeze([...players]),
      readyPlayerIds: Object.freeze([...players]) });
    const before = JSON.stringify(input);
    const first = hostLobbyPermission(input);
    expect(first).toEqual(allowed);
    expect(hostLobbyPermission(input)).toEqual(first);
    expect(hostLobbyPermission(input)).not.toBe(first);
    expect(JSON.stringify(input)).toBe(before);
    expect(hostLobbyPermission(Object.freeze({ ...input, action: 'kick', targetId: 'host' })))
      .toEqual(denied('target'));
    expect(hostLobbyPermission(Object.freeze({ ...input, configuredSeats: 3 }))).toEqual(invalid);
  });
});
