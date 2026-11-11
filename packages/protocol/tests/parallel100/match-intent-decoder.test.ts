import { describe, expect, it } from 'vitest';
import { decodeMatchIntent, type MatchIntent, type Result } from '../../src/parallel100/match-intent-decoder.js';

const intents: readonly MatchIntent[] = [
  { type: 'crew-vote', candidateId: 'p_1-Z', expectedRevision: 0 },
  { type: 'operation-choice', optionId: 'route-星', expectedRevision: 1 },
  { type: 'power-target', powerId: 'scan', targetId: 'p2', expectedRevision: 2 },
  { type: 'containment-vote', candidateId: 'p3', expectedRevision: 3 },
  { type: 'request-advance', expectedRevision: Number.MAX_SAFE_INTEGER },
];

function rejected(input: unknown): void {
  const result: Result<MatchIntent> = decodeMatchIntent(input);
  expect(result).toEqual({ ok: false, error: { code: 'invalid-input' } });
}

describe('decodeMatchIntent', () => {
  it('returns exact detached canonical intents without mutating inputs', () => {
    for (const intent of intents) {
      const input = Object.freeze({ ...intent });
      const result = decodeMatchIntent(input);
      expect(result).toEqual({ ok: true, value: intent });
      if (result.ok) expect(result.value).not.toBe(input);
      expect(decodeMatchIntent(Object.assign(Object.create(null), intent))).toEqual(result);
      const nonenumerable = Object.create(null) as object;
      for (const [key, value] of Object.entries(intent)) Object.defineProperty(nonenumerable, key, { value });
      expect(decodeMatchIntent(nonenumerable)).toEqual(result);
    }
    const input = { type: 'crew-vote', candidateId: 'original', expectedRevision: 0 };
    const result = decodeMatchIntent(input);
    input.candidateId = 'changed';
    expect(result).toEqual({ ok: true, value: { type: 'crew-vote', candidateId: 'original', expectedRevision: 0 } });
  });

  it('requires every exact data key and rejects authority and cross-variant fields', () => {
    for (const intent of intents) {
      for (const key of Object.keys(intent)) {
        const input: Record<string, unknown> = { ...intent };
        delete input[key];
        rejected(input);
      }
      for (const key of ['actor', 'actorId', 'role', 'seed', 'outcome', 'deadline', 'choice', 'repair', 'sabotage', 'playerIds', 'approve', 'approval', '__proto__', 'constructor', 'extra']) {
        rejected({ ...intent, [key]: 'private-submitted-value' });
      }
      for (const key of ['candidateId', 'optionId', 'powerId', 'targetId']) {
        if (!Object.hasOwn(intent, key)) rejected({ ...intent, [key]: 'p1' });
      }
      rejected(Object.defineProperty({ ...intent }, 'hidden', { value: true }));
      rejected({ ...intent, [Symbol('private')]: true });
    }
  });

  it('does not accept legacy actions, pair nominations, boolean approval or choice overrides', () => {
    for (const type of ['nominate-link', 'cast-link-vote', 'repair', 'sabotage', 'Repair', 'Sabotage', 'join-room', 'advance']) {
      rejected({ type, expectedRevision: 0 });
    }
    rejected({ type: 'nominate-link', playerIds: ['a', 'b'], expectedRevision: 0 });
    rejected({ type: 'cast-link-vote', approve: true, expectedRevision: 0 });
    for (const candidateId of [['a', 'b'], true, false]) rejected({ type: 'crew-vote', candidateId, expectedRevision: 0 });
    rejected({ type: 'operation-choice', choice: 'Repair', expectedRevision: 0 });
  });

  it('requires safe nonnegative revisions on all variants', () => {
    for (const intent of intents) {
      for (const expectedRevision of [-1, 0.1, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1, '0', null, undefined, true, 0n]) {
        rejected({ ...intent, expectedRevision });
      }
      for (const expectedRevision of [0, 1, Number.MAX_SAFE_INTEGER]) {
        expect(decodeMatchIntent({ ...intent, expectedRevision })).toEqual({ ok: true, value: { ...intent, expectedRevision } });
      }
    }
  });

  it('enforces the common player ID bounds for each player field', () => {
    for (const base of [intents[0]!, intents[2]!, intents[3]!]) {
      const field = base.type === 'power-target' ? 'targetId' : 'candidateId';
      for (const id of ['a', 'Z_9-'.repeat(16)]) expect(decodeMatchIntent({ ...base, [field]: id }).ok).toBe(true);
      for (const id of ['', 'a'.repeat(65), 'a b', 'é', 'a\n', ' a', null, 1, ['a']]) rejected({ ...base, [field]: id });
    }
  });

  it('bounds semantic IDs by Unicode scalars without inventing an option or power catalog', () => {
    for (const [base, field] of [[intents[1]!, 'optionId'], [intents[2]!, 'powerId']] as const) {
      for (const id of ['x', '🌙'.repeat(128), 'e\u0301', '\ud7ff\ue000', 'route/private']) {
        expect(decodeMatchIntent({ ...base, [field]: id })).toEqual({ ok: true, value: { ...base, [field]: id } });
      }
      for (const id of ['', 'x'.repeat(129), '🌙'.repeat(129), '\ud800', '\udfff', 'a\ud800b', null, 1, true, ['route']]) {
        rejected({ ...base, [field]: id });
      }
    }
  });

  it('rejects malformed records and custom prototypes without coercion', () => {
    for (const input of [null, undefined, true, 1, 'crew-vote', [], new Date(), new Map(), {}, Object.create(intents[0]!), Object.assign(Object.create({}), intents[0])]) rejected(input);
    let conversions = 0;
    const hostile = { toString() { conversions++; throw new Error('private'); } };
    rejected({ type: hostile, expectedRevision: 0 });
    rejected({ type: 'operation-choice', optionId: hostile, expectedRevision: 0 });
    expect(conversions).toBe(0);
  });

  it('never invokes accessors, including extra nonenumerable accessors', () => {
    let reads = 0;
    for (const intent of intents) {
      for (const key of [...Object.keys(intent), 'hidden']) {
        const input = Object.defineProperty({ ...intent }, key, {
          get() { reads++; throw new Error('private'); }, configurable: true,
        });
        rejected(input);
      }
      rejected(Object.defineProperty({ ...intent }, 'expectedRevision', { set() { reads++; } }));
    }
    expect(reads).toBe(0);
  });

  it('contains every inspection failure and never leaks thrown values', () => {
    for (const handler of [
      { getPrototypeOf() { throw new Error('private'); } },
      { ownKeys() { throw 'private'; } },
      { getOwnPropertyDescriptor() { throw { secret: 'private' }; } },
      { getOwnPropertyDescriptor() { return undefined; } },
    ]) rejected(new Proxy({ ...intents[0] }, handler));
    const revoked = Proxy.revocable({}, {});
    revoked.revoke();
    rejected(revoked.proxy);
    let reads = 0;
    const proxy = new Proxy({ ...intents[0] }, { get() { reads++; throw new Error('private'); } });
    expect(decodeMatchIntent(proxy)).toEqual({ ok: true, value: intents[0] });
    expect(reads).toBe(0);
  });
});
