export type Role = 'archivist' | 'static-operative' | 'null';
export type Phase = 'ROUND_START' | 'VOTE_OPEN' | 'CREW_LOCKED'
  | 'OPERATION_LOCKED' | 'RESOLUTION' | 'CITY_MOMENT' | 'MATCH_END';
export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: {
    readonly code: 'invalid-input' | 'forbidden' | 'stale' | 'decision-required';
    readonly decisionId?: string;
  } };

type Diagnostic = {
  readonly kind: 'route' | 'gate';
  readonly safeOptionId: string;
  readonly corruptedOptionId: string;
};
type Player = {
  readonly id: string; readonly alias: string; readonly avatarKey: string;
  readonly active: boolean; readonly role: Role;
};
type Observation = {
  readonly recipientId: string;
  readonly players: readonly {
    readonly id: string; readonly alias: string; readonly avatarKey: string;
    readonly active: boolean; readonly revealedRole: Role | null;
  }[];
  readonly ownRole: Role;
  readonly ownDiagnostic: Diagnostic | null;
};

// Only own data properties cross this boundary; never execute input accessors.
function field(value: unknown, key: string): unknown {
  if (typeof value !== 'object' || value === null) return undefined;
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  return descriptor && 'value' in descriptor ? descriptor.value : undefined;
}

function isId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(value);
}

function isRole(value: unknown): value is Role {
  return value === 'archivist' || value === 'static-operative' || value === 'null';
}

function isPhase(value: unknown): value is Phase {
  return value === 'ROUND_START' || value === 'VOTE_OPEN' || value === 'CREW_LOCKED'
    || value === 'OPERATION_LOCKED' || value === 'RESOLUTION'
    || value === 'CITY_MOMENT' || value === 'MATCH_END';
}

/** Projects an already recipient-scoped authority snapshot for any consumer. */
export function recipientObservation(input: {
  readonly recipientId: string; readonly phase: Phase;
  readonly players: readonly Player[];
  readonly ownDiagnostic: Diagnostic | null;
  readonly recipientIsOperator: boolean; readonly matchEnded: boolean;
}): Result<Observation> {
  const invalid = { ok: false, error: { code: 'invalid-input' } } as const;
  try {
    const phase = field(input, 'phase');
    const matchEnded = field(input, 'matchEnded');
    if (!isPhase(phase) || typeof matchEnded !== 'boolean'
      || (phase === 'MATCH_END') !== matchEnded) return invalid;

    const recipientId = field(input, 'recipientId');
    const operator = field(input, 'recipientIsOperator');
    const rawPlayers = field(input, 'players');
    if (!isId(recipientId) || typeof operator !== 'boolean' || !Array.isArray(rawPlayers)) {
      return invalid;
    }
    const length = field(rawPlayers, 'length');
    if (typeof length !== 'number' || !Number.isSafeInteger(length) || length < 1) return invalid;
    const players: Observation['players'][number][] = [];
    const ids = new Set<string>();
    let ownRole: Role | undefined;
    let active = false;
    for (let index = 0; index < length; index++) {
      const player = field(rawPlayers, String(index));
      const id = field(player, 'id');
      const alias = field(player, 'alias');
      const avatarKey = field(player, 'avatarKey');
      const playerActive = field(player, 'active');
      const role = field(player, 'role');
      if (!isId(id) || ids.has(id) || typeof alias !== 'string'
        || typeof avatarKey !== 'string' || typeof playerActive !== 'boolean' || !isRole(role)) {
        return invalid;
      }
      ids.add(id);
      if (id === recipientId) {
        ownRole = role;
        active = playerActive;
      }
      players.push({ id, alias, avatarKey, active: playerActive,
        revealedRole: matchEnded ? role : null });
    }
    if (ownRole === undefined) return invalid;

    const rawDiagnostic = field(input, 'ownDiagnostic');
    let diagnostic: Diagnostic | null = null;
    if (rawDiagnostic !== null) {
      const kind = field(rawDiagnostic, 'kind');
      const safeOptionId = field(rawDiagnostic, 'safeOptionId');
      const corruptedOptionId = field(rawDiagnostic, 'corruptedOptionId');
      if ((kind !== 'route' && kind !== 'gate') || typeof safeOptionId !== 'string'
        || typeof corruptedOptionId !== 'string') return invalid;
      if (active && operator && (phase === 'CREW_LOCKED' || phase === 'OPERATION_LOCKED')) {
        diagnostic = { kind, safeOptionId, corruptedOptionId };
      }
    }
    return { ok: true, value: { recipientId, players, ownRole, ownDiagnostic: diagnostic } };
  } catch {
    return invalid;
  }
}
