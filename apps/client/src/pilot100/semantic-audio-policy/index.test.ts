import { describe, expect, it } from 'vitest';
import { audioFeedbackPlan } from './index';

const events = [
  'ui.tap', 'vote.open', 'vote.cast', 'bot.vote', 'crew.deploy',
  'district.repair', 'district.sabotage', 'timer.last-ten',
  'match.win', 'match.loss', 'achievement.unlock',
] as const;
const enabled = {
  gestureUnlocked: true, systemMuted: false, sfxEnabled: true, suppressLastTenOnce: false,
};
type Input = Parameters<typeof audioFeedbackPlan>[0];
const decode = (input: unknown) => audioFeedbackPlan(input as Input);
const invalid = { ok: false, error: { code: 'invalid-input' } };

describe('audioFeedbackPlan', () => {
  for (const event of events) {
    it(`preserves ${event} semantics across all preference and suppression combinations`, () => {
      for (const gestureUnlocked of [false, true]) {
        for (const systemMuted of [false, true]) {
          for (const sfxEnabled of [false, true]) {
            for (const suppressLastTenOnce of [false, true]) {
              const input = Object.freeze({ event, gestureUnlocked, systemMuted, sfxEnabled, suppressLastTenOnce });
              const suppressed = event === 'timer.last-ten' && suppressLastTenOnce;
              expect(audioFeedbackPlan(input)).toEqual({
                ok: true,
                value: {
                  cue: gestureUnlocked && !systemMuted && sfxEnabled && !suppressed ? `audio.${event}` : null,
                  visualEvent: event,
                  consumeLastTenSuppression: suppressed,
                },
              });
            }
          }
        }
      }
    });
  }

  it('consumes only the pending timer suppression without mutating or retaining caller state', () => {
    const pending = Object.freeze({ ...enabled, event: 'timer.last-ten' as const, suppressLastTenOnce: true });
    const expected = { ok: true, value: { cue: null, visualEvent: 'timer.last-ten', consumeLastTenSuppression: true } };
    expect(audioFeedbackPlan(pending)).toEqual(expected);
    expect(audioFeedbackPlan({ ...pending, event: 'vote.cast' })).toEqual({
      ok: true, value: { cue: 'audio.vote.cast', visualEvent: 'vote.cast', consumeLastTenSuppression: false },
    });
    expect(audioFeedbackPlan(pending)).toEqual(expected);
    expect(audioFeedbackPlan({ ...pending, suppressLastTenOnce: false })).toEqual({
      ok: true, value: { cue: 'audio.timer.last-ten', visualEvent: 'timer.last-ten', consumeLastTenSuppression: false },
    });
  });

  it('rejects malformed events and flags without coercion or affecting subsequent cues', () => {
    for (const event of ['', 'timer.last-ten ', 'audio.ui.tap', 'toString', 1, null, {}, undefined]) {
      expect(decode({ ...enabled, event })).toEqual(invalid);
    }
    for (const key of Object.keys(enabled)) {
      for (const value of [undefined, null, 0, 1, 'false', {}, []]) {
        expect(decode({ ...enabled, event: 'ui.tap', [key]: value })).toEqual(invalid);
      }
      const missing: Record<string, unknown> = { ...enabled, event: 'ui.tap' };
      delete missing[key];
      expect(decode(missing)).toEqual(invalid);
    }
    for (const value of [null, undefined, [], true, 'ui.tap', 1, {}, Object.create({ ...enabled, event: 'ui.tap' })]) {
      expect(decode(value)).toEqual(invalid);
    }
    expect(audioFeedbackPlan({ ...enabled, event: 'ui.tap' })).toEqual({
      ok: true, value: { cue: 'audio.ui.tap', visualEvent: 'ui.tap', consumeLastTenSuppression: false },
    });
  });

  it('never invokes caller getters or string conversion', () => {
    for (const key of ['event', ...Object.keys(enabled)]) {
      const input = Object.defineProperty({ ...enabled, event: 'ui.tap' }, key, {
        get() { throw new Error('Getter must not run'); },
      });
      expect(decode(input)).toEqual(invalid);
    }
    expect(decode({ ...enabled, event: { toString() { throw new Error('No coercion'); } } })).toEqual(invalid);
  });
});
