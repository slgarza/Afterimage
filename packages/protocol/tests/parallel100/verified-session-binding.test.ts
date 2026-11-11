import { describe, expect, it } from 'vitest';
import { bindVerifiedPrincipal } from '../../src/parallel100/verified-session-binding.js';

type Input = Parameters<typeof bindVerifiedPrincipal>[0];
const memberships = [
  { subjectId: 'subject-one', playerId: 'player-one', active: true },
  { subjectId: 'subject-two', playerId: 'player-two', active: false },
];
const input: Input = { verifiedPrincipal: { subjectId: 'subject-one' }, memberships };
const forbidden = { ok: false, error: { code: 'forbidden' } };

function rejects(value: unknown): void {
  expect(bindVerifiedPrincipal(value as Input)).toEqual(forbidden);
}

describe('bindVerifiedPrincipal', () => {
  it('binds each subject to its existing player regardless of colliding display aliases', () => {
    const aliased = memberships.map((member) => ({ ...member, alias: 'Same alias' }));
    for (const member of memberships) {
      expect(bindVerifiedPrincipal({
        verifiedPrincipal: { subjectId: member.subjectId }, memberships: aliased,
      })).toEqual({ ok: true, value: { playerId: member.playerId, active: member.active } });
    }
    rejects({ verifiedPrincipal: { subjectId: 'Same_alias' }, memberships: aliased });
    rejects({ verifiedPrincipal: { alias: 'Same alias' }, memberships: aliased });
  });

  it('retains spectator status and returns detached authority data', () => {
    const member = Object.freeze({ subjectId: 'spectator', playerId: 'seat_9', active: false });
    const request = Object.freeze({
      verifiedPrincipal: Object.freeze({ subjectId: 'spectator' }),
      memberships: Object.freeze([member]),
    });
    const result = bindVerifiedPrincipal(request);
    expect(result).toEqual({ ok: true, value: { playerId: 'seat_9', active: false } });
    if (result.ok) {
      expect(result.value).not.toBe(member);
      Object.assign(result.value, { active: true });
    }
    expect(member.active).toBe(false);
    expect(bindVerifiedPrincipal(request)).toEqual({ ok: true, value: { playerId: 'seat_9', active: false } });
  });

  it('uses the same fixed public failure for missing, unknown and ambiguous membership', () => {
    rejects({ ...input, verifiedPrincipal: null });
    rejects({ ...input, verifiedPrincipal: { subjectId: 'private-unknown' } });
    rejects({ ...input, memberships: [] });
    for (const extra of [
      memberships[0],
      { subjectId: 'subject-one', playerId: 'different', active: false },
      { subjectId: 'different', playerId: 'player-one', active: false },
      // Ambiguity elsewhere also invalidates the membership table.
      { subjectId: 'subject-two', playerId: 'different', active: true },
      { subjectId: 'different', playerId: 'player-two', active: true },
    ]) rejects({ ...input, memberships: [...memberships, extra] });
  });

  it('validates bounded ASCII identities and actual booleans without coercion', () => {
    for (const id of ['', 'a'.repeat(65), 'has space', 'é', 'a\n', null, 2, {}, undefined]) {
      rejects({ ...input, verifiedPrincipal: { subjectId: id } });
      for (const key of ['subjectId', 'playerId']) {
        rejects({ ...input, memberships: [{ ...memberships[0], [key]: id }] });
      }
    }
    const id = 'A_9-'.repeat(16);
    expect(bindVerifiedPrincipal({ verifiedPrincipal: { subjectId: id }, memberships: [
      { subjectId: id, playerId: id, active: true },
    ] })).toEqual({ ok: true, value: { playerId: id, active: true } });
    for (const active of [0, 1, 'false', null, undefined]) {
      rejects({ ...input, memberships: [{ ...memberships[0], active }] });
    }
  });

  it('fails closed on malformed runtime input and inherited identity fields', () => {
    for (const value of [null, undefined, 1, 'token', [], {}, { ...input, memberships: {} },
      { ...input, memberships: new Array(1) },
      { ...input, verifiedPrincipal: Object.create({ subjectId: 'subject-one' }) },
      { ...input, memberships: [Object.create(memberships[0] as object)] },
    ]) rejects(value);
  });

  it('never invokes input getters or conversions and contains inspection failures', () => {
    let calls = 0;
    const getter = () => { calls += 1; throw new Error('private-identity'); };
    const accessor = (base: object, key: string) => Object.defineProperty(base, key, { get: getter });
    rejects(accessor({ ...input }, 'verifiedPrincipal'));
    rejects(accessor({ ...input }, 'memberships'));
    rejects({ ...input, verifiedPrincipal: accessor({}, 'subjectId') });
    for (const key of ['subjectId', 'playerId', 'active']) {
      rejects({ ...input, memberships: [accessor({ ...memberships[0] }, key)] });
    }
    rejects({ ...input, memberships: accessor([...memberships], '0') });
    rejects({ ...input, verifiedPrincipal: { subjectId: { toString: getter } } });
    expect(calls).toBe(0);
    rejects(new Proxy({}, { getOwnPropertyDescriptor: getter }));
    const revoked = Proxy.revocable({}, {});
    revoked.revoke();
    rejects(revoked.proxy);
  });
});
