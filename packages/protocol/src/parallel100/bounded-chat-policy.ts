export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: {
    readonly code: 'invalid-input' | 'forbidden' | 'stale' | 'decision-required';
    readonly decisionId?: string;
  } };

type PublicChatAction =
  | { readonly type: 'chat'; readonly text: string }
  | { readonly type: 'reaction'; readonly reactionId: string };

function dataRecord(input: unknown): Record<string, unknown> | undefined {
  if (typeof input !== 'object' || input === null) return undefined;
  const prototype: unknown = Object.getPrototypeOf(input);
  if (prototype !== null && prototype !== Object.prototype) return undefined;
  const record: Record<string, unknown> = Object.create(null);
  for (const key of Reflect.ownKeys(input)) {
    if (typeof key !== 'string') return undefined;
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (!descriptor || !('value' in descriptor)) return undefined;
    record[key] = descriptor.value;
  }
  return record;
}

/** Decodes public data using an identity already verified by the caller. */
export function decodePublicChatAction(input: unknown, context: {
  readonly verifiedPlayerId: string;
  readonly active: boolean;
  readonly capabilityEnabled: boolean;
  readonly allowedReactionIds: readonly string[];
}): Result<PublicChatAction> {
  const invalid: Result<PublicChatAction> = { ok: false, error: { code: 'invalid-input' } };
  try {
    const trusted = dataRecord(context);
    if (!trusted || typeof trusted.verifiedPlayerId !== 'string'
      || !/^[A-Za-z0-9_-]{1,64}$/.test(trusted.verifiedPlayerId)
      || typeof trusted.active !== 'boolean' || typeof trusted.capabilityEnabled !== 'boolean') return invalid;
    if (!trusted.active || !trusted.capabilityEnabled) return { ok: false, error: { code: 'forbidden' } };

    const action = dataRecord(input);
    if (!action || Object.keys(action).length !== 2) return invalid;
    if (action.type === 'chat' && typeof action.text === 'string') {
      // Check before trimming so trimming cannot hide prohibited controls.
      for (const character of action.text) {
        if (character !== '\n' && /\p{Cc}/u.test(character)) return invalid;
      }
      const text = action.text.trim();
      let count = 0;
      for (const scalar of text) {
        const point = scalar.codePointAt(0)!;
        if ((point >= 0xd800 && point <= 0xdfff) || ++count > 280) return invalid;
      }
      return count === 0 ? invalid : { ok: true, value: { type: 'chat', text } };
    }
    if (action.type === 'reaction' && typeof action.reactionId === 'string') {
      const allowed: unknown = trusted.allowedReactionIds;
      if (!Array.isArray(allowed)) return invalid;
      const length = Object.getOwnPropertyDescriptor(allowed, 'length');
      if (!length || !('value' in length) || !Number.isSafeInteger(length.value)) return invalid;
      let found = false;
      for (let index = 0; index < length.value; index++) {
        const item = Object.getOwnPropertyDescriptor(allowed, String(index));
        if (!item || !('value' in item) || typeof item.value !== 'string') return invalid;
        if (item.value === action.reactionId) found = true;
      }
      if (found) return { ok: true, value: { type: 'reaction', reactionId: action.reactionId } };
    }
    return invalid;
  } catch {
    return invalid;
  }
}
