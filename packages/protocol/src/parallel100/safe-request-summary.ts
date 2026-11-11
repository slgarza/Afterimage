/** Read a single own data field without invoking accessors or coercion. */
function ownDataValue(input: object, key: string): unknown {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    return descriptor && Object.hasOwn(descriptor, 'value')
      ? descriptor.value as unknown
      : undefined;
  } catch {
    return undefined;
  }
}

/** Privacy allowlist for request metadata; payload and intent are never read. */
export function safeRequestSummary(input: unknown): {
  readonly kind: 'lobby-create' | 'lobby-join' | 'profile' | 'ready' | 'settings' | 'crew-vote' | 'operation-choice' | 'power-target' | 'containment-vote' | 'request-advance' | 'unknown';
  readonly requestId: string | null;
} {
  if (input === null || (typeof input !== 'object' && typeof input !== 'function')) {
    return { kind: 'unknown', requestId: null };
  }

  const type = ownDataValue(input, 'type');
  const id = ownDataValue(input, 'requestId');
  const requestId = typeof id === 'string' && id.length >= 1 && id.length <= 64
    && !/[^A-Za-z0-9_-]/u.test(id) ? id : null;

  switch (type) {
    case 'lobby-create':
    case 'lobby-join':
    case 'profile':
    case 'ready':
    case 'settings':
    case 'crew-vote':
    case 'operation-choice':
    case 'power-target':
    case 'containment-vote':
    case 'request-advance':
      return { kind: type, requestId };
    default:
      return { kind: 'unknown', requestId };
  }
}
