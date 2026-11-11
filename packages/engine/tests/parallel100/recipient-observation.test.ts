import { describe, expect, it } from 'vitest';
import { recipientObservation, type Phase } from '../../src/parallel100/recipient-observation.js';

type Input = Parameters<typeof recipientObservation>[0];
const phases: Phase[] = ['ROUND_START', 'VOTE_OPEN', 'CREW_LOCKED', 'OPERATION_LOCKED',
  'RESOLUTION', 'CITY_MOMENT', 'MATCH_END'];
function fixture(): Input {
  return {
    recipientId: 'a', phase: 'CREW_LOCKED', matchEnded: false, recipientIsOperator: true,
    players: [
      { id: 'a', alias: 'Echo', avatarKey: 'one', active: true, role: 'archivist' },
      { id: 'b', alias: 'Echo', avatarKey: 'two', active: true, role: 'static-operative' },
      { id: 'c', alias: '光', avatarKey: 'three', active: false, role: 'null' },
    ],
    ownDiagnostic: { kind: 'route', safeOptionId: 'safe', corruptedOptionId: 'corrupt' },
  };
}
function value(input: Input) {
  const result = recipientObservation(input);
  if (!result.ok) throw new Error('Expected observation');
  return result.value;
}
function rejects(input: unknown) {
  expect(recipientObservation(input as Input)).toEqual({ ok: false, error: { code: 'invalid-input' } });
}

describe('recipientObservation', () => {
  it.each(phases)('projects exact role visibility in %s', (phase) => {
    const input = { ...fixture(), phase, matchEnded: phase === 'MATCH_END' };
    const view = value(input);
    expect(view.ownRole).toBe('archivist');
    expect(view.players).toEqual(input.players.map(({ role, ...player }) => ({
      ...player, revealedRole: input.matchEnded ? role : null,
    })));
    if (!input.matchEnded) expect(JSON.stringify(view)).not.toContain('static-operative');
  });

  it.each(phases.flatMap((phase) => [true, false].flatMap((active) =>
    [true, false].map((recipientIsOperator) => ({ phase, active, recipientIsOperator }))))) (
    'gates diagnostics for $phase active=$active operator=$recipientIsOperator',
    ({ phase, active, recipientIsOperator }) => {
      const input = fixture();
      const view = value({ ...input, phase, matchEnded: phase === 'MATCH_END', recipientIsOperator,
        players: input.players.map((player) => ({ ...player, active })) });
      expect(view.ownDiagnostic).toEqual(active && recipientIsOperator
        && (phase === 'CREW_LOCKED' || phase === 'OPERATION_LOCKED') ? input.ownDiagnostic : null);
    },
  );

  it('supports null and gate diagnostics and spectator own roles', () => {
    expect(value({ ...fixture(), ownDiagnostic: null }).ownDiagnostic).toBeNull();
    const diagnostic = { kind: 'gate', safeOptionId: 'left', corruptedOptionId: 'right' } as const;
    expect(value({ ...fixture(), ownDiagnostic: diagnostic }).ownDiagnostic).toEqual(diagnostic);
    const spectator = value({ ...fixture(), recipientId: 'c' });
    expect(spectator.ownRole).toBe('null');
    expect(spectator.ownDiagnostic).toBeNull();
  });

  it.each(phases)('rejects inconsistent terminal signals in %s before reading players', (phase) => {
    let calls = 0;
    const input = { ...fixture(), phase, matchEnded: phase !== 'MATCH_END' };
    Object.defineProperty(input, 'players', { get() { calls++; throw new Error('secret'); } });
    rejects(input);
    expect(calls).toBe(0);
  });

  it('rejects absent, duplicate, malformed and sparse players', () => {
    const input = fixture();
    rejects({ ...input, recipientId: 'missing' });
    rejects({ ...input, players: [...input.players, input.players[0]] });
    rejects({ ...input, players: [...input.players, input.players[1]] });
    rejects({ ...input, players: [] });
    rejects({ ...input, players: new Array(3) });
    for (const patch of [
      { id: '' }, { id: 'x'.repeat(65) }, { id: 'a.b' }, { id: 1 },
      { alias: null }, { avatarKey: {} }, { active: 1 }, { role: 'unknown' }, { role: null },
    ]) rejects({ ...input, players: [{ ...input.players[0], ...patch }, ...input.players.slice(1)] });
  });

  it('rejects malformed envelopes and diagnostics without echoing private inputs', () => {
    for (const input of [null, undefined, {}, [], 'secret',
      ...[{ phase: 'secret' }, { matchEnded: 1 }, { recipientId: ' a' },
        { recipientIsOperator: 'yes' }, { players: {} }, { ownDiagnostic: undefined },
        { ownDiagnostic: { kind: 'secret', safeOptionId: 's', corruptedOptionId: 'c' } },
        { ownDiagnostic: { kind: 'route', safeOptionId: 1, corruptedOptionId: 'c' } },
        { ownDiagnostic: { kind: 'gate', safeOptionId: 's' } },
      ].map((patch) => ({ ...fixture(), ...patch })),
    ]) rejects(input);
  });

  it('never invokes accessors or string conversion at any boundary', () => {
    let calls = 0;
    const getter = { get() { calls++; return 'secret'; } };
    for (const key of Object.keys(fixture())) {
      rejects(Object.defineProperty(fixture(), key, getter));
    }
    for (const key of ['id', 'alias', 'avatarKey', 'active', 'role']) {
      const input = fixture();
      rejects({ ...input, players: [Object.defineProperty({ ...input.players[0] }, key, getter)] });
    }
    for (const key of ['kind', 'safeOptionId', 'corruptedOptionId']) {
      rejects({ ...fixture(), ownDiagnostic: Object.defineProperty({ ...fixture().ownDiagnostic }, key, getter) });
    }
    const players = [...fixture().players];
    Object.defineProperty(players, '0', getter);
    rejects({ ...fixture(), players });
    rejects({ ...fixture(), recipientId: { toString() { calls++; return 'a'; } } });
    expect(calls).toBe(0);
  });

  it('allowlists and detaches every output for identical human and bot consumers', () => {
    const base = fixture();
    const input = {
      ...base, serverSeed: 'private seed', rawAudit: ['private audit'], otherDiagnostics: ['private'],
      players: base.players.map((player) => Object.freeze({ ...player, secret: 'private role history' })),
      ownDiagnostic: Object.freeze({ ...base.ownDiagnostic!, secret: 'private diagnostic history' }),
    };
    Object.freeze(input.players);
    Object.freeze(input);
    const view = value(input);
    expect(Object.keys(view)).toEqual(['recipientId', 'players', 'ownRole', 'ownDiagnostic']);
    expect(Object.keys(view.players[0]!)).toEqual(['id', 'alias', 'avatarKey', 'active', 'revealedRole']);
    expect(Object.keys(view.ownDiagnostic!)).toEqual(['kind', 'safeOptionId', 'corruptedOptionId']);
    expect(JSON.stringify(view)).not.toContain('private');
    expect(view.players).not.toBe(input.players);
    expect(view.players[0]).not.toBe(input.players[0]);
    expect(view.ownDiagnostic).not.toBe(input.ownDiagnostic);
    expect(value({ ...input, consumer: 'human' } as Input)).toEqual(value({ ...input, consumer: 'bot' } as Input));
    Object.assign(view.players[0]!, { alias: 'Changed' });
    Object.assign(view.ownDiagnostic!, { safeOptionId: 'changed' });
    expect(value(input).players[0]?.alias).toBe('Echo');
    expect(value(input).ownDiagnostic?.safeOptionId).toBe('safe');
  });
});
