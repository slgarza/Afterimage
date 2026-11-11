import { describe, expect, it } from 'vitest';
import { crewVoteView } from '../../src/parallel100/sealed-vote-view.js';

const votes = [
  { voterId: 'self', candidateId: 'own-choice', timeout: false },
  { voterId: 'other', candidateId: 'secret-choice', timeout: true },
];
const input = { sealed: true, resolved: false, recipientId: 'self', votes };
const invalid = { ok: false, error: { code: 'invalid-input' } };
const projectUnknown = (value: unknown) => crewVoteView(value as Parameters<typeof crewVoteView>[0]);

describe('crewVoteView', () => {
  it('keeps only the recipient choice before sealed resolution', () => {
    const result = crewVoteView(input);
    expect(result).toEqual({ ok: true, value: {
      castCount: 2, ownVote: { candidateId: 'own-choice', timeout: false }, disclosedVotes: [],
    } });
    expect(JSON.stringify(result)).not.toContain('secret-choice');
    expect(JSON.stringify(result)).not.toContain('other');
    expect(crewVoteView({ ...input, recipientId: 'other' })).toEqual({ ok: true, value: {
      castCount: 2, ownVote: { candidateId: 'secret-choice', timeout: true }, disclosedVotes: [],
    } });
  });

  it('retains a generic count with no recipient vote and no alignment evidence', () => {
    const result = crewVoteView({ ...input, recipientId: 'absent' });
    expect(result).toEqual({ ok: true, value: { castCount: 2, ownVote: null, disclosedVotes: [] } });
    expect(crewVoteView({ ...input, recipientId: 'absent', votes: votes.map(v => ({
      ...v, candidateId: 'different', alignment: 'private',
    })) })).toEqual(result);
    expect(crewVoteView({ ...input, votes: [] })).toEqual({
      ok: true, value: { castCount: 0, ownVote: null, disclosedVotes: [] },
    });
  });

  it.each([[true, true], [false, false], [false, true]])(
    'discloses the allowlisted ledger when sealed=%s resolved=%s', (sealed, resolved) => {
      const result = crewVoteView({ ...input, sealed, resolved, votes: votes.map(v => ({
        ...v, role: 'private', metadata: { secret: true },
      })) });
      expect(result).toEqual({ ok: true, value: {
        castCount: 2, ownVote: { candidateId: 'own-choice', timeout: false }, disclosedVotes: votes,
      } });
      expect(JSON.stringify(result)).not.toContain('private');
    },
  );

  it('returns independent records without modifying frozen inputs', () => {
    const frozen = Object.freeze({ ...input, resolved: true,
      votes: Object.freeze(votes.map(v => Object.freeze({ ...v }))),
    });
    const before = JSON.stringify(frozen);
    const result = crewVoteView(frozen);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected valid view');
    expect(result.value.disclosedVotes).not.toBe(frozen.votes);
    expect(result.value.disclosedVotes[0]).not.toBe(frozen.votes[0]);
    expect(result.value.ownVote).not.toBe(result.value.disclosedVotes[0]);
    Object.assign(result.value.ownVote!, { candidateId: 'changed' });
    Object.assign(result.value.disclosedVotes[0]!, { timeout: true });
    expect(JSON.stringify(frozen)).toBe(before);
    expect(crewVoteView(frozen)).not.toEqual(result);
  });

  it.each(['', 'a'.repeat(65), 'with space', 'é', 'id\n'])('rejects invalid IDs %j everywhere', id => {
    expect(crewVoteView({ ...input, recipientId: id })).toEqual(invalid);
    for (const key of ['voterId', 'candidateId']) {
      expect(projectUnknown({ ...input, votes: [{ ...votes[0], [key]: id }] })).toEqual(invalid);
    }
  });

  it('accepts the exact identity bounds and repeated candidates', () => {
    const id = 'A_0-'.repeat(16);
    expect(crewVoteView({ ...input, recipientId: id, votes: [
      { voterId: id, candidateId: 'x', timeout: true },
      { voterId: 'x', candidateId: 'x', timeout: false },
    ] })).toEqual({ ok: true, value: {
      castCount: 2, ownVote: { candidateId: 'x', timeout: true }, disclosedVotes: [],
    } });
  });

  it('rejects duplicates and malformed records without echoing or mutating them', () => {
    const cases: unknown[] = [null, undefined, {}, [],
      { ...input, sealed: 1 }, { ...input, resolved: 'false' },
      { ...input, recipientId: 1 }, { ...input, votes: {} },
      ...[null, {}, { ...votes[0], timeout: 1 }, { ...votes[0], candidateId: null }]
        .map(vote => ({ ...input, votes: [vote] })),
      { ...input, votes: [votes[0], votes[0]] },
      { ...input, votes: new Array(1) },
    ];
    for (const value of cases) {
      const before = JSON.stringify(value);
      expect(projectUnknown(value)).toEqual(invalid);
      expect(JSON.stringify(value)).toBe(before);
    }
  });

  it('never invokes accessors or string conversions at the decoder boundary', () => {
    let calls = 0;
    const getter = () => { calls += 1; throw new Error('private'); };
    for (const key of ['sealed', 'resolved', 'recipientId', 'votes']) {
      expect(projectUnknown(Object.defineProperty({ ...input }, key, { get: getter }))).toEqual(invalid);
    }
    for (const key of ['voterId', 'candidateId', 'timeout']) {
      const vote = Object.defineProperty({ ...votes[0] }, key, { get: getter });
      expect(projectUnknown({ ...input, votes: [vote] })).toEqual(invalid);
    }
    const accessorArray = Object.defineProperty([votes[0]], '0', { get: getter });
    expect(projectUnknown({ ...input, votes: accessorArray })).toEqual(invalid);
    expect(projectUnknown({ ...input, recipientId: { toString: getter } })).toEqual(invalid);
    expect(projectUnknown(Object.create(input))).toEqual(invalid);
    expect(calls).toBe(0);
  });
});
