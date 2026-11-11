export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: {
      readonly code: 'invalid-input' | 'forbidden' | 'stale' | 'decision-required';
      readonly decisionId?: string;
    } };

// Read data properties only: malformed decoder input must not execute getters.
function dataProperty(value: unknown, key: PropertyKey): unknown {
  if (typeof value !== 'object' || value === null) return undefined;
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  return descriptor && 'value' in descriptor ? descriptor.value : undefined;
}

export function roundCapabilities(input: {
  readonly players: readonly {
    readonly id: string;
    readonly active: boolean;
    readonly jammed: boolean;
    readonly crewCooldown: boolean;
  }[];
}): Result<{
  readonly players: readonly {
    readonly id: string;
    readonly mayVote: boolean;
    readonly mayServe: boolean;
    readonly mayChat: boolean;
  }[];
  readonly eligibleCrewIds: readonly string[];
  readonly unresolvedDecision: 'D-ELIGIBLE-POOL' | null;
}> {
  const invalid = { ok: false, error: { code: 'invalid-input' } } as const;
  try {
    const source: unknown = dataProperty(input, 'players');
    if (!Array.isArray(source)) return invalid;
    const length = dataProperty(source, 'length');
    if (typeof length !== 'number') return invalid;
    const ids = new Set<string>();
    const players = [];
    const eligibleCrewIds: string[] = [];
    for (let index = 0; index < length; index += 1) {
      const player = dataProperty(source, String(index));
      const id = dataProperty(player, 'id');
      const active = dataProperty(player, 'active');
      const jammed = dataProperty(player, 'jammed');
      const crewCooldown = dataProperty(player, 'crewCooldown');
      if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(id)
        || ids.has(id) || typeof active !== 'boolean'
        || typeof jammed !== 'boolean' || typeof crewCooldown !== 'boolean') return invalid;
      ids.add(id);
      const mayVote = active && !jammed;
      const mayServe = mayVote && !crewCooldown;
      players.push({ id, mayVote, mayServe, mayChat: active });
      if (mayServe) eligibleCrewIds.push(id);
    }
    return {
      ok: true,
      value: {
        players,
        eligibleCrewIds,
        unresolvedDecision: eligibleCrewIds.length < 2 ? 'D-ELIGIBLE-POOL' : null,
      },
    };
  } catch {
    return invalid;
  }
}
