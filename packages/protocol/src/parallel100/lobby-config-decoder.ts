export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: {
    readonly code: 'invalid-input' | 'forbidden' | 'stale' | 'decision-required';
    readonly decisionId?: string;
  } };

type LobbyConfiguration = {
  readonly name: string;
  readonly seats: 5 | 6 | 7 | 8 | 9 | 10;
  readonly roundSeconds: 30 | 60 | 90 | 120;
  readonly fillBots: boolean;
  readonly difficulty: 'calm' | 'standard' | 'sharp';
  readonly listed: boolean;
  readonly requirePasscode: boolean;
  readonly passcode: string | null;
};

const keys = ['name', 'seats', 'roundSeconds', 'fillBots', 'difficulty', 'listed',
  'requirePasscode', 'passcode'] as const;

function invalid(): Result<never> {
  return { ok: false, error: { code: 'invalid-input' } };
}

function validText(value: unknown, maximum: number): value is string {
  if (typeof value !== 'string' || /\p{Cc}/u.test(value)) return false;
  let length = 0;
  for (const scalar of value) {
    const point = scalar.codePointAt(0)!;
    if (point >= 0xd800 && point <= 0xdfff) return false;
    if (++length > maximum) return false;
  }
  return length > 0;
}

/** Decode transport data only; callers must keep the returned passcode transient. */
export function decodeLobbyConfiguration(input: unknown): Result<LobbyConfiguration> {
  try {
    if (input === null || typeof input !== 'object') return invalid();
    const prototype: unknown = Object.getPrototypeOf(input);
    if (prototype !== Object.prototype && prototype !== null) return invalid();
    const ownKeys = Reflect.ownKeys(input);
    if (ownKeys.length !== keys.length) return invalid();
    const fields: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const key of ownKeys) {
      if (typeof key !== 'string' || !keys.some((allowed) => allowed === key)) return invalid();
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (!descriptor || !('value' in descriptor)) return invalid();
      fields[key] = descriptor.value;
    }
    const { name, seats, roundSeconds, fillBots, difficulty, listed, requirePasscode, passcode } = fields;
    if (!validText(name, 48) || name.trim() !== name) return invalid();
    if (seats !== 5 && seats !== 6 && seats !== 7 && seats !== 8 && seats !== 9 && seats !== 10) return invalid();
    if (roundSeconds !== 30 && roundSeconds !== 60 && roundSeconds !== 90 && roundSeconds !== 120) return invalid();
    if (typeof fillBots !== 'boolean' || typeof listed !== 'boolean' || typeof requirePasscode !== 'boolean') return invalid();
    if (difficulty !== 'calm' && difficulty !== 'standard' && difficulty !== 'sharp') return invalid();
    if (requirePasscode ? !validText(passcode, 64) : passcode !== null) return invalid();
    // Explicit construction detaches the result and never retains the source object.
    return { ok: true, value: {
      name, seats, roundSeconds, fillBots, difficulty, listed, requirePasscode,
      passcode: passcode as string | null,
    } };
  } catch {
    // Reflection can throw for hostile/revoked proxies. Never expose their errors.
    return invalid();
  }
}
