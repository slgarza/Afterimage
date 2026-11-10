import { describe, expect, it } from 'vitest';

import { draw, shuffle } from '../src/deck.js';
import { createEngineState, nextRandom, type RngState } from '../src/index.js';

describe('shuffle', () => {
  it.each([
    { seed: 0, items: ['f', 'c', 'd', 'e', 'a', 'b'], value: 567894473 },
    { seed: 1, items: ['e', 'b', 'f', 'c', 'a', 'd'], value: 567894474 },
    { seed: 4294967295, items: ['e', 'b', 'd', 'c', 'a', 'f'], value: 567894472 },
  ])('matches the fixed descending Fisher–Yates fixture for seed $seed', ({ seed, items, value }) => {
    expect(shuffle(['a', 'b', 'c', 'd', 'e', 'f'], { value: seed })).toEqual({
      items,
      rng: { value },
    });
  });

  it('replays identical seeds and subsequent shuffles deterministically', () => {
    const items = ['a', 'b', 'c', 'd', 'e'];
    const first = shuffle(items, createEngineState('deck-replay').rng);
    const replay = shuffle(items, createEngineState('deck-replay').rng);

    expect(first).toEqual(replay);
    expect(shuffle(first.items, first.rng)).toEqual(shuffle(replay.items, replay.rng));
  });

  it.each([0, 1, 2, 3, 6, 32])('advances exactly max(0, n - 1) times for length %i', (length) => {
    const rng = Object.freeze({ value: 123 });
    let expected: RngState = rng;
    for (let step = 0; step < Math.max(0, length - 1); step += 1) {
      [, expected] = nextRandom(expected);
    }

    const result = shuffle(Array.from({ length }, (_, index) => index), rng);

    expect(result.rng).toEqual(expected);
    expect(rng).toEqual({ value: 123 });
    if (length < 2) expect(result.rng).toBe(rng);
  });

  it.each([{ items: [] }, { items: ['only'] }])('copies empty and singleton arrays without changing order', ({ items }) => {
    const input = Object.freeze(items);
    const result = shuffle(input, Object.freeze({ value: 0 }));

    expect(result.items).toEqual(input);
    expect(result.items).not.toBe(input);
  });

  it('preserves a frozen input and its multiset of opaque references, including duplicates', () => {
    const first = Object.freeze({ id: 'first' });
    const second = Object.freeze({ id: 'second' });
    const sameValue = Object.freeze({ id: 'first' });
    const input = Object.freeze([first, second, first, sameValue, second]);
    const rng = Object.freeze({ value: 1 });
    const result = shuffle(input, rng);

    expect(input).toEqual([first, second, first, sameValue, second]);
    expect(rng).toEqual({ value: 1 });
    expect(result.items).not.toBe(input);
    expect(result.items).toHaveLength(input.length);
    for (const item of new Set(input)) {
      expect(result.items.filter((candidate) => candidate === item)).toHaveLength(
        input.filter((candidate) => candidate === item).length,
      );
    }
    result.items.pop();
    expect(input).toHaveLength(5);
  });
});

describe('draw', () => {
  it.each([0, 1, 2, 3, 4])('extracts %i items in order into detached arrays', (count) => {
    const first = Object.freeze({ id: 'first' });
    const second = Object.freeze({ id: 'second' });
    const third = Object.freeze({ id: 'third' });
    const deck = Object.freeze([first, second, first, third]);
    const result = draw(deck, count);

    expect(result.drawn).toEqual(deck.slice(0, count));
    expect(result.remaining).toEqual(deck.slice(count));
    expect(result.drawn).not.toBe(deck);
    expect(result.remaining).not.toBe(deck);
    expect(result.drawn).not.toBe(result.remaining);
    [...result.drawn, ...result.remaining].forEach((item, index) => {
      expect(item).toBe(deck[index]);
    });
    result.drawn.push(second);
    result.remaining.pop();
    expect(deck).toEqual([first, second, first, third]);
  });

  it('draws zero from an empty deck into two fresh arrays', () => {
    const deck = Object.freeze([]);
    const result = draw(deck, 0);

    expect(result).toEqual({ drawn: [], remaining: [] });
    expect(result.drawn).not.toBe(deck);
    expect(result.remaining).not.toBe(deck);
    expect(result.drawn).not.toBe(result.remaining);
  });

  it.each([
    -1, -0.5, 0.5, 1.5, 4, NaN, Infinity, -Infinity,
    Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER + 1, Number.MIN_SAFE_INTEGER - 1,
  ])('rejects invalid count %s with RangeError without mutating the deck', (count) => {
    const deck = Object.freeze(['a', 'b', 'c']);

    expect(() => draw(deck, count)).toThrow(RangeError);
    expect(deck).toEqual(['a', 'b', 'c']);
  });

  it('rejects drawing any items from an empty deck', () => {
    expect(() => draw([], 1)).toThrow(RangeError);
  });
});
