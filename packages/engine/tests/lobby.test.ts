import { describe, expect, it } from 'vitest';
import {
  createLobbyState, getLobbyReadiness, reduceLobby,
  type LobbyEvent, type LobbyState,
} from '../src/lobby.js';

function populate(count: number): LobbyState {
  return Array.from({ length: count }, (_, index): LobbyEvent => ({
    type: 'join', playerId: `player-${index}`, displayName: 'Same name',
  })).reduce(reduceLobby, createLobbyState());
}

function freezeState(state: LobbyState): LobbyState {
  state.players.forEach(Object.freeze);
  Object.freeze(state.players);
  return Object.freeze(state);
}

describe('lobby membership', () => {
  it('starts with independent empty states at revision zero', () => {
    const state = createLobbyState();
    expect(state).toEqual({ revision: 0, players: [] });
    expect(createLobbyState()).not.toBe(state);
    expect(createLobbyState().players).not.toBe(state.players);
    expect(getLobbyReadiness(state)).toEqual({
      playerCount: 0, availableSlots: 10, hasMinimumPlayers: false,
    });
  });

  it('replays frozen events deterministically and preserves every prior state', () => {
    const events: readonly LobbyEvent[] = Object.freeze([
      { type: 'join', playerId: 'a', displayName: 'Echo' },
      { type: 'join', playerId: 'b', displayName: 'Echo' },
      { type: 'join', playerId: 'c', displayName: '光' },
      { type: 'rename', playerId: 'b', displayName: 'New  name' },
      { type: 'set-connected', playerId: 'c', connected: false },
      { type: 'leave', playerId: 'b' },
      { type: 'join', playerId: 'b', displayName: 'Returned' },
      { type: 'set-connected', playerId: 'c', connected: true },
    ].map((event) => Object.freeze(event)) as LobbyEvent[]);
    const replay = () => events.reduce((state, event) => {
      freezeState(state);
      const before = JSON.stringify(state);
      const next = reduceLobby(state, event);
      expect(next).not.toBe(state);
      expect(next.players).not.toBe(state.players);
      expect(next.revision).toBe(state.revision + 1);
      expect(JSON.stringify(state)).toBe(before);
      return next;
    }, createLobbyState());
    const result = replay();
    expect(replay()).toEqual(result);
    expect(result).toEqual({ revision: 8, players: [
      { id: 'a', displayName: 'Echo', connected: true },
      { id: 'c', displayName: '光', connected: true },
      { id: 'b', displayName: 'Returned', connected: true },
    ] });
  });

  it('accepts same-value updates with one revision increment each', () => {
    const state = freezeState(populate(1));
    const renamed = reduceLobby(state, { type: 'rename', playerId: 'player-0', displayName: 'Same name' });
    const connected = reduceLobby(freezeState(renamed), {
      type: 'set-connected', playerId: 'player-0', connected: true,
    });
    expect(renamed.revision).toBe(2);
    expect(connected.revision).toBe(3);
    expect(connected.players).toEqual(state.players);
    expect(connected).not.toBe(renamed);
  });

  it.each([4, 5, 10])('counts all %i members, including disconnected members', (count) => {
    const state = reduceLobby(populate(count), {
      type: 'set-connected', playerId: 'player-0', connected: false,
    });
    expect(state.players[0]?.connected).toBe(false);
    expect(getLobbyReadiness(state)).toEqual({
      playerCount: count, availableSlots: 10 - count, hasMinimumPlayers: count >= 5,
    });
  });

  it('rejects an eleventh member and permits a replacement after leaving', () => {
    const full = freezeState(populate(10));
    expect(() => reduceLobby(full, { type: 'join', playerId: 'extra', displayName: 'Extra' })).toThrow();
    expect(full).toEqual(populate(10));
    const vacancy = reduceLobby(full, { type: 'leave', playerId: 'player-4' });
    const replaced = reduceLobby(vacancy, { type: 'join', playerId: 'extra', displayName: 'Extra' });
    expect(replaced.players.map(({ id }) => id)).toEqual([
      'player-0', 'player-1', 'player-2', 'player-3', 'player-5',
      'player-6', 'player-7', 'player-8', 'player-9', 'extra',
    ]);
  });

  it.each(['A', 'a_0-Z', 'x'.repeat(64)])('accepts canonical ID %s', (playerId) => {
    expect(reduceLobby(createLobbyState(), { type: 'join', playerId, displayName: 'Name' })
      .players[0]?.id).toBe(playerId);
  });

  it.each(['光', '😀'.repeat(24), 'e\u0301', 'Two  Words', 'a'.repeat(24)])(
    'preserves canonical Unicode name %s', (displayName) => {
      const state = reduceLobby(createLobbyState(), { type: 'join', playerId: 'a', displayName });
      expect(state.players[0]?.displayName).toBe(displayName);
      expect(reduceLobby(state, { type: 'rename', playerId: 'a', displayName })
        .players[0]?.displayName).toBe(displayName);
    },
  );

  const invalidNames = ['', ' ', ' Name', 'Name ', '\u00a0Name', 'a'.repeat(25),
    '😀'.repeat(25), 'a\u0000b', 'a\nb', 'a\u007fb', 'a\u0085b'];
  const invalidIds = ['', 'a'.repeat(65), ' a', 'a ', 'a.b', '光', 'a\n'];
  const failures: LobbyEvent[] = [
    { type: 'join', playerId: 'player-0', displayName: 'Different' },
    ...invalidNames.flatMap((displayName): LobbyEvent[] => [
      { type: 'join', playerId: 'new', displayName },
      { type: 'rename', playerId: 'player-0', displayName },
    ]),
    ...invalidIds.flatMap((playerId): LobbyEvent[] => [
      { type: 'join', playerId, displayName: 'Name' },
      { type: 'leave', playerId },
      { type: 'rename', playerId, displayName: 'Name' },
      { type: 'set-connected', playerId, connected: false },
    ]),
    { type: 'leave', playerId: 'missing' },
    { type: 'rename', playerId: 'missing', displayName: 'Name' },
    { type: 'set-connected', playerId: 'missing', connected: false },
  ];

  it.each(failures)('rejects invalid membership event without mutation: %j', (event) => {
    const state = freezeState(populate(2));
    const before = JSON.stringify(state);
    const frozenEvent = Object.freeze(event);
    expect(() => reduceLobby(state, frozenEvent)).toThrow();
    expect(JSON.stringify(state)).toBe(before);
    expect(frozenEvent).toEqual(event);
  });

  it('rejects revision overflow without mutation or leaking submitted values', () => {
    const state = freezeState({ ...populate(1), revision: Number.MAX_SAFE_INTEGER });
    expect(() => reduceLobby(state, { type: 'leave', playerId: 'player-0' })).toThrow();
    expect(state.revision).toBe(Number.MAX_SAFE_INTEGER);
    const privateName = 'invalid\u0000private';
    try {
      reduceLobby(createLobbyState(), { type: 'join', playerId: 'a', displayName: privateName });
      expect.fail('Expected invalid name to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect(String(error)).not.toContain(privateName);
    }
  });
});
