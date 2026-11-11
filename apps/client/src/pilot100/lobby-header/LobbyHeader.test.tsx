// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LobbyHeader, type LobbyHeaderProps } from './index';

afterEach(cleanup);

function fixture(overrides: Partial<LobbyHeaderProps> = {}): LobbyHeaderProps {
  return Object.freeze({
    name: 'Quiet Courtyard', code: 'ECHO42', connected: 3, capacity: 6,
    canCopy: true, canShare: true, feedback: null,
    onCopy: vi.fn(), onShare: vi.fn(), onLeave: vi.fn(), ...overrides,
  });
}

describe('LobbyHeader', () => {
  it('renders public data literally, including long names and codes', () => {
    const name = '<img src=x>' + 'Long room name '.repeat(30);
    const code = 'LONGPUBLICCODE'.repeat(30);
    const props = fixture({ name, code });
    const { container } = render(<LobbyHeader {...props} />);

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(name);
    expect(screen.getByText(code).textContent).toBe(code);
    expect(screen.getByText('3 / 6 players connected / configured')).toBeTruthy();
    expect(container.querySelector('img')).toBeNull();
    expect(props).toEqual(fixture({ name, code,
      onCopy: props.onCopy, onShare: props.onShare, onLeave: props.onLeave }));
  });

  it('emits requests without inventing feedback or outcomes', async () => {
    const user = userEvent.setup();
    const props = fixture();
    render(<LobbyHeader {...props} />);

    await user.click(screen.getByRole('button', { name: 'Copy room code' }));
    await user.click(screen.getByRole('button', { name: 'Share room' }));
    expect(props.onCopy).toHaveBeenCalledExactlyOnceWith();
    expect(props.onShare).toHaveBeenCalledExactlyOnceWith();
    expect(props.onLeave).not.toHaveBeenCalled();
    expect(screen.getByRole('status').textContent).toBe('');
  });

  it.each([false, true])('guards unavailable actions independently (copy enabled: %s)', async (canCopy) => {
    const user = userEvent.setup();
    const props = fixture({ canCopy, canShare: !canCopy });
    const { rerender } = render(<LobbyHeader {...props} />);
    const copy = screen.getByRole('button', { name: 'Copy room code' }) as HTMLButtonElement;
    const share = screen.getByRole('button', { name: 'Share room' }) as HTMLButtonElement;
    expect(copy.disabled).toBe(!canCopy);
    expect(share.disabled).toBe(canCopy);
    await user.click(copy);
    await user.click(share);
    expect(props.onCopy).toHaveBeenCalledTimes(canCopy ? 1 : 0);
    expect(props.onShare).toHaveBeenCalledTimes(canCopy ? 0 : 1);

    rerender(<LobbyHeader {...props} canCopy={false} canShare={false} />);
    fireEvent.click(copy);
    fireEvent.click(share);
    expect(props.onCopy).toHaveBeenCalledTimes(canCopy ? 1 : 0);
    expect(props.onShare).toHaveBeenCalledTimes(canCopy ? 0 : 1);
  });

  it('reflects host feedback, counts and public room changes on rerender', () => {
    const props = fixture();
    const { rerender } = render(<LobbyHeader {...props} />);
    rerender(<LobbyHeader {...props} name="New courtyard" code="NEW123"
      connected={0} capacity={8} feedback="Sharing is unavailable on this device." />);
    expect(screen.getByRole('heading').textContent).toBe('New courtyard');
    expect(screen.getByText('NEW123')).toBeTruthy();
    expect(screen.queryByText('ECHO42')).toBeNull();
    expect(screen.getByText('0 / 8 players connected / configured')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe('Sharing is unavailable on this device.');
    rerender(<LobbyHeader {...props} feedback={null} />);
    expect(screen.getByRole('status').textContent).toBe('');
    expect(props.connected).toBe(3);
    expect(props.feedback).toBeNull();
  });

  it('supports keyboard requests and leave without submitting a parent form', async () => {
    const user = userEvent.setup();
    const props = fixture();
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    render(<form onSubmit={onSubmit}><LobbyHeader {...props} /></form>);
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Copy room code' }));
    await user.keyboard('{Enter}');
    await user.tab();
    await user.keyboard(' ');
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Leave lobby' }));
    await user.keyboard('{Enter}');
    expect(props.onCopy).toHaveBeenCalledExactlyOnceWith();
    expect(props.onShare).toHaveBeenCalledExactlyOnceWith();
    expect(props.onLeave).toHaveBeenCalledExactlyOnceWith();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
