// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SoloSetup, type SoloSetupProps } from './index';

afterEach(cleanup);

function fixture(overrides: Partial<SoloSetupProps> = {}): SoloSetupProps {
  return Object.freeze({
    players: 5, difficulty: 'steady',
    difficulties: Object.freeze([Object.freeze({ id: 'steady', label: 'Steady' }), Object.freeze({ id: 'careful', label: 'Careful' })]),
    durationSeconds: 45, durations: Object.freeze([45, 105]),
    readyToStart: false, unavailableReason: 'Local authority is preparing.',
    onPlayersChange: vi.fn(), onDifficultyChange: vi.fn(), onDurationChange: vi.fn(),
    onStart: vi.fn(), onBack: vi.fn(), ...overrides,
  });
}

describe('SoloSetup', () => {
  it('steps across all six counts only through controlled updates, preserving other values', async () => {
    const user = userEvent.setup();
    const props = fixture();
    const { rerender } = render(<SoloSetup {...props} />);
    for (let players = 5; players <= 10; players++) {
      rerender(<SoloSetup {...props} players={players} />);
      const less = screen.getByRole<HTMLButtonElement>('button', { name: 'Fewer players' });
      const more = screen.getByRole<HTMLButtonElement>('button', { name: 'More players' });
      expect(less.disabled).toBe(players === 5);
      expect(more.disabled).toBe(players === 10);
      vi.mocked(props.onPlayersChange).mockClear();
      await user.click(less);
      await user.click(more);
      expect(vi.mocked(props.onPlayersChange).mock.calls).toEqual([
        ...(players > 5 ? [[players - 1]] : []), ...(players < 10 ? [[players + 1]] : []),
      ]);
      expect(screen.getByLabelText('Player count').textContent).toBe(String(players));
      expect(screen.getByLabelText<HTMLSelectElement>('Bot difficulty').value).toBe('steady');
      expect(screen.getByLabelText<HTMLSelectElement>('Duration').value).toBe('45');
    }
    expect(props.onDifficultyChange).not.toHaveBeenCalled();
    expect(props.onDurationChange).not.toHaveBeenCalled();
    expect(props.players).toBe(5);
  });

  it.each([4, 11, 5.5, NaN])('refuses invalid supplied player count %s', (players) => {
    const props = fixture({ players });
    render(<SoloSetup {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Fewer players' }));
    fireEvent.click(screen.getByRole('button', { name: 'More players' }));
    expect(props.onPlayersChange).not.toHaveBeenCalled();
  });

  it('emits only supplied options and waits for the host to update selection', async () => {
    const user = userEvent.setup();
    const props = fixture();
    const { rerender } = render(<SoloSetup {...props} />);
    const difficulty = screen.getByLabelText<HTMLSelectElement>('Bot difficulty');
    const duration = screen.getByLabelText<HTMLSelectElement>('Duration');
    expect(Array.from(difficulty.options, (o) => o.value)).toEqual(['', 'steady', 'careful']);
    expect(Array.from(duration.options, (o) => o.value)).toEqual(['', '45', '105']);
    await user.selectOptions(difficulty, 'careful');
    await user.selectOptions(duration, '105');
    expect(props.onDifficultyChange).toHaveBeenCalledExactlyOnceWith('careful');
    expect(props.onDurationChange).toHaveBeenCalledExactlyOnceWith(105);
    expect(difficulty.value).toBe('steady');
    expect(duration.value).toBe('45');
    fireEvent.change(difficulty, { target: { value: 'invented' } });
    fireEvent.change(duration, { target: { value: '999' } });
    expect(props.onDifficultyChange).toHaveBeenCalledTimes(1);
    expect(props.onDurationChange).toHaveBeenCalledTimes(1);
    expect(props.onPlayersChange).not.toHaveBeenCalled();
    rerender(<SoloSetup {...props} difficulty="careful" durationSeconds={105} />);
    expect(difficulty.value).toBe('careful');
    expect(duration.value).toBe('105');
  });

  it('displays missing options without inventing defaults', () => {
    const props = fixture({ difficulties: [], durations: [] });
    render(<SoloSetup {...props} />);
    expect(screen.getByLabelText<HTMLSelectElement>('Bot difficulty').disabled).toBe(true);
    expect(screen.getByLabelText<HTMLSelectElement>('Duration').disabled).toBe(true);
    expect(screen.getByText('No bot difficulties available.')).toBeTruthy();
    expect(screen.getByText('No durations available.')).toBeTruthy();
    expect(props.onDifficultyChange).not.toHaveBeenCalled();
    expect(props.onDurationChange).not.toHaveBeenCalled();
  });

  it('uses supplied authority availability and reason, with keyboard start and back', async () => {
    const user = userEvent.setup();
    const props = fixture();
    const { rerender } = render(<SoloSetup {...props} />);
    const start = screen.getByRole<HTMLButtonElement>('button', { name: 'Start simulation' });
    expect(start.disabled).toBe(true);
    expect(screen.getByRole('status', { name: '' }).textContent).toBe(props.unavailableReason);
    expect(document.getElementById(start.getAttribute('aria-describedby')!)?.textContent).toBe(props.unavailableReason);
    fireEvent.click(start);
    expect(props.onStart).not.toHaveBeenCalled();
    expect(screen.getByText('Fair bots use the same rules and information as humans.')).toBeTruthy();
    expect(screen.queryByText(/Firebase/i)).toBeNull();
    rerender(<SoloSetup {...props} readyToStart />);
    expect(start.disabled).toBe(false);
    expect(screen.queryByRole('status', { name: '' })).toBeNull();
    start.focus();
    await user.keyboard('{Enter}');
    expect(props.onStart).toHaveBeenCalledTimes(1);
    const back = screen.getByRole('button', { name: 'Back' });
    back.focus();
    await user.keyboard(' ');
    expect(props.onBack).toHaveBeenCalledTimes(1);
    rerender(<SoloSetup {...props} unavailableReason={null} />);
    expect(start.disabled).toBe(true);
    expect(screen.getByRole('status', { name: '' }).textContent).toBe('Simulation authority is unavailable.');
  });
});
