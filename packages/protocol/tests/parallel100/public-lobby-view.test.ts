import { describe, expect, it } from 'vitest';
import { publicLobbyView } from '../../src/parallel100/public-lobby-view.js';

type Input = Parameters<typeof publicLobbyView>[0];
const invalid = { ok: false, error: { code: 'invalid-input' } };

function player(id = 'player_a') {
  return { id, alias: 'Shared alias', avatarKey: 'signal', ready: true, connected: true };
}

function lobby() {
  return {
    code: 'AB12CD', name: 'Joined lobby', configuredSeats: 5,
    hostPlayerId: 'player_b', revision: 7,
    players: [player(), { ...player('player_b'), ready: false, connected: false }],
  };
}

function value(input: Input) {
  const result = publicLobbyView(input);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error('Expected a valid public lobby');
  return result.value;
}

describe('publicLobbyView', () => {
  it('keeps duplicate aliases, public presence and stable host identity', () => {
    const input = lobby();
    expect(value(input)).toEqual(input);
    expect(value(input).hostPlayerId).toBe('player_b');
    expect(value(input).players.map(({ alias }) => alias)).toEqual(['Shared alias', 'Shared alias']);
  });

  it('copies only the public allowlist, without reading extra private properties', () => {
    const input = lobby();
    Object.assign(input, { passcode: 'PRIVATE_PASSCODE_SENTINEL', passcodeHash: 'PRIVATE_HASH_SENTINEL' });
    Object.assign(input.players[0]!, { subject: 'PRIVATE_SUBJECT_SENTINEL', role: 'PRIVATE_ROLE_SENTINEL' });
    Object.defineProperty(input, 'seed', { enumerable: true, get: () => { throw new Error('Private getter ran'); } });
    Object.defineProperty(input.players[1]!, 'diagnostic', { enumerable: true, get: () => { throw new Error('Private getter ran'); } });
    const output = value(input);
    expect(Object.keys(output).sort()).toEqual(['code', 'configuredSeats', 'hostPlayerId', 'name', 'players', 'revision']);
    for (const entry of output.players) {
      expect(Object.keys(entry).sort()).toEqual(['alias', 'avatarKey', 'connected', 'id', 'ready']);
    }
    expect(JSON.stringify(output)).not.toMatch(/PRIVATE_|passcode|subject|role|seed|diagnostic/);
  });

  it('detaches the returned array and every nested player from trusted input', () => {
    const input = lobby();
    const output = value(input);
    expect(output).not.toBe(input);
    expect(output.players).not.toBe(input.players);
    output.players.forEach((entry, index) => expect(entry).not.toBe(input.players[index]));
    input.players[0]!.alias = 'Changed later';
    input.players.push(player('player_c'));
    expect(output.players).toHaveLength(2);
    expect(output.players[0]?.alias).toBe('Shared alias');
  });

  it('projects frozen input without changing it', () => {
    const input = lobby();
    input.players.forEach(Object.freeze);
    Object.freeze(input.players);
    Object.freeze(input);
    const before = JSON.stringify(input);
    expect(value(input)).toEqual(input);
    expect(JSON.stringify(input)).toBe(before);
  });

  it.each([5, 10])('accepts configured seat boundary %s', configuredSeats => {
    expect(value({ ...lobby(), configuredSeats }).configuredSeats).toBe(configuredSeats);
  });

  it.each([4, 11, 5.5, NaN, Infinity])('rejects invalid configured seats %s', configuredSeats => {
    expect(publicLobbyView({ ...lobby(), configuredSeats })).toEqual(invalid);
  });

  it.each([0, Number.MAX_SAFE_INTEGER])('preserves safe revision %s', revision => {
    expect(value({ ...lobby(), revision }).revision).toBe(revision);
  });

  it.each([-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])('rejects unsafe revision %s', revision => {
    expect(publicLobbyView({ ...lobby(), revision })).toEqual(invalid);
  });

  it('rejects overcapacity, duplicate IDs, absent host and empty roster', () => {
    expect(publicLobbyView({ ...lobby(), hostPlayerId: 'p0', players: Array.from({ length: 6 }, (_, i) => player(`p${i}`)) })).toEqual(invalid);
    expect(publicLobbyView({ ...lobby(), hostPlayerId: 'player_a', players: [player(), player()] })).toEqual(invalid);
    expect(publicLobbyView({ ...lobby(), hostPlayerId: 'absent' })).toEqual(invalid);
    expect(publicLobbyView({ ...lobby(), players: [] })).toEqual(invalid);
  });

  it('rejects malformed public roster fields without echoing submitted data', () => {
    const malformed: unknown[] = [
      null, undefined, 'not a lobby', { ...lobby(), players: null },
      { ...lobby(), players: [null] }, { ...lobby(), players: new Array(1) },
      { ...lobby(), players: [player('player_b'), { ...player(), id: '' }] },
      { ...lobby(), players: [player('player_b'), { ...player(), id: 'invalid id' }] },
      { ...lobby(), players: [player('player_b'), { ...player(), alias: 123 }] },
      { ...lobby(), players: [player('player_b'), { ...player(), avatarKey: false }] },
      { ...lobby(), players: [player('player_b'), { ...player(), ready: 'yes' }] },
      { ...lobby(), players: [player('player_b'), { ...player(), connected: 1 }] },
    ];
    for (const input of malformed) expect(publicLobbyView(input as Input)).toEqual(invalid);
  });
});
