// @vitest-environment jsdom
import { useState } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ActionButton, TextField } from '../src/controls/index.js';

afterEach(cleanup);

describe('ActionButton', () => {
  it('preserves native attributes and supports pointer and keyboard activation', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<ActionButton onClick={onClick} name="action" value="save" title="Save changes">Save</ActionButton>);
    const button = screen.getByRole<HTMLButtonElement>('button', { name: 'Save' });
    expect(button.type).toBe('button');
    expect(button.name).toBe('action');
    expect(button.value).toBe('save');
    expect(button.title).toBe('Save changes');
    expect(button.getAttribute('aria-busy')).toBe('false');
    await user.tab();
    expect(document.activeElement).toBe(button);
    expect(button.style.outline).toBe('');
    await user.keyboard('{Enter}');
    await user.keyboard(' ');
    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(3);
  });

  it.each([
    { disabled: true, busy: false },
    { disabled: false, busy: true },
    { disabled: true, busy: true },
  ])('prevents actions for %o while preserving its name', async (props) => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const { rerender } = render(<ActionButton {...props} onClick={onClick}>Save</ActionButton>);
    const button = screen.getByRole<HTMLButtonElement>('button', { name: 'Save' });
    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe(String(props.busy));
    await user.click(button);
    await user.tab();
    expect(document.activeElement).not.toBe(button);
    expect(onClick).not.toHaveBeenCalled();
    rerender(<ActionButton onClick={onClick}>Save</ActionButton>);
    expect(button.disabled).toBe(false);
    expect(button.getAttribute('aria-busy')).toBe('false');
    await user.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('submits only when explicitly given submit type', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <form onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
        <ActionButton>Default</ActionButton>
        <ActionButton type="submit">Submit</ActionButton>
      </form>,
    );
    await user.click(screen.getByRole('button', { name: 'Default' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Submit' }).type).toBe('submit');
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    expect(onSubmit).toHaveBeenCalledOnce();
  });
});

describe('TextField', () => {
  it('keeps labels and messages legible when rendered on a light host', () => {
    render(
      <div style={{ backgroundColor: '#fafafa' }}>
        <TextField id="contrast" label="Display name" value="" onValueChange={vi.fn()}
          hint="Use a short name" error="Name required" />
      </div>,
    );
    const luminance = (color: string) => {
      const channels = color.match(/[\d.]+/g)!.slice(0, 3).map((value) => {
        const channel = Number(value) / 255;
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      });
      return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
    };
    for (const text of ['Display name', 'Use a short name', 'Name required']) {
      const element = screen.getByText(text);
      let surface: HTMLElement | null = element;
      while (surface && ['transparent', 'rgba(0, 0, 0, 0)'].includes(getComputedStyle(surface).backgroundColor)) {
        surface = surface.parentElement;
      }
      expect(surface).not.toBeNull();
      const values = [luminance(getComputedStyle(element).color), luminance(getComputedStyle(surface!).backgroundColor)];
      expect((Math.max(...values) + 0.05) / (Math.min(...values) + 0.05)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('associates a visible label and emits controlled string updates', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    function ControlledField() {
      const [value, setValue] = useState('A');
      return <TextField id="display" label="Display name" name="displayName" value={value}
        onValueChange={(next) => { onValueChange(next); setValue(next); }} />;
    }
    render(<ControlledField />);
    const input = screen.getByRole<HTMLInputElement>('textbox', { name: 'Display name' });
    expect(screen.getByLabelText('Display name')).toBe(input);
    expect(input.labels?.[0]?.textContent).toBe('Display name');
    expect(input.name).toBe('displayName');
    expect(input.type).toBe('text');
    await user.click(screen.getByText('Display name'));
    expect(document.activeElement).toBe(input);
    expect(input.style.outline).toBe('');
    await user.type(input, 'da');
    expect(input.value).toBe('Ada');
    expect(onValueChange.mock.calls).toEqual([['Ad'], ['Ada']]);
    await user.clear(input);
    expect(input.value).toBe('');
    expect(onValueChange).toHaveBeenLastCalledWith('');
  });

  it('preserves the supplied value until the caller updates it', async () => {
    const onValueChange = vi.fn();
    const { rerender } = render(<TextField id="fixed" label="Name" value="A" onValueChange={onValueChange} />);
    const input = screen.getByRole<HTMLInputElement>('textbox');
    await userEvent.setup().type(input, 'b');
    expect(onValueChange).toHaveBeenCalledWith('Ab');
    expect(input.value).toBe('A');
    rerender(<TextField id="fixed" label="Name" value="Updated" onValueChange={onValueChange} />);
    expect(input.value).toBe('Updated');
  });

  it('forwards disabled and prevents edits and focus', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<TextField id="disabled" label="Name" value="Ada" onValueChange={onValueChange} disabled />);
    const input = screen.getByRole<HTMLInputElement>('textbox');
    expect(input.disabled).toBe(true);
    await user.type(input, 'x');
    await user.tab();
    expect(document.activeElement).not.toBe(input);
    expect(input.value).toBe('Ada');
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it.each([
    { hint: undefined, error: undefined, ids: null },
    { hint: '', error: '', ids: null },
    { hint: 'Use a short name', error: '', ids: 'name-hint' },
    { hint: '', error: 'Name required', ids: 'name-error' },
    { hint: 'Use a short name', error: 'Name required', ids: 'name-hint name-error' },
  ])('links only nonempty messages: %o', ({ hint, error, ids }) => {
    render(<TextField id="name" label="Name" value="" onValueChange={vi.fn()}
      {...(hint === undefined ? {} : { hint })} {...(error === undefined ? {} : { error })} />);
    const input = screen.getByRole('textbox');
    expect(input.getAttribute('aria-describedby')).toBe(ids);
    expect(input.getAttribute('aria-invalid')).toBe(error ? 'true' : null);
    expect(document.getElementById('name-hint')?.textContent ?? null).toBe(hint || null);
    expect(document.getElementById('name-error')?.textContent ?? null).toBe(error || null);
  });

  it('removes stale message associations when props change', () => {
    const props = { id: 'changing', label: 'Name', value: '', onValueChange: vi.fn() };
    const { rerender } = render(<TextField {...props} hint="Hint" error="Error" />);
    rerender(<TextField {...props} />);
    const input = screen.getByRole('textbox');
    expect(input.hasAttribute('aria-describedby')).toBe(false);
    expect(input.hasAttribute('aria-invalid')).toBe(false);
    expect(document.getElementById('changing-hint')).toBeNull();
    expect(document.getElementById('changing-error')).toBeNull();
  });
});
