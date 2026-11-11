export type Phase = 'ROUND_START' | 'VOTE_OPEN' | 'CREW_LOCKED'
  | 'OPERATION_LOCKED' | 'RESOLUTION' | 'CITY_MOMENT' | 'MATCH_END';
export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: {
    readonly code: 'invalid-input' | 'forbidden' | 'stale' | 'decision-required';
    readonly decisionId?: string;
  } };

type Vote = { readonly voterId: string; readonly candidateId: string };

// Read data properties only: malformed input must not execute caller getters.
function data(value: unknown, key: string): unknown {
  if (typeof value !== 'object' || value === null) return undefined;
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  return descriptor && 'value' in descriptor ? descriptor.value : undefined;
}

function id(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(value);
}

function items(value: unknown): unknown[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const result: unknown[] = [];
  for (let i = 0; i < value.length; i += 1) result.push(data(value, String(i)));
  return result;
}

function identities(value: unknown): Set<string> | undefined {
  const entries = items(value);
  if (!entries || !entries.every(id)) return undefined;
  const result = new Set(entries);
  return result.size === entries.length ? result : undefined;
}

export function recordCrewVote(input: {
  readonly phase: Phase; readonly revision: number; readonly expectedRevision: number;
  readonly actorId: string; readonly candidateId: string;
  readonly voterIds: readonly string[]; readonly eligibleCrewIds: readonly string[];
  readonly votes: readonly { readonly voterId: string; readonly candidateId: string }[];
}): Result<{ readonly revision: number; readonly votes: readonly Vote[] }> {
  const fail = (code: 'invalid-input' | 'forbidden' | 'stale'): Result<never> =>
    ({ ok: false, error: { code } });
  const phase = data(input, 'phase');
  const revision = data(input, 'revision');
  const expectedRevision = data(input, 'expectedRevision');
  const actorId = data(input, 'actorId');
  const candidateId = data(input, 'candidateId');
  const voters = identities(data(input, 'voterIds'));
  const candidates = identities(data(input, 'eligibleCrewIds'));
  const entries = items(data(input, 'votes'));
  if (typeof phase !== 'string' || ![
    'ROUND_START', 'VOTE_OPEN', 'CREW_LOCKED', 'OPERATION_LOCKED',
    'RESOLUTION', 'CITY_MOMENT', 'MATCH_END',
  ].includes(phase) || typeof revision !== 'number' || !Number.isSafeInteger(revision)
    || revision < 0 || revision === Number.MAX_SAFE_INTEGER
    || typeof expectedRevision !== 'number' || !Number.isSafeInteger(expectedRevision)
    || expectedRevision < 0 || expectedRevision === Number.MAX_SAFE_INTEGER
    || !id(actorId) || !id(candidateId) || !voters || !candidates || !entries) {
    return fail('invalid-input');
  }

  const votes: Vote[] = [];
  const recorded = new Set<string>();
  for (const entry of entries) {
    const voterId = data(entry, 'voterId');
    const target = data(entry, 'candidateId');
    if (!id(voterId) || !id(target) || recorded.has(voterId)) return fail('invalid-input');
    recorded.add(voterId);
    votes.push({ voterId, candidateId: target });
  }
  if (revision !== expectedRevision) return fail('stale');
  if (phase !== 'VOTE_OPEN' || !voters.has(actorId) || !candidates.has(candidateId)
    || recorded.has(actorId)) return fail('forbidden');
  votes.push({ voterId: actorId, candidateId });
  return { ok: true, value: { revision: revision + 1, votes } };
}
