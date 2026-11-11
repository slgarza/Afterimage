import { describe, expect, it } from 'vitest';
import { decodePublicChatAction } from '../../src/parallel100/bounded-chat-policy.js';

const context = { verifiedPlayerId: 'member_1', active: true, capabilityEnabled: true, allowedReactionIds: ['agree', '✨'] } as const;
const invalid = { ok: false, error: { code: 'invalid-input' } };

describe('decodePublicChatAction', () => {
  it('returns detached, trimmed text and preserves inert HTML-looking content', () => {
    for (const text of ['hello', '<script>alert("x")</script>', 'a\nb', '🌙'.repeat(280), 'e\u0301']) {
      const input = Object.freeze({ type: 'chat', text: `  ${text}  ` });
      const result = decodePublicChatAction(input, context);
      expect(result).toEqual({ ok: true, value: { type: 'chat', text } });
      if (result.ok) expect(result.value).not.toBe(input);
    }
    expect(decodePublicChatAction(Object.assign(Object.create(null), { type: 'chat', text: 'hi' }), context).ok).toBe(true);
  });

  it('accepts exactly allowlisted semantic reactions without inventing an ID format', () => {
    for (const reactionId of context.allowedReactionIds) {
      const input = { type: 'reaction', reactionId };
      const result = decodePublicChatAction(input, context);
      expect(result).toEqual({ ok: true, value: input });
      if (result.ok) expect(result.value).not.toBe(input);
    }
    expect(decodePublicChatAction({ type: 'reaction', reactionId: 'unknown' }, context)).toEqual(invalid);
  });

  it('denies spectators and disabled capability identically for both actions', () => {
    for (const action of [{ type: 'chat', text: 'hi' }, { type: 'reaction', reactionId: 'agree' }]) {
      for (const denial of [{ active: false }, { capabilityEnabled: false }]) {
        expect(decodePublicChatAction(action, { ...context, ...denial })).toEqual({ ok: false, error: { code: 'forbidden' } });
      }
    }
  });

  it('rejects empty, overlong, non-scalar, and control-bearing text before trimming', () => {
    for (const text of ['', ' \n ', '🌙'.repeat(281), 'a'.repeat(281), '\ud800', '\udfff', '\tvalid', 'valid\r', 'a\u0000b', '\u007f', '\u0085']) {
      expect(decodePublicChatAction({ type: 'chat', text }, context)).toEqual(invalid);
    }
    for (let code = 0; code <= 0x9f; code++) {
      if ((code <= 0x1f || code >= 0x7f) && code !== 10) {
        expect(decodePublicChatAction({ type: 'chat', text: `a${String.fromCharCode(code)}b` }, context)).toEqual(invalid);
      }
    }
  });

  it('requires exact own keys and rejects identity or routing overrides', () => {
    for (const key of ['actor', 'playerId', 'role', 'recipient', 'whisper', 'channel', 'reactionId']) {
      expect(decodePublicChatAction({ type: 'chat', text: 'secret', [key]: 'forged' }, context)).toEqual(invalid);
    }
    for (const input of [null, [], 'chat', {}, { type: 'chat' }, { type: 'chat', other: 'x' }, { type: 'reaction', text: 'agree' }, { type: 'chat', text: 1 }, { type: 'chat', text: 'hi', [Symbol()]: true }, Object.create({ type: 'chat', text: 'hi' })]) {
      expect(decodePublicChatAction(input, context)).toEqual(invalid);
    }
  });

  it('does not invoke getters or coercion and contains inspection failures', () => {
    let calls = 0;
    const getter = () => { calls++; throw new Error('private payload'); };
    for (const key of ['type', 'text', 'extra']) {
      const input = { type: 'chat', text: 'hi' };
      Object.defineProperty(input, key, { get: getter });
      expect(decodePublicChatAction(input, context)).toEqual(invalid);
    }
    expect(decodePublicChatAction({ type: 'chat', text: { toString: getter } }, context)).toEqual(invalid);
    const unsafeContext = { ...context };
    Object.defineProperty(unsafeContext, 'verifiedPlayerId', { get: getter });
    expect(decodePublicChatAction({}, unsafeContext)).toEqual(invalid);
    const allowed = ['agree'];
    Object.defineProperty(allowed, '0', { get: getter });
    expect(decodePublicChatAction({ type: 'reaction', reactionId: 'agree' }, { ...context, allowedReactionIds: allowed })).toEqual(invalid);
    expect(decodePublicChatAction(new Proxy({}, { ownKeys: getter }), context)).toEqual(invalid);
    expect(calls).toBe(1); // Only the deliberately hostile proxy trap runs.
  });

  it('rejects malformed verified identities without echoing them', () => {
    for (const verifiedPlayerId of ['', 'a'.repeat(65), 'private identity', 'x\n']) {
      expect(decodePublicChatAction({ type: 'chat', text: 'hi' }, { ...context, verifiedPlayerId })).toEqual(invalid);
    }
  });
});
