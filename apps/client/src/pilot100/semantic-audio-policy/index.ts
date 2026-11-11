export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: {
      readonly code: 'invalid-input' | 'forbidden' | 'stale' | 'decision-required';
      readonly decisionId?: string;
    } };

const events = new Set([
  'ui.tap', 'vote.open', 'vote.cast', 'bot.vote', 'crew.deploy',
  'district.repair', 'district.sabotage', 'timer.last-ten',
  'match.win', 'match.loss', 'achievement.unlock',
]);

export function audioFeedbackPlan(input: {
  readonly event: 'ui.tap' | 'vote.open' | 'vote.cast' | 'bot.vote' | 'crew.deploy' | 'district.repair' | 'district.sabotage' | 'timer.last-ten' | 'match.win' | 'match.loss' | 'achievement.unlock';
  readonly gestureUnlocked: boolean; readonly systemMuted: boolean; readonly sfxEnabled: boolean;
  readonly suppressLastTenOnce: boolean;
}): Result<{ readonly cue: string | null; readonly visualEvent: string; readonly consumeLastTenSuppression: boolean }> {
  const invalid: Result<never> = { ok: false, error: { code: 'invalid-input' } };
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return invalid;

  // Read data descriptors so malformed runtime inputs cannot invoke getters.
  const values: Record<string, unknown> = {};
  try {
    for (const key of ['event', 'gestureUnlocked', 'systemMuted', 'sfxEnabled', 'suppressLastTenOnce']) {
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (!descriptor || !('value' in descriptor)) return invalid;
      values[key] = descriptor.value;
    }
  } catch {
    return invalid;
  }
  const { event, gestureUnlocked, systemMuted, sfxEnabled, suppressLastTenOnce } = values;
  if (typeof event !== 'string' || !events.has(event)
    || typeof gestureUnlocked !== 'boolean' || typeof systemMuted !== 'boolean'
    || typeof sfxEnabled !== 'boolean' || typeof suppressLastTenOnce !== 'boolean') return invalid;

  const consumeLastTenSuppression = event === 'timer.last-ten' && suppressLastTenOnce;
  return {
    ok: true,
    value: {
      cue: gestureUnlocked && !systemMuted && sfxEnabled && !consumeLastTenSuppression
        ? `audio.${event}` : null,
      visualEvent: event,
      consumeLastTenSuppression,
    },
  };
}
