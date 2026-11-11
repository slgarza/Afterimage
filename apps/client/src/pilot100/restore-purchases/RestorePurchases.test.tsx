// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RestorePurchases, type RestorePurchasesProps } from './index.js';

afterEach(cleanup);

function fixture(overrides: Partial<RestorePurchasesProps> = {}): RestorePurchasesProps {
  return Object.freeze({ available: true, state: 'idle', platformLabel: 'iOS App Store', message: null, onRestore: vi.fn(), ...overrides });
}

describe('RestorePurchases', () => {
  it('emits one intent on click without inventing progress or success', async () => {
    const props = fixture();
    render(<RestorePurchases {...props} />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Restore purchases' }));
    expect(props.onRestore).toHaveBeenCalledExactlyOnceWith();
    expect(screen.getByRole('status').textContent).toBe('Ready to request restoration.');
    expect(props.state).toBe('idle');
    expect(screen.getByText(/Restoration applies to purchases from iOS App Store/)).toBeDefined();
  });

  it('supports keyboard activation', async () => {
    const props = fixture();
    render(<RestorePurchases {...props} />);
    const user = userEvent.setup();
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button'));
    await user.keyboard('{Enter}');
    expect(props.onRestore).toHaveBeenCalledExactlyOnceWith();
  });

  it.each([
    { available: false, state: 'idle', platformLabel: 'Web' },
    { available: false, state: 'failed', platformLabel: 'Google Play' },
    { available: true, state: 'pending', platformLabel: 'iOS App Store' },
  ] as const)('blocks restoration for %j', async (overrides) => {
    const props = fixture(overrides);
    render(<RestorePurchases {...props} />);
    const button = screen.getByRole<HTMLButtonElement>('button');
    expect(button.disabled).toBe(true);
    await userEvent.setup().click(button);
    expect(props.onRestore).not.toHaveBeenCalled();
    if (!props.available) expect(screen.getByText(/Restoration is unavailable on the web/)).toBeDefined();
  });

  it('renders only supplied outcomes and messages across controlled transitions', () => {
    const props = fixture();
    const { rerender } = render(<RestorePurchases {...props} />);
    const cases = [
      ['pending', 'Restoration is pending. Waiting for the store result.'],
      ['restored', 'Purchases restored.'],
      ['none-found', 'No restorable purchases found.'],
      ['failed', 'Purchases could not be restored.'],
    ] as const;
    for (const [state, expected] of cases) {
      rerender(<RestorePurchases {...props} state={state} message={`Store detail: ${state}`} />);
      expect(screen.getByRole('status').textContent).toBe(`${expected}Store detail: ${state}`);
    }
    rerender(<RestorePurchases {...props} platformLabel="Google Play" message={null} />);
    expect(screen.getByRole('status').textContent).toBe('Ready to request restoration.');
    expect(screen.queryByText(/Store detail:/)).toBeNull();
    expect(screen.getByText(/Restoration applies to purchases from Google Play/)).toBeDefined();
    expect(props.onRestore).not.toHaveBeenCalled();
  });

  it('enables restoration when the host makes the provider available', async () => {
    const props = fixture({ available: false });
    const { rerender } = render(<RestorePurchases {...props} />);
    rerender(<RestorePurchases {...props} available />);
    await userEvent.setup().click(screen.getByRole('button'));
    expect(props.onRestore).toHaveBeenCalledExactlyOnceWith();
  });
});
