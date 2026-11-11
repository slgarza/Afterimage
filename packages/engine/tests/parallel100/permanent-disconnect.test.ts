import { describe, expect, it } from 'vitest';
import { disconnectPlayer, type Role } from '../../src/parallel100/permanent-disconnect.js';

type Input = Parameters<typeof disconnectPlayer>[0];

function fixture(role: Role = 'archivist'): Input {
  return Object.freeze({
    actorId: 'lead', authorizedLeadId: 'lead', targetId: 'target', phaseAllowsPower: true,
    players: Object.freeze([
      Object.freeze({ id: 'lead', active: true, role: 'archivist' as const }),
      Object.freeze({ id: 'target', active: true, role }),
      Object.freeze({ id: 'spectator', active: false, role: 'static-operative' as const }),
    ]),
  });
}

describe('disconnectPlayer', () => {
  it.each<Role>(['archivist', 'static-operative', 'null'])('disconnects %s with only the permitted public effect', (role) => {
    const input = fixture(role);
    const before = structuredClone(input);
    const result = disconnectPlayer(input);
    expect(result).toEqual({ ok: true, value: {
      players: [input.players[0], { id: 'target', active: false, role }, input.players[2]],
      winner: role === 'null' ? 'archivists' : null,
      publicEffect: { targetId: 'target', spectator: true, nullVictory: role === 'null' },
    } });
    expect(input).toEqual(before);
    if (!result.ok) throw new Error('Expected success');
    expect(result.value.players).not.toBe(input.players);
    result.value.players.forEach((player, index) => expect(player).not.toBe(input.players[index]));
    expect(disconnectPlayer({ ...input, players: result.value.players })).toEqual({
      ok: false, error: { code: 'forbidden' },
    });
    // Public effects carry no private or unknown authority fields.
    expect(Object.keys(result.value.publicEffect).sort()).toEqual(['nullVictory', 'spectator', 'targetId']);
  });

  it.each([
    { actorId: 'other' }, { phaseAllowsPower: false }, { targetId: 'lead' },
    { targetId: 'absent' }, { targetId: 'spectator' },
  ])('rejects illegal targeting context %j without mutation or role echo', (change) => {
    for (const role of ['archivist', 'static-operative', 'null'] as const) {
      const input = { ...fixture(role), ...change };
      const before = structuredClone(input);
      expect(disconnectPlayer(input)).toEqual({ ok: false, error: { code: 'forbidden' } });
      expect(input).toEqual(before);
    }
  });

  it('rejects duplicate IDs even away from the target', () => {
    const input = fixture();
    expect(disconnectPlayer({ ...input, players: [...input.players, input.players[0]!] }))
      .toEqual({ ok: false, error: { code: 'invalid-input' } });
  });

  it.each([
    null, undefined, {}, { ...fixture(), actorId: '' },
    { ...fixture(), authorizedLeadId: 'x'.repeat(65) },
    { ...fixture(), targetId: 'bad id' }, { ...fixture(), phaseAllowsPower: 1 },
    { ...fixture(), players: null }, { ...fixture(), players: [null] },
    { ...fixture(), players: new Array(2) },
    ...[{ id: 'bad id', active: true, role: 'null' },
      { id: 'target', active: 1, role: 'null' },
      { id: 'target', active: true, role: 'secret' }]
      .map((player) => ({ ...fixture(), players: [player] })),
  ])('fails safely on malformed runtime input %#', (input) => {
    expect(disconnectPlayer(input as Input)).toEqual({ ok: false, error: { code: 'invalid-input' } });
  });

  it('does not run accessors and contains inspection failures', () => {
    let reads = 0;
    const accessor = { ...fixture(), get targetId() { reads += 1; return 'target'; } };
    const nested = { ...fixture(), players: [{ get id() { reads += 1; return 'target'; }, active: true, role: 'null' }] };
    const throwing = new Proxy(fixture(), { getOwnPropertyDescriptor() { throw new Error('private'); } });
    for (const input of [accessor, nested, throwing]) {
      expect(disconnectPlayer(input as Input)).toEqual({ ok: false, error: { code: 'invalid-input' } });
    }
    expect(reads).toBe(0);
  });

  it('allowlists detached authority output and replays deterministically', () => {
    const base = fixture();
    const input = { ...base, players: base.players.map((player) => ({ ...player, privateNote: 'hidden' })) };
    const first = disconnectPlayer(input);
    expect(first).toEqual(disconnectPlayer(input));
    if (!first.ok) throw new Error('Expected success');
    for (const player of first.value.players) expect(Object.keys(player).sort()).toEqual(['active', 'id', 'role']);
    Object.assign(first.value.players[0]!, { active: false, role: 'null' });
    expect(input.players[0]?.active).toBe(true);
    expect(disconnectPlayer(input)).toEqual(disconnectPlayer(base));
  });
});
