import { describe, expect, it, vi } from 'vitest';
import { decodeRecipientView, type Phase, type Role, type Result } from '../../src/parallel100/recipient-view-decoder.js';

const phases: Phase[] = ['ROUND_START', 'VOTE_OPEN', 'CREW_LOCKED', 'OPERATION_LOCKED',
  'RESOLUTION', 'CITY_MOMENT', 'MATCH_END'];
const roles: Role[] = ['archivist', 'static-operative', 'null'];
const invalid = { ok: false, error: { code: 'invalid-input' } };

function snapshot(phase: Phase = 'ROUND_START', ownRole: Role = 'archivist') {
  return {
    version: 1 as const, recipientId: 'p_1', revision: 0, phase, active: true, ownRole,
    players: [
      { id: 'p_1', alias: 'Mica', avatarKey: 'signal', active: true, revealedRole: null as Role | null },
      { id: 'p-2', alias: 'Reed', avatarKey: 'ripple', active: false, revealedRole: null as Role | null },
    ],
  };
}

describe('decodeRecipientView', () => {
  it('matches the structural API across every phase and own role', () => {
    for (const phase of phases) for (const role of roles) {
      const input = snapshot(phase, role);
      type ExpectedView = Omit<typeof input, 'players'> & {
        readonly players: ReadonlyArray<(typeof input.players)[number]>;
      };
      const result: Result<ExpectedView> = decodeRecipientView(input);
      expect(result).toEqual({ ok: true, value: input });
    }
  });

  it('allows each exact end reveal and null, including an inactive recipient', () => {
    for (const role of [...roles, null]) {
      const input = snapshot('MATCH_END');
      input.active = false;
      input.players[0]!.active = false;
      input.players[1]!.revealedRole = role;
      expect(decodeRecipientView(input)).toEqual({ ok: true, value: input });
    }
  });

  it('rejects every pre-end reveal on any player', () => {
    for (const phase of phases.filter((phase) => phase !== 'MATCH_END')) {
      for (const role of roles) for (const index of [0, 1]) {
        const input = snapshot(phase);
        input.players[index]!.revealedRole = role;
        expect(decodeRecipientView(input)).toEqual(invalid);
      }
    }
  });

  it('rejects unknown, legacy and authority fields at both record levels', () => {
    for (const key of ['seed', 'passcode', 'diagnostics', 'history', 'witness', 'board', 'extra']) {
      expect(decodeRecipientView({ ...snapshot(), [key]: 'private-sentinel' })).toEqual(invalid);
      const input = snapshot();
      Object.defineProperty(input.players[1], key, { value: 'private-sentinel' });
      expect(decodeRecipientView(input)).toEqual(invalid);
    }
  });

  it('requires every own field with its exact type', () => {
    const rootBad: Record<string, unknown> = {
      version: '1', recipientId: 1, revision: '0', phase: 'END', active: 1,
      ownRole: 'witness', players: {},
    };
    for (const [key, value] of Object.entries(rootBad)) {
      expect(decodeRecipientView({ ...snapshot(), [key]: value })).toEqual(invalid);
      const missing: Record<string, unknown> = { ...snapshot() };
      delete missing[key];
      expect(decodeRecipientView(missing)).toEqual(invalid);
    }
    for (const [key, value] of Object.entries({ id: 1, alias: null, avatarKey: {}, active: 'true', revealedRole: 'witness' })) {
      const input = snapshot('MATCH_END');
      Object.assign(input.players[0]!, { [key]: value });
      expect(decodeRecipientView(input)).toEqual(invalid);
      const missing = snapshot();
      Reflect.deleteProperty(missing.players[0]!, key);
      expect(decodeRecipientView(missing)).toEqual(invalid);
    }
  });

  it('checks safe revisions and identity bounds without coercion', () => {
    for (const revision of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      expect(decodeRecipientView({ ...snapshot(), revision })).toEqual(invalid);
    }
    expect(decodeRecipientView({ ...snapshot(), revision: Number.MAX_SAFE_INTEGER }).ok).toBe(true);
    for (const badId of ['', 'a'.repeat(65), 'é', 'p 1', 'p.1', 'p\n']) {
      expect(decodeRecipientView({ ...snapshot(), recipientId: badId })).toEqual(invalid);
      const input = snapshot();
      input.players[1]!.id = badId;
      expect(decodeRecipientView(input)).toEqual(invalid);
    }
    const input = snapshot();
    input.recipientId = 'A_-0'.repeat(16);
    input.players[0]!.id = input.recipientId;
    expect(decodeRecipientView(input).ok).toBe(true);
  });

  it('requires one matching recipient and matching active flag', () => {
    expect(decodeRecipientView({ ...snapshot(), recipientId: 'unknown' })).toEqual(invalid);
    expect(decodeRecipientView({ ...snapshot(), active: false })).toEqual(invalid);
    expect(decodeRecipientView({ ...snapshot(), players: [] })).toEqual(invalid);
    const input = snapshot();
    input.players.push({ ...input.players[1]! });
    expect(decodeRecipientView(input)).toEqual(invalid);
    input.players[2]!.id = input.recipientId;
    expect(decodeRecipientView(input)).toEqual(invalid);
  });

  it('rejects symbols and accessors without invoking getters at any depth', () => {
    for (const level of ['root', 'player', 'array'] as const) {
      for (const symbol of [false, true]) {
        const input = snapshot();
        const target = level === 'root' ? input : level === 'player' ? input.players[0]! : input.players;
        Object.defineProperty(target, symbol ? Symbol('private') : 'private', { value: 1 });
        expect(decodeRecipientView(input)).toEqual(invalid);
      }
      const input = snapshot();
      const getter = vi.fn(() => { throw new Error('private-sentinel'); });
      const target = level === 'root' ? input : level === 'player' ? input.players[0]! : input.players;
      Object.defineProperty(target, level === 'root' ? 'ownRole' : level === 'player' ? 'alias' : '0', { get: getter });
      expect(decodeRecipientView(input)).toEqual(invalid);
      expect(getter).not.toHaveBeenCalled();
    }
  });

  it('requires dense arrays and rejects inspection failures with a fixed safe error', () => {
    const sparse = snapshot();
    delete sparse.players[0];
    expect(decodeRecipientView(sparse)).toEqual(invalid);
    const huge = snapshot();
    huge.players.length = 4_294_967_295;
    expect(decodeRecipientView(huge)).toEqual(invalid);
    const proxy = new Proxy(snapshot(), { ownKeys() { throw new Error('private-sentinel'); } });
    expect(decodeRecipientView(proxy)).toEqual(invalid);
    const revoked = Proxy.revocable([], {});
    revoked.revoke();
    expect(decodeRecipientView({ ...snapshot(), players: revoked.proxy })).toEqual(invalid);
    for (const value of [null, undefined, 1, 'private-sentinel', [], new Date(), Object.create(snapshot())]) {
      expect(decodeRecipientView(value)).toEqual(invalid);
    }
    const toString = vi.fn(() => 'p_1');
    expect(decodeRecipientView({ ...snapshot(), recipientId: { toString } })).toEqual(invalid);
    expect(toString).not.toHaveBeenCalled();
  });

  it('accepts frozen/null-prototype records and returns detached exact containers', () => {
    const input = snapshot();
    // B087 imposes no display-string normalization or size rules.
    input.players[0]!.alias = '';
    input.players[0]!.avatarKey = ' arbitrary\n🟣 ';
    for (const player of input.players) Object.freeze(Object.setPrototypeOf(player, null));
    Object.freeze(input.players);
    Object.freeze(Object.setPrototypeOf(input, null));
    const result = decodeRecipientView(input);
    expect(result).toEqual({ ok: true, value: input });
    if (!result.ok) throw new Error('expected success');
    expect(result.value).not.toBe(input);
    expect(result.value.players).not.toBe(input.players);
    for (const [index, player] of result.value.players.entries()) {
      expect(player).not.toBe(input.players[index]);
      expect(Object.keys(player)).toEqual(['id', 'alias', 'avatarKey', 'active', 'revealedRole']);
    }
    Object.assign(result.value.players[0]!, { alias: 'changed' });
    expect(input.players[0]!.alias).toBe('');
  });
});
