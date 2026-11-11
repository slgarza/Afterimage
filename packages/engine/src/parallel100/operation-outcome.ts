export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: {
      readonly code: 'invalid-input' | 'forbidden' | 'stale' | 'decision-required';
      readonly decisionId?: string;
    } };

type Pair = { readonly routeId: string; readonly gateId: string };
type Outcome = {
  readonly outcome: 'repair' | 'sabotage' | 'anomaly';
  readonly repairDelta: 0 | 1;
  readonly sabotageDelta: 0 | 1;
  readonly trace: 'safe' | 'corrupted' | 'mixed';
};

// Read data properties only: malformed runtime inputs must not invoke getters.
function data(value: unknown, key: string): unknown {
  if (typeof value !== 'object' || value === null) return undefined;
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  return descriptor && 'value' in descriptor ? descriptor.value : undefined;
}

function catalogue(value: unknown): readonly string[] | undefined {
  if (!Array.isArray(value) || data(value, 'length') !== 3) return undefined;
  const options = [data(value, '0'), data(value, '1'), data(value, '2')];
  if (!options.every((option): option is string => typeof option === 'string')) {
    return undefined;
  }
  return new Set(options).size === 3 ? options : undefined;
}

function pair(value: unknown, routes: readonly string[], gates: readonly string[]): Pair | undefined {
  const routeId = data(value, 'routeId');
  const gateId = data(value, 'gateId');
  if (typeof routeId !== 'string' || typeof gateId !== 'string'
    || !routes.includes(routeId) || !gates.includes(gateId)) return undefined;
  return { routeId, gateId };
}

function same(left: Pair, right: Pair): boolean {
  return left.routeId === right.routeId && left.gateId === right.gateId;
}

export function resolveOperationPair(input: {
  readonly selected: { readonly routeId: string; readonly gateId: string };
  readonly routes: readonly string[]; readonly gates: readonly string[];
  readonly safe: { readonly routeId: string; readonly gateId: string };
  readonly corrupted: { readonly routeId: string; readonly gateId: string };
}): Result<Outcome> {
  const invalid = { ok: false, error: { code: 'invalid-input' } } as const;
  try {
    const routes = catalogue(data(input, 'routes'));
    const gates = catalogue(data(input, 'gates'));
    if (!routes || !gates) return invalid;
    const selected = pair(data(input, 'selected'), routes, gates);
    const safe = pair(data(input, 'safe'), routes, gates);
    const corrupted = pair(data(input, 'corrupted'), routes, gates);
    if (!selected || !safe || !corrupted || same(safe, corrupted)) return invalid;
    if (same(selected, safe)) {
      return { ok: true, value: { outcome: 'repair', repairDelta: 1, sabotageDelta: 0, trace: 'safe' } };
    }
    if (same(selected, corrupted)) {
      return { ok: true, value: { outcome: 'sabotage', repairDelta: 0, sabotageDelta: 1, trace: 'corrupted' } };
    }
    return { ok: true, value: { outcome: 'anomaly', repairDelta: 0, sabotageDelta: 0, trace: 'mixed' } };
  } catch {
    // Proxy/descriptor failures are malformed input, never partial resolution.
    return invalid;
  }
}
