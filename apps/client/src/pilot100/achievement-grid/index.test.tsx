// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AchievementGrid, type AchievementGridProps } from './index';

afterEach(cleanup);

const achievements: AchievementGridProps['achievements'] = Object.freeze([
  Object.freeze({ id: 'reviewed-one', title: 'Window Trace', unlocked: false, icon: null }),
  Object.freeze({ id: 'reviewed-two', title: 'Quiet Record', unlocked: true, icon: Object.freeze({ src: '/approved-test.png', alt: 'Reviewed abstract artwork' }) }),
]);

describe('AchievementGrid', () => {
  it('labels supplied states and emits exact IDs through keyboard and pointer actions without mutation', async () => {
    const onDetails = vi.fn();
    const user = userEvent.setup();
    render(<AchievementGrid achievements={achievements} reducedMotion={false} onDetails={onDetails} />);
    const locked = screen.getByRole('button', { name: 'View details: Window Trace — Locked' });
    const unlocked = screen.getByRole('button', { name: 'View details: Quiet Record — Unlocked' });
    await user.tab();
    expect(document.activeElement).toBe(locked);
    await user.keyboard('{Enter}');
    await user.click(unlocked);
    expect(onDetails.mock.calls).toEqual([['reviewed-one'], ['reviewed-two']]);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(achievements[0]?.unlocked).toBe(false);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('honestly presents absent, empty-source and failed art while retaining its supplied accessible label', () => {
    const { rerender } = render(<AchievementGrid achievements={achievements} reducedMotion onDetails={vi.fn()} />);
    expect(screen.getByRole('img', { name: 'Achievement artwork — unavailable' }).textContent).toBe('Artwork unavailable');
    fireEvent.error(screen.getByRole('img', { name: 'Reviewed abstract artwork' }));
    expect(screen.getByRole('img', { name: 'Reviewed abstract artwork — unavailable' })).toBeTruthy();
    rerender(<AchievementGrid achievements={[{ id: 'empty', title: 'Supplied title', unlocked: false, icon: { src: ' ', alt: 'Supplied art' } }]} reducedMotion onDetails={vi.fn()} />);
    expect(screen.getByRole('img', { name: 'Supplied art — unavailable' })).toBeTruthy();
    expect(screen.queryByRole('img', { name: 'Reviewed abstract artwork — unavailable' })).toBeNull();
  });

  it('follows controlled updates to state, media, callback, motion and empty catalogue', async () => {
    const originalCallback = vi.fn();
    const nextCallback = vi.fn();
    const { rerender, container } = render(<AchievementGrid achievements={achievements} reducedMotion={false} onDetails={originalCallback} />);
    fireEvent.error(screen.getByRole('img', { name: 'Reviewed abstract artwork' }));
    rerender(<AchievementGrid achievements={[{ ...achievements[0]!, unlocked: true, icon: { src: '/replacement.png', alt: 'Replacement approved art' } }]} reducedMotion onDetails={nextCallback} />);
    expect(screen.getByRole('img', { name: 'Replacement approved art' }).getAttribute('src')).toBe('/replacement.png');
    await userEvent.click(screen.getByRole('button', { name: 'View details: Window Trace — Unlocked' }));
    expect(nextCallback).toHaveBeenCalledWith('reviewed-one');
    expect(originalCallback).not.toHaveBeenCalled();
    expect(container.querySelector('section')?.dataset.reducedMotion).toBe('true');
    rerender(<AchievementGrid achievements={[]} reducedMotion onDetails={nextCallback} />);
    expect(screen.getByText('No achievements are available in the supplied catalogue.')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('img')).toBeNull();
  });
});
