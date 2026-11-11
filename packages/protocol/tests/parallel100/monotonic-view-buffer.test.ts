import { describe, expect, it } from 'vitest';
import { enqueueRecipientView } from '../../src/parallel100/monotonic-view-buffer.js';

const view = (revision: number, payloadReference = `redacted:${revision}`) => ({ revision, payloadReference });
const fixture = () => ({ deliveredRevision: 2, pending: [view(3), view(5)], incoming: view(7), maxPending: 3 });
const invalid = { ok: false, error: { code: 'invalid-input' } };
type Input = Parameters<typeof enqueueRecipientView>[0];
const run = (input: unknown) => enqueueRecipientView(input as Input);

describe('enqueueRecipientView', () => {
  it('queues increasing revisions in arrival order, allowing gaps', () => {
    let pending: Input['pending'] = [];
    for (const revision of [3, 5, 7]) {
      const result = enqueueRecipientView({ ...fixture(), pending, incoming: view(revision) });
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('Expected queued view');
      expect(result.value.discardedRevisions).toEqual([]);
      pending = result.value.pending;
    }
    expect(pending).toEqual([view(3), view(5), view(7)]);
  });

  it.each([0, 1, 2, 3, 4, 5])('discards stale revision %s without replacing references', (revision) => {
    expect(enqueueRecipientView({ ...fixture(), incoming: view(revision, 'old-private-reference') })).toEqual({
      ok: true, value: { pending: [view(3), view(5)], discardedRevisions: [revision] },
    });
  });

  it.each([1, 2, 32])('retains the newest entries at capacity %s', (maxPending) => {
    const pending = Array.from({ length: maxPending }, (_, index) => view(index + 3));
    expect(enqueueRecipientView({ ...fixture(), pending, incoming: view(maxPending + 3), maxPending })).toEqual({
      ok: true,
      value: { pending: [...pending.slice(1), view(maxPending + 3)], discardedRevisions: [3] },
    });
  });

  it('coalesces multiple oldest entries when capacity shrinks', () => {
    expect(enqueueRecipientView({ ...fixture(), maxPending: 1 })).toEqual({
      ok: true, value: { pending: [view(7)], discardedRevisions: [3, 5] },
    });
  });

  it('handles safe integer limits and opaque references without normalization', () => {
    expect(enqueueRecipientView({ deliveredRevision: 0, pending: [], incoming: view(Number.MAX_SAFE_INTEGER, ' '), maxPending: 1 })).toEqual({
      ok: true, value: { pending: [view(Number.MAX_SAFE_INTEGER, ' ')], discardedRevisions: [] },
    });
  });

  it.each([-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '3', null])('rejects unsafe revision %s atomically', (revision) => {
    for (const input of [
      { ...fixture(), deliveredRevision: revision },
      { ...fixture(), incoming: { ...view(7), revision } },
      { ...fixture(), pending: [{ ...view(3), revision }] },
    ]) expect(run(input)).toEqual(invalid);
  });

  it.each([0, -1, 33, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '2'])('rejects unsafe capacity %s', (maxPending) => {
    expect(run({ ...fixture(), maxPending })).toEqual(invalid);
  });

  it.each([[view(2)], [view(5), view(3)], [view(3), view(3)], [view(3, '')], [null], new Array(1)].map((pending) => [pending] as const))('rejects invalid buffers', (pending) => {
    expect(run({ ...fixture(), pending })).toEqual(invalid);
  });

  it.each([null, undefined, {}, { ...fixture(), pending: {} }, { ...fixture(), incoming: view(1, '') }])('rejects malformed input without returning snapshots', (input) => {
    expect(run(input)).toEqual(invalid);
  });

  it('does not invoke accessors or stringify malformed references', () => {
    const fail = () => { throw new Error('Accessor invoked'); };
    let calls = 0;
    const accessor = { get revision() { calls += 1; return fail(); }, payloadReference: 'secret' };
    expect(run({ ...fixture(), incoming: accessor })).toEqual(invalid);
    expect(run({ ...fixture(), incoming: { revision: 7, payloadReference: { toString: fail } } })).toEqual(invalid);
    expect(calls).toBe(0);
  });

  it('preserves frozen inputs and detaches only allowed fields', () => {
    const entry = Object.freeze({ ...view(3), rawSnapshot: 'secret' });
    const input = Object.freeze({ ...fixture(), pending: Object.freeze([entry]), incoming: Object.freeze(view(7)) });
    const result = enqueueRecipientView(input);
    expect(result).toEqual({ ok: true, value: { pending: [view(3), view(7)], discardedRevisions: [] } });
    if (!result.ok) throw new Error('Expected queued view');
    expect(result.value.pending).not.toBe(input.pending);
    expect(result.value.pending[0]).not.toBe(entry);
    expect(result.value.pending[1]).not.toBe(input.incoming);
    Object.assign(result.value.pending[0]!, { revision: 99 });
    expect(entry.revision).toBe(3);
  });
});
