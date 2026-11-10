import { describe, expect, it } from 'vitest';

import { createEngineState, nextRandom, reduceEngine, replayEngine } from '../src/index.js';

describe('deterministic engine primitives', () => {
  it('returns the same random sequence for identical seeds', () => {
    let left = createEngineState('afterimage-p03').rng;
    let right = createEngineState('afterimage-p03').rng;
    const leftValues: number[] = [];
    const rightValues: number[] = [];

    for (let roll = 0; roll < 8; roll += 1) {
      const [leftValue, leftNext] = nextRandom(left);
      const [rightValue, rightNext] = nextRandom(right);
      leftValues.push(leftValue);
      rightValues.push(rightValue);
      left = leftNext;
      right = rightNext;
    }

    expect(leftValues).toEqual(rightValues);
  });

  it('replays equal event inputs to an equal engine state without mutation', () => {
    const events = [
      { type: 'draw' as const, upperBound: 10 },
      { type: 'draw' as const, upperBound: 6 },
      { type: 'draw' as const, upperBound: 3 },
    ];
    const initial = createEngineState('shared-seed');

    const first = events.reduce(reduceEngine, initial);
    const second = replayEngine('shared-seed', events);

    expect(first).toEqual(second);
    expect(initial).toEqual(createEngineState('shared-seed'));
    expect(first.draws).toHaveLength(3);
    expect(first.draws[0]).toBeGreaterThanOrEqual(0);
    expect(first.draws[0]).toBeLessThan(10);
  });

  it('rejects invalid draw bounds instead of silently making nondeterministic state', () => {
    expect(() => reduceEngine(createEngineState(1), { type: 'draw', upperBound: 0 })).toThrow(
      'positive safe integer',
    );
  });
});
