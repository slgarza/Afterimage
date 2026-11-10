/**
 * Pure, deterministic primitives for the authoritative game engine.
 *
 * This package intentionally has no browser, Firebase, Capacitor, or UI
 * dependency. The service layer may persist events, but only this reducer is
 * allowed to derive the next state from an event.
 */

export type Seed = number | string;

export interface RngState {
  /** Unsigned 32-bit state consumed by the next roll. */
  readonly value: number;
}

export interface EngineState {
  readonly seed: number;
  readonly rng: RngState;
  readonly revision: number;
  readonly draws: readonly number[];
}

export type EngineEvent =
  | { readonly type: 'draw'; readonly upperBound: number }
  | { readonly type: 'reset'; readonly seed: Seed };

/** Convert a human-readable or numeric seed into a stable unsigned integer. */
export function normalizeSeed(seed: Seed): number {
  if (typeof seed === 'number') {
    if (!Number.isFinite(seed)) throw new Error('Seed must be finite.');
    return seed >>> 0;
  }

  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Build an immutable initial state for one deterministic game. */
export function createEngineState(seed: Seed): EngineState {
  const normalizedSeed = normalizeSeed(seed);
  return {
    seed: normalizedSeed,
    rng: { value: normalizedSeed },
    revision: 0,
    draws: [],
  };
}

/**
 * Advance Mulberry32 one step. It is compact, reproducible across JavaScript
 * runtimes, and sufficient for deterministic game setup/draws (not security).
 */
export function nextRandom(rng: RngState): readonly [value: number, next: RngState] {
  const nextValue = (rng.value + 0x6d2b79f5) >>> 0;
  let mixed = nextValue;
  mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
  mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
  const value = ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  return [value, { value: nextValue }];
}

/** Apply one validated engine event without mutating its input state. */
export function reduceEngine(state: EngineState, event: EngineEvent): EngineState {
  if (event.type === 'reset') return createEngineState(event.seed);

  if (!Number.isSafeInteger(event.upperBound) || event.upperBound < 1) {
    throw new Error('Draw upperBound must be a positive safe integer.');
  }

  const [random, rng] = nextRandom(state.rng);
  const draw = Math.floor(random * event.upperBound);
  return {
    ...state,
    rng,
    revision: state.revision + 1,
    draws: [...state.draws, draw],
  };
}

/** Apply a sequence in order; useful for replaying persisted, validated events. */
export function replayEngine(seed: Seed, events: readonly EngineEvent[]): EngineState {
  return events.reduce(reduceEngine, createEngineState(seed));
}
