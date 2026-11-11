import { nextRandom } from '../index.js';

export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: {
      readonly code: 'invalid-input' | 'forbidden' | 'stale' | 'decision-required';
      readonly decisionId?: string;
    } };

type Candidate = {
  readonly id: string;
  readonly votes: number;
  readonly lastCrewRound: number | null;
};
type Draw = { readonly candidates: readonly string[]; readonly selectedId: string };

// Read data properties only: malformed boundary values must not execute getters.
function field(value: unknown, key: PropertyKey): unknown {
  if (typeof value !== 'object' || value === null) return undefined;
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  return descriptor && 'value' in descriptor ? descriptor.value : undefined;
}

function nonnegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

/** Resolve each seat from the remaining, already eligible candidate pool. */
export function selectRepairCrew(input: {
  readonly candidates: readonly Candidate[];
  readonly currentRound: number;
  readonly rng: { readonly value: number };
}): Result<{
  readonly crewIds: readonly [string, string];
  readonly draws: readonly Draw[];
  readonly rng: { readonly value: number };
}> {
  const invalid = { ok: false, error: { code: 'invalid-input' } } as const;
  const currentRound = field(input, 'currentRound');
  const rngValue = field(field(input, 'rng'), 'value');
  const candidates = field(input, 'candidates');
  if (!nonnegativeInteger(currentRound) || !nonnegativeInteger(rngValue)
    || rngValue > 0xffffffff || !Array.isArray(candidates)) return invalid;

  const remaining: Candidate[] = [];
  const ids = new Set<string>();
  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = field(candidates, index);
    const id = field(candidate, 'id');
    const votes = field(candidate, 'votes');
    const lastCrewRound = field(candidate, 'lastCrewRound');
    if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(id)
      || ids.has(id) || !nonnegativeInteger(votes)
      || (lastCrewRound !== null
        && (!nonnegativeInteger(lastCrewRound) || lastCrewRound > currentRound))) return invalid;
    ids.add(id);
    remaining.push({ id, votes, lastCrewRound });
  }
  if (remaining.length < 2) {
    return { ok: false, error: { code: 'decision-required', decisionId: 'D-ELIGIBLE-POOL' } };
  }

  let rng = { value: rngValue };
  const draws: Draw[] = [];
  function chooseSeat(): string {
    let tied: Candidate[] = [];
    let bestVotes = -1;
    let oldest = Infinity;
    for (const candidate of remaining) {
      const history = candidate.lastCrewRound ?? -1;
      if (candidate.votes > bestVotes || (candidate.votes === bestVotes && history < oldest)) {
        bestVotes = candidate.votes;
        oldest = history;
        tied = [candidate];
      } else if (candidate.votes === bestVotes && history === oldest) {
        tied.push(candidate);
      }
    }
    // The validated pool has at least one member for each of the two calls.
    let selected = tied[0]!;
    if (tied.length > 1) {
      const [random, next] = nextRandom(rng);
      rng = next;
      selected = tied[Math.floor(random * tied.length)]!;
      draws.push({ candidates: tied.map(candidate => candidate.id), selectedId: selected.id });
    }
    remaining.splice(remaining.findIndex(candidate => candidate.id === selected.id), 1);
    return selected.id;
  }

  const crewIds: readonly [string, string] = [chooseSeat(), chooseSeat()];
  return { ok: true, value: { crewIds, draws, rng } };
}
