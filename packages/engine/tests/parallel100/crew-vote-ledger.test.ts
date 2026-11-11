import { describe, expect, it } from 'vitest';
import { recordCrewVote, type Phase } from '../../src/parallel100/crew-vote-ledger.js';

type Input = Parameters<typeof recordCrewVote>[0];
function input(): Input {
  return {
    phase: 'VOTE_OPEN', revision: 7, expectedRevision: 7,
    actorId: 'voter-2', candidateId: 'crew_1',
    voterIds: ['voter-1', 'voter-2'], eligibleCrewIds: ['crew_1', 'crew_2'],
    votes: [{ voterId: 'voter-1', candidateId: 'crew_2' }],
  };
}
function freeze(value: Input): Input {
  value.votes.forEach(Object.freeze);
  Object.freeze(value.votes);
  Object.freeze(value.voterIds);
  Object.freeze(value.eligibleCrewIds);
  return Object.freeze(value);
}

describe('recordCrewVote', () => {
  it('appends one private vote, increments once and detaches all output records', () => {
    const original = freeze(input());
    const before = JSON.stringify(original);
    const result = recordCrewVote(original);
    expect(result).toEqual({ ok: true, value: { revision: 8, votes: [
      { voterId: 'voter-1', candidateId: 'crew_2' },
      { voterId: 'voter-2', candidateId: 'crew_1' },
    ] } });
    expect(recordCrewVote(original)).toEqual(result);
    expect(JSON.stringify(original)).toBe(before);
    if (!result.ok) throw new Error('Expected vote');
    expect(result.value.votes).not.toBe(original.votes);
    expect(result.value.votes[0]).not.toBe(original.votes[0]);
  });

  it('supports the first vote at revision zero and the last safe increment', () => {
    for (const revision of [0, Number.MAX_SAFE_INTEGER - 1]) {
      const result = recordCrewVote({ ...input(), votes: [], revision, expectedRevision: revision });
      expect(result.ok && result.value.revision).toBe(revision + 1);
      expect(result.ok && result.value.votes).toEqual([{ voterId: 'voter-2', candidateId: 'crew_1' }]);
    }
  });

  const phases: Phase[] = ['ROUND_START', 'CREW_LOCKED', 'OPERATION_LOCKED',
    'RESOLUTION', 'CITY_MOMENT', 'MATCH_END'];
  const denied: Partial<Input>[] = [
    ...phases.map((phase) => ({ phase })),
    { revision: 6 }, { expectedRevision: 8 },
    { actorId: 'outsider' }, { candidateId: 'outsider' },
    { actorId: 'voter-1', candidateId: 'crew_2' },
    { actorId: 'voter-1', candidateId: 'crew_1' },
  ];
  it.each(denied)('rejects a disallowed tap without modifying input: %j', (patch) => {
    const value = freeze({ ...input(), ...patch });
    const before = JSON.stringify(value);
    const result = recordCrewVote(value);
    expect(result).toEqual({ ok: false, error: {
      code: value.revision !== value.expectedRevision ? 'stale' : 'forbidden',
    } });
    expect(JSON.stringify(value)).toBe(before);
  });

  it('locks subsequent taps using the returned ledger, including identical taps', () => {
    const first = recordCrewVote(input());
    if (!first.ok) throw new Error('Expected vote');
    for (const candidateId of ['crew_1', 'crew_2']) {
      const value = freeze({ ...input(), ...first.value, expectedRevision: 8, candidateId });
      expect(recordCrewVote(value)).toEqual({ ok: false, error: { code: 'forbidden' } });
    }
  });

  const malformed: unknown[] = [null, undefined, {},
    ...['', 'a'.repeat(65), 'a.b', 'é', 'a\n'].flatMap((bad) => [
      { ...input(), actorId: bad }, { ...input(), candidateId: bad },
      { ...input(), voterIds: [bad] }, { ...input(), eligibleCrewIds: [bad] },
      { ...input(), votes: [{ voterId: bad, candidateId: 'crew_1' }] },
      { ...input(), votes: [{ voterId: 'voter-1', candidateId: bad }] },
    ]),
    ...[-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER + 1, '7'].flatMap(
      (bad) => [{ ...input(), revision: bad }, { ...input(), expectedRevision: bad }],
    ),
    { ...input(), phase: 'UNKNOWN' },
    { ...input(), candidateId: true }, { ...input(), candidateId: ['crew_1', 'crew_2'] },
    { ...input(), voterIds: ['voter-2', 'voter-2'] },
    { ...input(), eligibleCrewIds: ['crew_1', 'crew_1'] },
    { ...input(), votes: [null] }, { ...input(), votes: {} },
    { ...input(), votes: Array(1) },
    ...['crew_1', 'crew_2'].map((candidateId) => ({ ...input(), votes: [
      { voterId: 'voter-1', candidateId: 'crew_1' },
      { voterId: 'voter-1', candidateId },
    ] })),
  ];
  it.each(malformed)('rejects malformed runtime input without echoing it: %j', (value) => {
    expect(recordCrewVote(value as Input)).toEqual({ ok: false, error: { code: 'invalid-input' } });
  });

  it('does not invoke property getters or string conversion on malformed input', () => {
    const explode = () => { throw new Error('Caller code ran'); };
    for (const key of Object.keys(input())) {
      const value = Object.defineProperty({ ...input() }, key, { get: explode });
      expect(recordCrewVote(value)).toEqual({ ok: false, error: { code: 'invalid-input' } });
    }
    const vote = Object.defineProperty({ candidateId: 'crew_1' }, 'voterId', { get: explode });
    const votes = Object.defineProperty([], '0', { get: explode });
    for (const value of [
      { ...input(), votes: [vote] }, { ...input(), votes },
      { ...input(), actorId: { toString: explode } },
    ]) {
      expect(recordCrewVote(value as unknown as Input)).toEqual({ ok: false, error: { code: 'invalid-input' } });
    }
  });
});
