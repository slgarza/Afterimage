// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TrackDisplay, type TrackDisplayProps } from './index.js';

afterEach(cleanup);

function nodes(track: TrackDisplayProps['track']): TrackDisplayProps['nodes'] {
  const titles = track === 'repair'
    ? ['First Light', 'Trace Online', 'Safeguard', 'Audit Window', 'Containment Protocol', 'City Restored']
    : ['Signal Breach', 'Signal Jam', 'Grid Failure', 'Signal Sever', 'Blackout Order', 'City Lost'];
  return Object.freeze(titles.map((title, index) => Object.freeze({
    node: (index + 1) as TrackDisplayProps['nodes'][number]['node'], title,
    icon: null, consequenceActive: index === 1,
  })));
}

describe('TrackDisplay', () => {
  for (const track of ['repair', 'sabotage'] as const) {
    it.each([0, 1, 2, 3, 4, 5, 6])(`${track} renders six supplied nodes at %i`, (value) => {
      const onNodeDetails = vi.fn();
      const projection = nodes(track);
      render(<TrackDisplay track={track} value={value} nodes={projection} onNodeDetails={onNodeDetails} />);
      expect(screen.getByRole('status').textContent).toContain(`${value} of 6 nodes reached.`);
      const items = screen.getAllByRole('listitem');
      expect(items).toHaveLength(6);
      items.forEach((item, index) => {
        const button = within(item).getByRole('button');
        expect(button.textContent).toContain(projection[index]?.title);
        expect(item.getAttribute('data-reached')).toBe(String(index < value));
        expect(button.getAttribute('aria-current')).toBe(index + 1 === value ? 'step' : null);
        expect(button.textContent).toContain(index < value ? 'Reached' : 'Not reached');
      });
      expect(screen.getByText('Persistent consequence active')).toBeTruthy();
      expect(onNodeDetails).not.toHaveBeenCalled();
      expect(screen.queryByText(/winner|victory/i)).toBeNull();
    });
  }

  it('requests details using keyboard and updates exclusively from frozen props', async () => {
    const user = userEvent.setup();
    const onNodeDetails = vi.fn();
    const projection = nodes('repair');
    const props = Object.freeze({ track: 'repair' as const, value: 3, nodes: projection, onNodeDetails });
    const { rerender } = render(<TrackDisplay {...props} />);
    await user.tab();
    expect(document.activeElement).toBe(screen.getAllByRole('button')[0]);
    await user.keyboard('{Enter}');
    await user.tab();
    await user.keyboard(' ');
    expect(onNodeDetails.mock.calls).toEqual([[1], [2]]);
    expect(screen.getByRole('status').textContent).toContain('3 of 6');
    rerender(<TrackDisplay {...props} value={4} nodes={projection.map((entry) => ({
      ...entry, consequenceActive: entry.node === 1,
    }))} />);
    expect(screen.getByRole('status').textContent).toContain('4 of 6');
    expect(screen.getAllByRole('button')[3]?.getAttribute('aria-current')).toBe('step');
    expect(within(screen.getAllByRole('listitem')[0]!).getByText('Persistent consequence active')).toBeTruthy();
    expect(props.value).toBe(3);
    expect(projection[1]?.consequenceActive).toBe(true);
  });

  it.each([-1, 7, 1.5, NaN, Infinity])('rejects invalid value %s', (value) => {
    render(<TrackDisplay track="repair" value={value} nodes={nodes('repair')} onNodeDetails={vi.fn()} />);
    expect(screen.getByRole('alert').textContent).toContain('Invalid track projection');
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('rejects missing, duplicate, out-of-range and unlabelled nodes without callbacks', () => {
    const projection = nodes('sabotage');
    const onNodeDetails = vi.fn();
    const { rerender } = render(<TrackDisplay track="sabotage" value={6} nodes={[]} onNodeDetails={onNodeDetails} />);
    for (const invalid of [projection.slice(1), [...projection.slice(0, 5), projection[0]!],
      projection.map((entry) => entry.node === 6 ? { ...entry, node: 7 } : entry),
      projection.map((entry) => ({ ...entry, title: '' }))]) {
      rerender(<TrackDisplay track="sabotage" value={6}
        nodes={invalid as TrackDisplayProps['nodes']} onNodeDetails={onNodeDetails} />);
      expect(screen.getByRole('alert')).toBeTruthy();
      expect(screen.queryByRole('list')).toBeNull();
    }
    expect(onNodeDetails).not.toHaveBeenCalled();
  });

  it('sorts a copy of the public projection and honestly handles missing or failed media', () => {
    const projection = Object.freeze([...nodes('repair')].reverse().map((entry) => Object.freeze({
      ...entry, icon: entry.node === 1 ? Object.freeze({ src: '/approved.svg', alt: 'First Light symbol' }) : null,
    })));
    const { rerender } = render(<TrackDisplay track="repair" value={1} nodes={projection} onNodeDetails={vi.fn()} />);
    expect(screen.getAllByRole('button')[0]?.textContent).toContain('1. First Light');
    expect(screen.getByText('Trace Online — icon unavailable')).toBeTruthy();
    fireEvent.error(screen.getByRole('img', { name: 'First Light symbol' }));
    expect(screen.getByText('First Light symbol — icon unavailable')).toBeTruthy();
    expect(screen.queryByRole('img')).toBeNull();
    rerender(<TrackDisplay track="repair" value={1} nodes={projection.map((entry) => ({
      ...entry, icon: entry.node === 1 ? { src: '/replacement.svg', alt: 'Replacement symbol' } : null,
    }))} onNodeDetails={vi.fn()} />);
    expect(screen.getByRole('img', { name: 'Replacement symbol' })).toBeTruthy();
    expect(projection[0]?.node).toBe(6);
  });
});
