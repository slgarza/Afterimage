import { describe, expect, test } from 'vitest';
import { adEligibility } from './index';

type Input = Parameters<typeof adEligibility>[0];
const eligible: Input = Object.freeze({
  platform: 'native', adsRemoved: false, consentAllowed: true,
  completedMatches: 2, lastInterstitialAfterMatch: null,
  matchEndRead: true, exitingCompletedMatch: true,
  livePhaseVisible: false, blockingModal: false, adAvailable: true,
});
const disabled = {
  reserveBannerDock: false, mayRequestBanner: false,
  mayShowInterstitial: false, blockNavigation: false,
};

describe('adEligibility', () => {
  test('web and Remove Ads disable every format and dock', () => {
    for (const platform of ['web', 'native'] as const) {
      for (const adsRemoved of [false, true]) {
        if (platform === 'native' && !adsRemoved) continue;
        expect(adEligibility({ ...eligible, platform, adsRemoved }))
          .toEqual({ ok: true, value: disabled });
      }
    }
  });

  test('native free dock persists across consent, load, phase and modal states', () => {
    for (const consentAllowed of [false, true]) {
      for (const adAvailable of [false, true]) {
        for (const livePhaseVisible of [false, true]) {
          for (const blockingModal of [false, true]) {
            const result = adEligibility({
              ...eligible, consentAllowed, adAvailable, livePhaseVisible, blockingModal,
            });
            expect(result).toEqual({ ok: true, value: {
              reserveBannerDock: true, mayRequestBanner: consentAllowed,
              mayShowInterstitial: consentAllowed && adAvailable
                && !livePhaseVisible && !blockingModal,
              blockNavigation: false,
            } });
          }
        }
      }
    }
  });

  test.each([
    { completedMatches: 0 }, { completedMatches: 1 }, { matchEndRead: false },
    { exitingCompletedMatch: false }, { consentAllowed: false },
    { adAvailable: false }, { livePhaseVisible: true }, { blockingModal: true },
  ])('blocks interstitial for %j without blocking navigation', (override) => {
    expect(adEligibility({ ...eligible, ...override })).toMatchObject({
      ok: true, value: { mayShowInterstitial: false, blockNavigation: false },
    });
  });

  test.each([
    [2, null, true], [2, 0, true], [2, 1, false], [2, 2, false],
    [3, 2, false], [4, 2, true], [5, 4, false], [6, 4, true],
    [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER - 2, true],
    [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER - 1, false],
  ] as const)('match %s after %s has eligibility %s', (completedMatches, lastInterstitialAfterMatch, expected) => {
    expect(adEligibility({ ...eligible, completedMatches, lastInterstitialAfterMatch }))
      .toMatchObject({ ok: true, value: { mayShowInterstitial: expected, blockNavigation: false } });
  });

  test('rejects malformed counters on all platforms, including paid builds', () => {
    const bad = [-1, 1.5, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1, '2', undefined, {}, null];
    for (const platform of ['native', 'web'] as const) {
      for (const adsRemoved of [true, false]) {
        for (const key of ['completedMatches', 'lastInterstitialAfterMatch']) {
          for (const value of bad) {
            if (key === 'lastInterstitialAfterMatch' && value === null) continue;
            expect(adEligibility({ ...eligible, platform, adsRemoved, [key]: value } as Input))
              .toEqual({ ok: false, error: { code: 'invalid-input' } });
          }
        }
      }
    }
    expect(adEligibility({ ...eligible, lastInterstitialAfterMatch: 3 }))
      .toEqual({ ok: false, error: { code: 'invalid-input' } });
  });

  test('rejects malformed objects, platforms and flags without coercion or getters', () => {
    const invalid: unknown[] = [null, undefined, [], 2, 'native', {},
      { ...eligible, platform: 'ios' }, Object.create(eligible)];
    for (const key of Object.keys(eligible).filter((key) => typeof eligible[key as keyof Input] === 'boolean')) {
      invalid.push({ ...eligible, [key]: 'true' });
    }
    let getterCalls = 0;
    for (const key of Object.keys(eligible)) {
      invalid.push(Object.defineProperty({ ...eligible }, key, {
        get() { getterCalls++; throw new Error('must not execute'); },
      }));
    }
    for (const input of invalid) {
      expect(adEligibility(input as Input)).toEqual({ ok: false, error: { code: 'invalid-input' } });
    }
    expect(getterCalls).toBe(0);
  });

  test('is repeatable, leaves frozen input intact and returns detached results', () => {
    const first = adEligibility(eligible);
    const second = adEligibility(eligible);
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    if (first.ok && second.ok) expect(first.value).not.toBe(second.value);
    expect(eligible.completedMatches).toBe(2);
  });
});
