import { describe, expect, it } from 'vitest';
import { nextShiftLead } from '../../src/parallel100/shift-lead-rotation.js';

type Input = Parameters<typeof nextShiftLead>[0];
const invalid = { ok: false, error: { code: 'invalid-input' } };
const seats = Object.freeze([
  Object.freeze({ id: 'zebra', active: true }),
  Object.freeze({ id: 'alpha', active: false }),
  Object.freeze({ id: 'middle', active: true }),
  Object.freeze({ id: 'beta', active: true }),
]);

describe('nextShiftLead', () => {
  it.each([
    [null, 'zebra'], ['zebra', 'middle'], ['alpha', 'middle'],
    ['middle', 'beta'], ['beta', 'zebra'],
  ])('rotates from %s to %s in original seat order', (previousLeadId, leadId) => {
    expect(nextShiftLead(Object.freeze({ seats, previousLeadId })))
      .toEqual({ ok: true, value: { leadId } });
  });

  it('starts at the first active seat and returns the sole active lead after wrapping', () => {
    const sparse = [{ id: 'first', active: false }, { id: 'last', active: true }];
    for (const previousLeadId of [null, 'first', 'last']) {
      expect(nextShiftLead({ seats: sparse, previousLeadId }))
        .toEqual({ ok: true, value: { leadId: 'last' } });
    }
    expect(nextShiftLead({ seats: [{ id: 'only', active: true }], previousLeadId: 'only' }))
      .toEqual({ ok: true, value: { leadId: 'only' } });
  });

  it('ignores Jam, cooldown and alias metadata on active seats', () => {
    const active = [{ id: 'p1', active: true, jammed: true, cooldown: 99, alias: 'ZZZ' }];
    expect(nextShiftLead({ seats: active, previousLeadId: null }))
      .toEqual({ ok: true, value: { leadId: 'p1' } });
  });

  it.each([
    { seats: [], previousLeadId: null },
    { seats: [{ id: 'x', active: true }, { id: 'x', active: false }], previousLeadId: null },
    { seats, previousLeadId: 'unknown' },
    { seats: [{ id: 'x', active: false }], previousLeadId: null },
  ])('rejects invalid rotation states without mutation', (input) => {
    const before = JSON.stringify(input);
    expect(nextShiftLead(input)).toEqual(invalid);
    expect(JSON.stringify(input)).toBe(before);
  });

  it.each([
    null, undefined, {}, { seats: {}, previousLeadId: null },
    { seats, previousLeadId: undefined }, { seats, previousLeadId: 1 },
    ...['', 'a b', 'é', 'x'.repeat(65)].map((id) => ({
      seats: [{ id, active: true }], previousLeadId: null,
    })),
    { seats: [{ id: 'x', active: 1 }], previousLeadId: null },
    { seats: [null], previousLeadId: null },
    { seats: Array(1), previousLeadId: null },
  ])('rejects malformed runtime input safely: %j', (input) => {
    expect(nextShiftLead(input as Input)).toEqual(invalid);
  });

  it('accepts the complete frozen identity alphabet and maximum length', () => {
    const id = `Az09_-${'x'.repeat(58)}`;
    expect(nextShiftLead({ seats: [{ id, active: true }], previousLeadId: null }))
      .toEqual({ ok: true, value: { leadId: id } });
  });

  it('does not invoke caller accessors or conversions', () => {
    let calls = 0;
    const getter = () => { calls++; throw new Error('must not execute'); };
    const inputs = [
      Object.defineProperty({ previousLeadId: null }, 'seats', { get: getter }),
      Object.defineProperty({ seats }, 'previousLeadId', { get: getter }),
      { seats: [Object.defineProperty({ active: true }, 'id', { get: getter })], previousLeadId: null },
      { seats: [Object.defineProperty({ id: 'x' }, 'active', { get: getter })], previousLeadId: null },
      { seats: Object.defineProperty([null], '0', { get: getter }), previousLeadId: null },
      { seats: [{ id: { toString: getter }, active: true }], previousLeadId: null },
    ];
    for (const input of inputs) expect(nextShiftLead(input as Input)).toEqual(invalid);
    expect(calls).toBe(0);
  });

  it('returns detached results and leaves frozen inputs intact', () => {
    const input = Object.freeze({ seats, previousLeadId: null });
    const first = nextShiftLead(input);
    const second = nextShiftLead(input);
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    if (first.ok && second.ok) expect(first.value).not.toBe(second.value);
    expect(seats.map((seat) => seat.id)).toEqual(['zebra', 'alpha', 'middle', 'beta']);
  });
});
