export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: {
    readonly code: 'invalid-input' | 'forbidden' | 'stale' | 'decision-required';
    readonly decisionId?: string;
  } };

type View = { readonly revision: number; readonly payloadReference: string };

// Read data properties without invoking caller-provided accessors.
function field(value: unknown, key: string): unknown {
  if (typeof value !== 'object' || value === null) return undefined;
  return Object.getOwnPropertyDescriptor(value, key)?.value as unknown;
}

function revision(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function view(value: unknown): View | undefined {
  const rev = field(value, 'revision');
  const reference = field(value, 'payloadReference');
  return revision(rev) && typeof reference === 'string' && reference.length > 0
    ? { revision: rev, payloadReference: reference }
    : undefined;
}

/** Coalesces opaque references to already recipient-redacted snapshots. */
export function enqueueRecipientView(input: {
  readonly deliveredRevision: number;
  readonly pending: readonly View[];
  readonly incoming: View;
  readonly maxPending: number;
}): Result<{ readonly pending: readonly View[]; readonly discardedRevisions: readonly number[] }> {
  const invalid = { ok: false, error: { code: 'invalid-input' } } as const;
  try {
    const delivered = field(input, 'deliveredRevision');
    const capacity = field(input, 'maxPending');
    const pending = field(input, 'pending');
    const incoming = view(field(input, 'incoming'));
    if (!revision(delivered) || !revision(capacity) || capacity < 1 || capacity > 32
      || !Array.isArray(pending) || !incoming) return invalid;

    const queued: View[] = [];
    let last = delivered;
    for (let index = 0; index < pending.length; index += 1) {
      const entry = view(field(pending, String(index)));
      if (!entry || entry.revision <= last) return invalid;
      queued.push(entry);
      last = entry.revision;
    }

    const discardedRevisions: number[] = [];
    if (incoming.revision <= last) discardedRevisions.push(incoming.revision);
    else queued.push(incoming);

    const overflow = Math.max(0, queued.length - capacity);
    for (const entry of queued.slice(0, overflow)) discardedRevisions.push(entry.revision);
    return { ok: true, value: { pending: queued.slice(overflow), discardedRevisions } };
  } catch {
    // Malformed objects (including revoked proxies) never echo submitted data.
    return invalid;
  }
}
