// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { BoardView, type BoardViewProps } from './index.js';

afterEach(cleanup);

describe('BoardView', () => {
  it.each([
    { stability: 0, corruption: 0 },
    { stability: 2, corruption: 3 },
    { stability: 5, corruption: 5 },
    { stability: 5, corruption: 0 },
    { stability: 0, corruption: 5 },
  ])('renders public marks $stability/$corruption without outcomes', (props) => {
    const { container } = render(<BoardView {...Object.freeze(props)} />);

    expect(screen.getAllByRole('meter')).toHaveLength(2);
    for (const [name, value] of [
      ['Stability', props.stability],
      ['Corruption', props.corruption],
    ] as const) {
      const meter = screen.getByRole('meter', { name });
      expect(meter.getAttribute('aria-valuenow')).toBe(String(value));
      expect(meter.getAttribute('aria-valuemin')).toBe('0');
      expect(meter.getAttribute('aria-valuemax')).toBe('5');
      expect(within(meter).getByText(name).hidden).toBe(false);
      expect(within(meter).getByText(`${value} / 5`).hidden).toBe(false);
      expect(meter.textContent).toBe(`${name}: ${value} / 5`);
    }

    // Only the supplied public labels/counts are rendered, even at either limit.
    expect(container.textContent).toBe(
      `Stability: ${props.stability} / 5Corruption: ${props.corruption} / 5`,
    );
    expect(container.textContent).not.toMatch(/winner|wins|victory|defeat|archivists|static/i);
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('reflects new props without changing the frozen input', () => {
    const props = Object.freeze({ stability: 1, corruption: 4 });
    const { rerender } = render(<BoardView {...props} />);
    rerender(<BoardView stability={4} corruption={1} />);
    expect(screen.getByRole('meter', { name: 'Stability' }).getAttribute('aria-valuenow')).toBe('4');
    expect(screen.getByRole('meter', { name: 'Corruption' }).getAttribute('aria-valuenow')).toBe('1');
    expect(props).toEqual({ stability: 1, corruption: 4 });
  });

  describe.each(['stability', 'corruption'] as const)('%s validation', (field) => {
    it.each([
      -1, 6, 0.5, 4.5, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER,
      '3', '', null, undefined, true, {}, [],
    ])('rejects malformed mark %j with RangeError', (value) => {
      const props = { stability: 0, corruption: 0, [field]: value } as BoardViewProps;
      expect(() => BoardView(props)).toThrow(RangeError);
    });
  });
});
