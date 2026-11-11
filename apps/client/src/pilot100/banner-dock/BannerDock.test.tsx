// @vitest-environment jsdom
/// <reference types="node" />
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { URL as NodeURL } from 'node:url';
import { BannerDock, type BannerDockProps } from './index';

const styles = readFileSync(new NodeURL('./banner-dock.css', import.meta.url), 'utf8');

afterEach(cleanup);

const props: BannerDockProps = Object.freeze({
  platform: 'ios',
  adsRemoved: false,
  reservedHeight: 64,
  state: 'loading',
  label: 'Advertisement space',
});

describe('BannerDock', () => {
  it.each(['ios', 'android'] as const)('retains the same %s frame across provider states', (platform) => {
    const { rerender } = render(<BannerDock {...props} platform={platform} />);
    const frame = screen.getByRole('complementary', { name: props.label });
    for (const state of ['loading', 'loaded', 'failed', 'unavailable'] as const) {
      rerender(<BannerDock {...props} platform={platform} state={state} />);
      expect(screen.getByRole('complementary')).toBe(frame);
      expect(frame.parentElement?.style.getPropertyValue('--afterimage-banner-height')).toBe('64px');
      expect(frame.getAttribute('data-state')).toBe(state);
      expect(frame.childNodes.length).toBe(0);
      expect(frame.getAttribute('tabindex')).toBeNull();
    }
    expect(props.state).toBe('loading');
  });

  it('collapses on web or entitlement changes and restores the supplied reservation', () => {
    const { rerender, container } = render(<BannerDock {...props} />);
    for (const overrides of [{ platform: 'web' as const }, { adsRemoved: true }]) {
      rerender(<BannerDock {...props} {...overrides} />);
      expect(screen.queryByRole('complementary')).toBeNull();
      expect(container.firstElementChild?.hasAttribute('hidden')).toBe(true);
      expect(container.querySelector('.afterimage-banner-reservation')).toBeNull();
      expect(container.textContent).toBe('');
    }
    rerender(<BannerDock {...props} reservedHeight={90} label="Native banner space" />);
    const frame = screen.getByRole('complementary', { name: 'Native banner space' });
    expect(frame.parentElement?.style.getPropertyValue('--afterimage-banner-height')).toBe('90px');
  });

  it.each([-1, -Infinity, Infinity, NaN, 0])('collapses unsafe or empty height %s', (reservedHeight) => {
    const { container, rerender } = render(<BannerDock {...props} />);
    rerender(<BannerDock {...props} reservedHeight={reservedHeight} />);
    expect(container.firstElementChild?.hasAttribute('hidden')).toBe(true);
    expect(container.querySelector('aside')).toBeNull();
    expect((container.firstElementChild as HTMLElement).style.cssText).toBe('');
  });

  it('defines matching reservation and fixed-frame heights including bottom safe area', () => {
    // jsdom cannot measure viewport/safe-area geometry; verify the CSS contract.
    const heightRule = 'height: calc(var(--afterimage-banner-height) + env(safe-area-inset-bottom, 0px))';
    expect(styles.split(heightRule)).toHaveLength(3);
    expect(styles).toContain('position: fixed');
    expect(styles).toContain('padding-bottom: env(safe-area-inset-bottom, 0px)');
    expect(styles).toContain('pointer-events: none');
  });
});
