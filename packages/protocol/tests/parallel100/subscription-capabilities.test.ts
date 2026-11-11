import { describe, expect, it } from 'vitest';
import { subscriptionCapabilities } from '../../src/parallel100/subscription-capabilities.js';

type Input = Parameters<typeof subscriptionCapabilities>[0];
const member: Input = {
  boundPlayerId: 'player_1', roomPlayerIds: ['player_1', 'player-2'],
  active: true, connectionGeneration: 3, subscriptionGeneration: 3,
};
const revoked = { ok: true, value: {
  publicView: false, privateDiagnostics: false, chatWrite: false, revokeSubscription: true,
} };
const invalid = { ok: false, error: { code: 'invalid-input' } };
const runtime = (input: unknown) => subscriptionCapabilities(input as Input);

describe('subscriptionCapabilities', () => {
  it('grants active member ceilings and only public watching to an inactive spectator', () => {
    expect(subscriptionCapabilities(member)).toEqual({ ok: true, value: {
      publicView: true, privateDiagnostics: true, chatWrite: true, revokeSubscription: false,
    } });
    expect(subscriptionCapabilities({ ...member, active: false })).toEqual({ ok: true, value: {
      publicView: true, privateDiagnostics: false, chatWrite: false, revokeSubscription: false,
    } });
  });

  it.each([null, 'removed'])('revokes absent bound membership %s', (boundPlayerId) => {
    expect(subscriptionCapabilities({ ...member, boundPlayerId })).toEqual(revoked);
  });

  it('revokes removed membership and empty rosters even on the current generation', () => {
    expect(subscriptionCapabilities({ ...member, roomPlayerIds: ['player-2'] })).toEqual(revoked);
    expect(subscriptionCapabilities({ ...member, roomPlayerIds: [] })).toEqual(revoked);
  });

  it.each([false, true])('cannot reuse a reconnect subscription (active=%s)', (active) => {
    expect(subscriptionCapabilities({ ...member, active, connectionGeneration: 4 })).toEqual(revoked);
    expect(subscriptionCapabilities({ ...member, active, subscriptionGeneration: 4 })).toEqual(revoked);
    expect(subscriptionCapabilities({ ...member, active, connectionGeneration: 4, subscriptionGeneration: 4 }))
      .toEqual({ ok: true, value: { publicView: true, privateDiagnostics: active, chatWrite: active, revokeSubscription: false } });
  });

  it.each(['', 'a'.repeat(65), 'white space', 'é', 'line\n', 'a/b', 1, undefined])('rejects malformed identity %s', (id) => {
    expect(runtime({ ...member, boundPlayerId: id })).toEqual(invalid);
    expect(runtime({ ...member, roomPlayerIds: [id] })).toEqual(invalid);
  });

  it('accepts ID and generation boundaries without returning identity or roles', () => {
    for (const id of ['a', 'A_-09', 'a'.repeat(64)]) {
      for (const generation of [0, Number.MAX_SAFE_INTEGER]) {
        expect(subscriptionCapabilities({ ...member, boundPlayerId: id, roomPlayerIds: [id],
          connectionGeneration: generation, subscriptionGeneration: generation })).toEqual(subscriptionCapabilities(member));
      }
    }
  });

  it.each([-1, 0.5, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1, '3', null])('rejects unsafe generation %s', (generation) => {
    expect(runtime({ ...member, connectionGeneration: generation })).toEqual(invalid);
    expect(runtime({ ...member, subscriptionGeneration: generation })).toEqual(invalid);
  });

  it('rejects duplicates and sparse arrays before any revocation decision', () => {
    expect(runtime({ ...member, boundPlayerId: null, roomPlayerIds: ['a', 'a'] })).toEqual(invalid);
    expect(runtime({ ...member, roomPlayerIds: new Array(2) })).toEqual(invalid);
  });

  it.each([null, undefined, false, [], {}, { ...member, active: 1 }, { ...member, roomPlayerIds: 'player_1' }])('fails safely on malformed input %#', (input) => {
    expect(runtime(input)).toEqual(invalid);
  });

  it('does not invoke caller getters or conversions and catches inspection failures', () => {
    let reads = 0;
    const getter = () => { reads += 1; throw new Error('private payload'); };
    expect(runtime(Object.defineProperty({ ...member }, 'boundPlayerId', { get: getter }))).toEqual(invalid);
    expect(runtime({ ...member, roomPlayerIds: Object.defineProperty(['player_1'], '0', { get: getter }) })).toEqual(invalid);
    expect(runtime({ ...member, boundPlayerId: { toString: getter } })).toEqual(invalid);
    expect(runtime(new Proxy(member, { getOwnPropertyDescriptor: getter }))).toEqual(invalid);
    // Only the explicitly installed reflection trap executes, never accessors/conversions.
    expect(reads).toBe(1);
  });

  it('preserves frozen input and produces independent deterministic outputs', () => {
    const input = Object.freeze({ ...member, roomPlayerIds: Object.freeze([...member.roomPlayerIds]) });
    const first = subscriptionCapabilities(input);
    const second = subscriptionCapabilities(input);
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    if (first.ok && second.ok) expect(first.value).not.toBe(second.value);
    expect(input).toEqual(member);
  });
});
