export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: {
      readonly code: 'invalid-input' | 'forbidden' | 'stale' | 'decision-required';
      readonly decisionId?: string;
    } };

type Vote = { readonly voterId: string; readonly candidateId: string; readonly timeout: boolean };
type OwnVote = { readonly candidateId: string; readonly timeout: boolean };
type View = {
  readonly castCount: number;
  readonly ownVote: OwnVote | null;
  readonly disclosedVotes: readonly Vote[];
};

// Decode only own data properties: never evaluate submitted accessors or coercions.
function field(input: unknown, key: string): unknown {
  if (typeof input !== 'object' || input === null) return undefined;
  const descriptor = Object.getOwnPropertyDescriptor(input, key);
  return descriptor && 'value' in descriptor ? descriptor.value : undefined;
}

function isId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(value);
}

export function crewVoteView(input: {
  readonly sealed: boolean; readonly resolved: boolean; readonly recipientId: string;
  readonly votes: readonly Vote[];
}): Result<View> {
  const invalid = (): Result<View> => ({ ok: false, error: { code: 'invalid-input' } });
  try {
    const sealed = field(input, 'sealed');
    const resolved = field(input, 'resolved');
    const recipientId = field(input, 'recipientId');
    const votes = field(input, 'votes');
    if (typeof sealed !== 'boolean' || typeof resolved !== 'boolean'
      || !isId(recipientId) || !Array.isArray(votes)) return invalid();

    const length = field(votes, 'length');
    if (typeof length !== 'number' || !Number.isSafeInteger(length) || length < 0) return invalid();
    const voters = new Set<string>();
    const disclosedVotes: Vote[] = [];
    let ownVote: OwnVote | null = null;
    for (let index = 0; index < length; index += 1) {
      const vote = field(votes, String(index));
      const voterId = field(vote, 'voterId');
      const candidateId = field(vote, 'candidateId');
      const timeout = field(vote, 'timeout');
      if (!isId(voterId) || !isId(candidateId) || typeof timeout !== 'boolean'
        || voters.has(voterId)) return invalid();
      voters.add(voterId);
      if (voterId === recipientId) ownVote = { candidateId, timeout };
      if (!sealed || resolved) disclosedVotes.push({ voterId, candidateId, timeout });
    }
    return { ok: true, value: { castCount: length, ownVote, disclosedVotes } };
  } catch {
    return invalid();
  }
}
