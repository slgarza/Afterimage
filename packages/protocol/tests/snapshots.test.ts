import { describe, expect, it } from 'vitest';
import { projectSnapshot, type AuthoritativeSnapshotState } from '../src/snapshots.js';

function fixture() {
  const state = {
    roomCode: 'ABC123', revision: 7,
    players: [
      { id: 'p1', displayName: 'Ada', connected: true, faction: 'archivists' as const, roleId: 'role-one', extra: 'player-secret' },
      { id: 'p2', displayName: 'Bo', connected: false, faction: 'static' as const, roleId: 'role-two', extra: 'player-secret' },
    ],
    board: { stability: 2, corruption: 1, extra: 'board-secret' },
    transmission: {
      id: 't1', title: 'Quiet signal', scenario: 'A fragment returns.', extra: 'transmission-secret',
      outcomes: [
        { id: 'o1', label: 'Restore', extra: 'outcome-secret-1' },
        { id: 'o2', label: 'Retain', extra: 'outcome-secret-2' },
        { id: 'o3', label: 'Release', extra: 'outcome-secret-3' },
      ] as [
        { id: string; label: string; extra: string },
        { id: string; label: string; extra: string },
        { id: string; label: string; extra: string },
      ],
    },
    link: ['p1', 'p2'] as [string, string],
    seed: 987654321, deck: ['hidden-card'], privateChoices: { p1: 'hidden-choice' },
    extra: 'state-secret',
  };
  return state satisfies AuthoritativeSnapshotState;
}

const expectedPublic = {
  roomCode: 'ABC123', revision: 7,
  players: [
    { id: 'p1', displayName: 'Ada', connected: true },
    { id: 'p2', displayName: 'Bo', connected: false },
  ],
  board: { stability: 2, corruption: 1 },
  transmission: {
    id: 't1', title: 'Quiet signal', scenario: 'A fragment returns.',
    outcomes: [{ id: 'o1', label: 'Restore' }, { id: 'o2', label: 'Retain' }, { id: 'o3', label: 'Release' }],
  },
  link: ['p1', 'p2'],
};

describe('projectSnapshot', () => {
  it.each([
    ['p1', { playerId: 'p1', faction: 'archivists', roleId: 'role-one' }],
    ['p2', { playerId: 'p2', faction: 'static', roleId: 'role-two' }],
    [null, null],
  ] as const)('projects only allowed fields for %s', (viewerId, privateSnapshot) => {
    const result = projectSnapshot(fixture(), viewerId);
    const expected = { public: expectedPublic, private: privateSnapshot };
    expect(result).toStrictEqual(expected);
    expect(JSON.parse(JSON.stringify(result))).toStrictEqual(expected);
    const serialized = JSON.stringify(result);
    for (const secret of ['seed', '987654321', 'deck', 'hidden-card', 'privateChoices', 'hidden-choice', 'extra', '-secret']) {
      expect(serialized).not.toContain(secret);
    }
    for (const role of ['role-one', 'role-two']) {
      if (role !== privateSnapshot?.roleId) expect(serialized).not.toContain(role);
    }
    expect(JSON.stringify(result.public)).not.toMatch(/faction|roleId|archivists|static/);
  });

  it('preserves nullable public fields and an empty roster for spectators', () => {
    const state = { ...fixture(), players: [], transmission: null, link: null };
    expect(projectSnapshot(state, null)).toStrictEqual({
      public: { ...expectedPublic, players: [], transmission: null, link: null }, private: null,
    });
  });

  it('rejects unknown viewers without echoing submitted identity or authoritative data', () => {
    const state = fixture();
    const before = structuredClone(state);
    for (const viewerId of ['secret-viewer', '', 'toString']) {
      expect(() => projectSnapshot(state, viewerId)).toThrowError(new Error('Unknown snapshot viewer'));
    }
    expect(state).toStrictEqual(before);
  });

  it('detaches every exposed container from the state and other recipients', () => {
    const state = fixture();
    const before = structuredClone(state);
    const first = projectSnapshot(state, 'p1');
    const second = projectSnapshot(state, 'p2');
    expect(state).toStrictEqual(before);
    expect(first).not.toBe(second);
    expect(first.public).not.toBe(second.public);
    expect(first.private).not.toBe(second.private);
    expect(first.private).not.toBe(state.players[0]);
    expect(first.public.players).not.toBe(state.players);
    expect(first.public.board).not.toBe(state.board);
    expect(first.public.transmission).not.toBe(state.transmission);
    expect(first.public.link).not.toBe(state.link);
    expect(first.public.transmission?.outcomes).not.toBe(state.transmission.outcomes);
    first.public.players.forEach((player, index) => {
      expect(player).not.toBe(state.players[index]);
      expect(player).not.toBe(second.public.players[index]);
      Object.assign(player, { displayName: 'Changed' });
    });
    first.public.transmission?.outcomes.forEach((outcome, index) => {
      expect(outcome).not.toBe(state.transmission.outcomes[index]);
      expect(outcome).not.toBe(second.public.transmission?.outcomes[index]);
      Object.assign(outcome, { label: 'Changed' });
    });
    Object.assign(first.public.players, { 2: { id: 'new' } });
    Object.assign(first.public.board, { stability: 5 });
    Object.assign(first.public.transmission!.outcomes, { 0: { id: 'changed' } });
    Object.assign(first.public.transmission!, { title: 'Changed' });
    Object.assign(first.public.link!, { 0: 'changed' });
    Object.assign(first.private!, { roleId: 'changed' });
    Object.assign(first.public, { revision: 99 });
    Object.assign(first, { private: null });
    expect(state).toStrictEqual(before);
    expect(second).toStrictEqual({ public: expectedPublic, private: { playerId: 'p2', faction: 'static', roleId: 'role-two' } });
  });

  it('keeps an existing projection unchanged when input containers mutate', () => {
    const state = fixture();
    const result = projectSnapshot(state, 'p1');
    state.players[0]!.displayName = 'Changed';
    state.players[0]!.roleId = 'changed';
    state.players.push({ ...state.players[0]!, id: 'p3' });
    state.board.stability = 5;
    state.transmission.outcomes[0].label = 'Changed';
    state.transmission.outcomes[1] = { id: 'changed', label: 'Changed', extra: 'secret' };
    state.transmission.title = 'Changed';
    state.link[0] = 'changed';
    state.revision = 99;
    expect(result).toStrictEqual({ public: expectedPublic, private: { playerId: 'p1', faction: 'archivists', roleId: 'role-one' } });
  });
});
