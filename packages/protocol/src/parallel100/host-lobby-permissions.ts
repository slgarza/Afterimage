export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: {
      readonly code: 'invalid-input' | 'forbidden' | 'stale' | 'decision-required';
      readonly decisionId?: string;
    } };

type Permission = {
  readonly allowed: boolean;
  readonly reason: 'allowed' | 'host-only' | 'phase' | 'target' | 'not-ready';
};

// Inspect data properties only: transport input must never execute accessors.
function data(object: object, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(object, key);
  return descriptor && 'value' in descriptor ? descriptor.value : undefined;
}

function identity(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(value);
}

function identities(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const length = data(value, 'length');
  if (typeof length !== 'number' || length > 10) return undefined;
  const result: string[] = [];
  for (let index = 0; index < length; index++) {
    const id = data(value, String(index));
    if (!identity(id) || result.includes(id)) return undefined;
    result.push(id);
  }
  return result;
}

export function hostLobbyPermission(input: {
  readonly verifiedPlayerId: string; readonly hostPlayerId: string;
  readonly phase: 'lobby' | 'match' | 'ended';
  readonly action: 'configure' | 'kick' | 'start';
  readonly targetId: string | null; readonly playerIds: readonly string[];
  readonly configuredSeats: number; readonly readyPlayerIds: readonly string[];
  readonly fillBots: boolean;
}): Result<Permission> {
  const invalid = (): Result<Permission> => ({ ok: false, error: { code: 'invalid-input' } });
  const permission = (reason: Permission['reason']): Result<Permission> =>
    ({ ok: true, value: { allowed: reason === 'allowed', reason } });
  try {
    if (typeof input !== 'object' || input === null) return invalid();
    const verified = data(input, 'verifiedPlayerId');
    const host = data(input, 'hostPlayerId');
    const phase = data(input, 'phase');
    const action = data(input, 'action');
    const target = data(input, 'targetId');
    const players = identities(data(input, 'playerIds'));
    const seats = data(input, 'configuredSeats');
    const ready = identities(data(input, 'readyPlayerIds'));
    const fillBots = data(input, 'fillBots');
    if (!identity(verified) || !identity(host) ||
        (phase !== 'lobby' && phase !== 'match' && phase !== 'ended') ||
        (action !== 'configure' && action !== 'kick' && action !== 'start') ||
        (target !== null && !identity(target)) || !players || !ready ||
        typeof seats !== 'number' || !Number.isInteger(seats) || seats < 5 || seats > 10 ||
        players.length > seats || !players.includes(host) ||
        ready.some(id => !players.includes(id)) || typeof fillBots !== 'boolean') return invalid();
    if (verified !== host) return permission('host-only');
    if (phase !== 'lobby') return permission('phase');
    if (action === 'kick' && (target === host || target === null || !players.includes(target))) {
      return permission('target');
    }
    if (action === 'start' &&
        (ready.length !== players.length || (players.length !== seats && !fillBots))) {
      return permission('not-ready');
    }
    return permission('allowed');
  } catch {
    return invalid();
  }
}
