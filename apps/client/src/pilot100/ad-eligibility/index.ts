export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: {
    readonly code: 'invalid-input' | 'forbidden' | 'stale' | 'decision-required';
    readonly decisionId?: string;
  } };

export function adEligibility(input: {
  readonly platform: 'web' | 'native';
  readonly adsRemoved: boolean;
  readonly consentAllowed: boolean;
  readonly completedMatches: number;
  readonly lastInterstitialAfterMatch: number | null;
  readonly matchEndRead: boolean;
  readonly exitingCompletedMatch: boolean;
  readonly livePhaseVisible: boolean;
  readonly blockingModal: boolean;
  readonly adAvailable: boolean;
}): Result<{
  readonly reserveBannerDock: boolean;
  readonly mayRequestBanner: boolean;
  readonly mayShowInterstitial: boolean;
  readonly blockNavigation: false;
}> {
  const invalid = { ok: false, error: { code: 'invalid-input' } } as const;
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return invalid;

  // Read only own data properties: malformed accessors must never execute.
  const values: Record<string, unknown> = {};
  const flags = [
    'adsRemoved', 'consentAllowed', 'matchEndRead', 'exitingCompletedMatch',
    'livePhaseVisible', 'blockingModal', 'adAvailable',
  ] as const;
  try {
    for (const key of ['platform', 'completedMatches', 'lastInterstitialAfterMatch', ...flags]) {
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (!descriptor || !('value' in descriptor)) return invalid;
      values[key] = descriptor.value;
    }
  } catch {
    return invalid;
  }
  const { platform, completedMatches, lastInterstitialAfterMatch } = values;
  if (platform !== 'native' && platform !== 'web') return invalid;
  if (flags.some((key) => typeof values[key] !== 'boolean')) return invalid;
  if (typeof completedMatches !== 'number' || !Number.isSafeInteger(completedMatches)
    || completedMatches < 0) return invalid;
  if (lastInterstitialAfterMatch !== null
    && (typeof lastInterstitialAfterMatch !== 'number'
      || !Number.isSafeInteger(lastInterstitialAfterMatch)
      || lastInterstitialAfterMatch < 0
      || lastInterstitialAfterMatch > completedMatches)) return invalid;

  const reserveBannerDock = platform === 'native' && !values.adsRemoved;
  const mayRequestBanner = reserveBannerDock && values.consentAllowed === true;
  return {
    ok: true,
    value: {
      reserveBannerDock,
      mayRequestBanner,
      mayShowInterstitial: mayRequestBanner && values.adAvailable === true
        && values.exitingCompletedMatch === true && values.matchEndRead === true
        && !values.livePhaseVisible && !values.blockingModal
        && completedMatches >= 2
        && completedMatches - (lastInterstitialAfterMatch ?? 0) >= 2,
      blockNavigation: false,
    },
  };
}
