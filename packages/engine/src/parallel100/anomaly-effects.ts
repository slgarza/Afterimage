export type IncidentId = 'I01' | 'I02' | 'I03' | 'I04' | 'I05' | 'I06';

export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: {
      readonly code: 'invalid-input' | 'forbidden' | 'stale' | 'decision-required';
      readonly decisionId?: string;
    } };

export function incidentAnomalyEffect(input: {
  readonly incidentId: IncidentId;
}): Result<{
  readonly effect: 'reduce-next-round-by-10' | 'shuffle-vote-cards' | 'redact-one-feed-line' | 'obscure-map-route' | 'suppress-last-ten-audio-once';
  readonly decisionRequired: 'D-TIMER-COMPOSITION' | null;
}> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { ok: false, error: { code: 'invalid-input' } };
  }
  // Inspect the own data property without invoking a caller-provided getter.
  const descriptor = Object.getOwnPropertyDescriptor(input, 'incidentId');
  const incidentId: unknown = descriptor && 'value' in descriptor ? descriptor.value : undefined;
  switch (incidentId) {
    case 'I01':
      return { ok: true, value: { effect: 'reduce-next-round-by-10', decisionRequired: 'D-TIMER-COMPOSITION' } };
    case 'I02':
      return { ok: true, value: { effect: 'shuffle-vote-cards', decisionRequired: null } };
    case 'I03':
      return { ok: true, value: { effect: 'redact-one-feed-line', decisionRequired: null } };
    case 'I04':
      return { ok: false, error: { code: 'decision-required', decisionId: 'D-I04-JAM-TARGET' } };
    case 'I05':
      return { ok: true, value: { effect: 'obscure-map-route', decisionRequired: null } };
    case 'I06':
      return { ok: true, value: { effect: 'suppress-last-ten-audio-once', decisionRequired: null } };
    default:
      return { ok: false, error: { code: 'invalid-input' } };
  }
}
