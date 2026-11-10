import { describe, expect, expectTypeOf, it } from 'vitest';
import { theme } from '../src/index.js';
import type { ThemeTokens } from '../src/index.js';

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((offset) => {
    const channel = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
}

function contrast(first: string, second: string): number {
  const values = [luminance(first), luminance(second)];
  return (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05);
}

describe('public theme', () => {
  it('exports a typed semantic palette', () => {
    expectTypeOf(theme).toExtend<ThemeTokens>();
    for (const group of Object.values(theme.color)) {
      for (const color of Object.values(group)) {
        expect(color).toMatch(/^#[0-9a-f]{6}$/);
      }
    }
  });

  it('keeps text legible on every chrome surface', () => {
    for (const surface of Object.values(theme.color.surface)) {
      for (const text of Object.values(theme.color.text)) {
        expect(contrast(text, surface)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('keeps control boundaries and focus indicators distinct from surfaces', () => {
    for (const surface of Object.values(theme.color.surface)) {
      expect(contrast(theme.color.border.control, surface)).toBeGreaterThanOrEqual(3);
      expect(contrast(theme.color.focus.ring, surface)).toBeGreaterThanOrEqual(3);
    }
  });
});
