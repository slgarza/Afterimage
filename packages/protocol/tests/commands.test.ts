import { describe, expect, it } from 'vitest';
import { parseCommand, type CommandParseResult, type PublicCommand } from '../src/commands.js';

const join = { type: 'join-room', roomCode: 'AB12CD', displayName: 'Mira' } as const;
const nominate = { type: 'nominate-link', playerIds: ['one', 'two'], expectedRevision: 0 } as const;

function rejected(input: unknown): void {
  const result: CommandParseResult = parseCommand(input);
  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.error.code).toBe('invalid_command');
    expect(result.error.path).toMatch(/^(\$|type|roomCode|displayName|expectedRevision|playerIds(?:\[[01]\])?|approve)$/);
    expect(Object.keys(result.error)).toEqual(['code', 'path']);
  }
}

describe('parseCommand', () => {
  it('accepts all public variants and constructs detached commands', () => {
    const commands: readonly PublicCommand[] = [
      join,
      { type: 'rename-player', displayName: 'A  B', expectedRevision: Number.MAX_SAFE_INTEGER },
      nominate,
      { type: 'cast-link-vote', approve: true, expectedRevision: 1 },
      { type: 'cast-link-vote', approve: false, expectedRevision: 0 },
    ];
    for (const command of commands) {
      Object.freeze(command);
      const result = parseCommand(command);
      expect(result).toEqual({ ok: true, value: command });
      if (result.ok) {
        expect(result.value).not.toBe(command);
        if (result.value.type === 'nominate-link') {
          expect(result.value.playerIds).not.toBe(nominate.playerIds);
        }
      }
    }
    expect(parseCommand(Object.assign(Object.create(null), join))).toEqual({ ok: true, value: join });
  });

  it('counts Unicode code points and preserves canonical names', () => {
    for (const displayName of ['é', 'e\u0301', '星', '🌙'.repeat(24), 'A  B']) {
      expect(parseCommand({ ...join, displayName })).toEqual({ ok: true, value: { ...join, displayName } });
    }
    for (const displayName of ['', ' ', ' Mira', 'Mira ', '\u00a0Mira', '🌙'.repeat(25), 'a\nb', 'a\u0000b', 'a\u007fb', 'a\u0085b', null, 1]) {
      rejected({ ...join, displayName });
      rejected({ type: 'rename-player', displayName, expectedRevision: 0 });
    }
  });

  it('requires canonical six-character ASCII codes', () => {
    for (const roomCode of ['ABCDEF', '012345']) expect(parseCommand({ ...join, roomCode }).ok).toBe(true);
    for (const roomCode of ['ABCDE', 'ABCDEFG', 'abcdef', ' ABCDE', 'ABCDEF\n', 'ＡBCDEF', 'ABC_DE', null, 123456]) {
      rejected({ ...join, roomCode });
    }
  });

  it('requires safe nonnegative revisions for every revision-bearing command', () => {
    for (const type of ['rename-player', 'nominate-link', 'cast-link-vote']) {
      const base = type === 'rename-player' ? { type, displayName: 'Mira' }
        : type === 'nominate-link' ? { type, playerIds: ['a', 'b'] } : { type, approve: true };
      for (const expectedRevision of [-1, 0.5, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1, '0', null, undefined]) {
        rejected({ ...base, expectedRevision });
      }
    }
  });

  it('requires exactly two distinct bounded IDs and boolean votes', () => {
    expect(parseCommand({ ...nominate, playerIds: ['a', 'Z_9-'.repeat(16)] }).ok).toBe(true);
    for (const playerIds of [[], ['a'], ['a', 'b', 'c'], ['a', 'a'], ['', 'b'], ['a', 'x'.repeat(65)], ['a b', 'b'], ['a', 'é'], [1, 'b'], 'ab', { 0: 'a', 1: 'b', length: 2 }, new Array(2)]) {
      rejected({ ...nominate, playerIds });
    }
    for (const approve of [0, 1, 'true', null, undefined, new Boolean(false)]) {
      rejected({ type: 'cast-link-vote', approve, expectedRevision: 0 });
    }
  });

  it('rejects malformed records, missing fields, unknown fields and symbols', () => {
    for (const input of [null, undefined, true, 1, 'join-room', [], [join], new Date(), new Map(), Object.create(join), {}, { ...join, type: 'secret-input' }]) rejected(input);
    for (const key of Object.keys(join)) {
      const input: Record<string, unknown> = { ...join };
      delete input[key];
      rejected(input);
    }
    for (const key of ['actorId', 'role', 'seed', 'private-secret-value', '__proto__']) {
      rejected({ ...join, [key]: 'private-secret-value' });
      expect(JSON.stringify(parseCommand({ ...join, [key]: 'private-secret-value' }))).not.toContain('private-secret-value');
    }
    rejected({ ...join, [Symbol('secret')]: true });
    rejected(Object.defineProperty({ ...join }, 'secret', { value: true }));
    rejected({ ...nominate, playerIds: Object.assign(['a', 'b'], { extra: true }) });
    rejected({ ...nominate, playerIds: Object.assign(['a', 'b'], { [Symbol()]: true }) });
  });

  it('does not invoke getters or expose thrown inspection errors', () => {
    let reads = 0;
    const input = { ...join, get displayName() { reads += 1; throw new Error('private-secret'); } };
    rejected(input);
    const tuple = ['a', 'b'];
    Object.defineProperty(tuple, '0', { get() { reads += 1; throw new Error('private-secret'); } });
    rejected({ ...nominate, playerIds: tuple });
    expect(reads).toBe(0);
    const proxy = new Proxy({}, { ownKeys() { throw new Error('private-secret'); } });
    expect(parseCommand(proxy)).toEqual({ ok: false, error: { code: 'invalid_command', path: '$' } });
    const revoked = Proxy.revocable({}, {});
    revoked.revoke();
    rejected(revoked.proxy);
  });
});
