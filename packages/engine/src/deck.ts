import { nextRandom, type RngState } from './index.js';

/** Shuffle a copy with descending Fisher–Yates and return the advanced RNG. */
export function shuffle<T>(items: readonly T[], rng: RngState): { items: T[]; rng: RngState } {
  const shuffled = [...items];
  let nextRng = rng;

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const [value, next] = nextRandom(nextRng);
    nextRng = next;
    const j = Math.floor(value * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }

  return { items: shuffled, rng: nextRng };
}

/** Extract an ordered prefix without changing the deck or its items. */
export function draw<T>(deck: readonly T[], count: number): { drawn: T[]; remaining: T[] } {
  if (!Number.isSafeInteger(count) || count < 0 || count > deck.length) {
    throw new RangeError('Draw count must be a safe integer from zero through deck length.');
  }

  return { drawn: deck.slice(0, count), remaining: deck.slice(count) };
}
