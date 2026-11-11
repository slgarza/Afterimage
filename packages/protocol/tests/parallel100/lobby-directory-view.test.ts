import { describe, expect, it } from 'vitest';
import { lobbyDirectoryView } from '../../src/parallel100/lobby-directory-view.js';

type Input = Parameters<typeof lobbyDirectoryView>[0];
const room = { id: 'public-handle', name: 'Evening', listed: true, joinable: true, seats: 5, connected: 2, requiresPasscode: false };
const invalid = { ok: false, error: { code: 'invalid-input' } };
function decode(input: unknown) { return lobbyDirectoryView(input as Input); }

describe('lobbyDirectoryView', () => {
  it('filters all hidden combinations and preserves visible order', () => {
    const rooms = [room, { ...room, id: 'hidden', listed: false },
      { ...room, id: 'closed', joinable: false }, { ...room, listed: false, joinable: false },
      { ...room, id: 'second', requiresPasscode: true, seats: 10, connected: 10 }];
    expect(lobbyDirectoryView({ rooms })).toEqual({ ok: true, value: [
      { id: room.id, name: room.name, seats: 5, connected: 2, requiresPasscode: false },
      { id: 'second', name: room.name, seats: 10, connected: 10, requiresPasscode: true },
    ] });
    expect(lobbyDirectoryView({ rooms: [] })).toEqual({ ok: true, value: [] });
    expect(lobbyDirectoryView({ rooms: rooms.slice(1, 4) })).toEqual({ ok: true, value: [] });
  });

  it('copies only the public allowlist and never reads private getters', () => {
    let reads = 0;
    const privateRoom = { ...room, passcode: 'secret', hash: 'secret', code: 'SECRET', hostPrincipal: 'secret', role: 'secret',
      get diagnostic() { reads += 1; throw new Error('secret'); } };
    const result = lobbyDirectoryView({ rooms: [privateRoom] });
    expect(result).toEqual({ ok: true, value: [{ id: room.id, name: room.name, seats: 5, connected: 2, requiresPasscode: false }] });
    expect(JSON.stringify(result)).not.toContain('secret');
    expect(reads).toBe(0);
  });

  it('does not inspect hidden handles, occupancy, or private fields', () => {
    const hidden = { ...room, listed: false, get id(): string { throw new Error('secret'); }, seats: -1 };
    expect(lobbyDirectoryView({ rooms: [hidden, room] }).ok).toBe(true);
  });

  it('rejects duplicate visible handles and invalid capacity or occupancy', () => {
    expect(lobbyDirectoryView({ rooms: [room, room] })).toEqual(invalid);
    for (const seats of [4, 11, 5.5, NaN, Infinity, '5', null]) {
      expect(decode({ rooms: [{ ...room, seats }] })).toEqual(invalid);
    }
    for (const connected of [-1, 6, 1.5, NaN, Infinity, '2', null]) {
      expect(decode({ rooms: [{ ...room, connected }] })).toEqual(invalid);
    }
    expect(lobbyDirectoryView({ rooms: [{ ...room, connected: 0 }] }).ok).toBe(true);
  });

  it('returns detached entries and arrays for frozen inputs', () => {
    const source = Object.freeze({ ...room });
    const rooms = Object.freeze([source]);
    const result = lobbyDirectoryView({ rooms });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).not.toBe(rooms);
      expect(result.value[0]).not.toBe(source);
      Object.assign(result.value[0] ?? {}, { name: 'Changed', connected: 4 });
      expect(source.name).toBe('Evening');
      expect(source.connected).toBe(2);
    }
  });

  it('rejects malformed runtime fields without invoking accessors or conversions', () => {
    let reads = 0;
    for (const input of [null, undefined, {}, { rooms: null }, { rooms: {} }, { rooms: [null] }, { rooms: new Array(1) }]) {
      expect(decode(input)).toEqual(invalid);
    }
    for (const key of Object.keys(room)) {
      const missing: Record<string, unknown> = { ...room };
      delete missing[key];
      expect(decode({ rooms: [missing] })).toEqual(invalid);
      const accessor = Object.defineProperty({ ...room }, key, { get() { reads += 1; throw new Error('secret'); } });
      expect(decode({ rooms: [accessor] })).toEqual(invalid);
    }
    for (const patch of [{ id: '' }, { id: 12 }, { name: null }, { listed: 1 }, { joinable: 'true' }, { requiresPasscode: 0 }]) {
      expect(decode({ rooms: [{ ...room, ...patch }] })).toEqual(invalid);
    }
    expect(decode({ get rooms() { reads += 1; throw new Error('secret'); } })).toEqual(invalid);
    const rooms = [room];
    Object.defineProperty(rooms, '0', { get() { reads += 1; throw new Error('secret'); } });
    expect(decode({ rooms })).toEqual(invalid);
    const id = { toString() { reads += 1; return 'public-handle'; } };
    expect(decode({ rooms: [{ ...room, id }] })).toEqual(invalid);
    expect(decode({ rooms: new Proxy([], { getOwnPropertyDescriptor() { throw new Error('secret'); } }) })).toEqual(invalid);
    expect(reads).toBe(0);
  });
});
