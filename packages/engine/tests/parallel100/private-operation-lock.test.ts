import { describe, expect, it } from 'vitest';
import { lockOperationChoice, type Phase } from '../../src/parallel100/private-operation-lock.js';

type Input = Parameters<typeof lockOperationChoice>[0];
const initial = (): Input => Object.freeze({
  phase: 'CREW_LOCKED', revision: 12, expectedRevision: 12,
  actorId: 'route-actor', routeOperatorId: 'route-actor', gateOperatorId: 'gate-actor',
  routeOptionIds: Object.freeze(['incident.route.alpha', 'incident.route.beta']),
  gateOptionIds: Object.freeze(['incident.gate.alpha', 'incident.gate.beta']),
  choiceId: 'incident.route.alpha', routeChoice: null, gateChoice: null,
});
const runtime = (value: unknown) => lockOperationChoice(value as Input);

describe('lockOperationChoice private authority state', () => {
  it.each(['route', 'gate'])('locks both operators in %s-first order', (first) => {
    let state: Pick<Input, 'revision' | 'routeChoice' | 'gateChoice'> = {
      revision: 12, routeChoice: null, gateChoice: null,
    };
    const order = first === 'route' ? ['route', 'gate'] : ['gate', 'route'];
    for (const [index, kind] of order.entries()) {
      const result = lockOperationChoice({ ...initial(), ...state, expectedRevision: state.revision,
        actorId: `${kind}-actor`, choiceId: `incident.${kind}.alpha` });
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('Expected lock');
      state = result.value;
      expect(state.revision).toBe(13 + index);
      expect(state).toEqual({ revision: 13 + index,
        routeChoice: kind === 'route' || index === 1 ? 'incident.route.alpha' : null,
        gateChoice: kind === 'gate' || index === 1 ? 'incident.gate.alpha' : null });
      expect(Object.keys(state).sort()).toEqual(['gateChoice', 'revision', 'routeChoice']);
    }
  });

  it.each<Partial<Input>>([
    { actorId: 'outsider' }, { actorId: 'gate-actor' }, { choiceId: 'incident.gate.alpha' },
    { actorId: 'gate-actor', choiceId: 'incident.route.alpha' },
    { routeChoice: 'incident.route.beta' },
    { actorId: 'gate-actor', choiceId: 'incident.gate.alpha', gateChoice: 'incident.gate.beta' },
    { gateOperatorId: 'route-actor' }, { expectedRevision: 11 },
    { revision: -1 }, { revision: 1.5 }, { revision: Number.MAX_SAFE_INTEGER },
    { expectedRevision: NaN }, { actorId: 'bad actor' }, { actorId: 'a'.repeat(65) },
    { choiceId: 'Repair' }, { choiceId: 'Sabotage' }, { choiceId: '' },
    { routeChoice: 'unknown' }, { gateChoice: 'unknown' },
  ])('rejects invalid or unauthorized state without mutation: %j', (patch) => {
    const input = Object.freeze({ ...initial(), ...patch });
    const before = JSON.stringify(input);
    const result = lockOperationChoice(input);
    expect(result.ok).toBe(false);
    expect(JSON.stringify(input)).toBe(before);
    if (!result.ok) expect(Object.keys(result.error)).toEqual(['code']);
  });

  it.each<Phase>(['ROUND_START', 'VOTE_OPEN', 'OPERATION_LOCKED', 'RESOLUTION', 'CITY_MOMENT', 'MATCH_END'])(
    'rejects phase %s', (phase) => expect(lockOperationChoice({ ...initial(), phase }).ok).toBe(false),
  );

  it('reports a stale revision without private data', () => {
    expect(lockOperationChoice({ ...initial(), expectedRevision: 0 })).toEqual({
      ok: false, error: { code: 'stale' },
    });
  });

  it.each([null, undefined, 1, {}, { ...initial(), outcome: 'Repair' },
    { ...initial(), routeOptionIds: [null] }, { ...initial(), gateOptionIds: new Array(1) },
    { ...initial(), gateChoice: undefined }, { ...initial(), revision: '12' },
  ])('contains malformed runtime input', (input) => {
    expect(runtime(input)).toEqual({ ok: false, error: { code: 'invalid-input' } });
  });

  it('never calls input or array getters or string conversions', () => {
    let calls = 0;
    const getter = () => { calls += 1; throw new Error('private input'); };
    const input = Object.defineProperty({ ...initial() }, 'actorId', { get: getter });
    const array = Object.defineProperty(['incident.route.alpha'], '0', { get: getter });
    expect(runtime(input).ok).toBe(false);
    expect(runtime({ ...initial(), routeOptionIds: array }).ok).toBe(false);
    expect(runtime({ ...initial(), choiceId: { toString: getter } }).ok).toBe(false);
    expect(calls).toBe(0);
  });

  it('contains proxy inspection failures', () => {
    expect(runtime(new Proxy(initial(), { ownKeys() { throw new Error('private'); } })))
      .toEqual({ ok: false, error: { code: 'invalid-input' } });
  });

  it('accepts bounded identities and registry-defined semantic options without inventing syntax', () => {
    expect(lockOperationChoice({ ...initial(), actorId: 'a'.repeat(64),
      routeOperatorId: 'a'.repeat(64), routeOptionIds: ['original option'], choiceId: 'original option' }))
      .toEqual({ ok: true, value: { revision: 13, routeChoice: 'original option', gateChoice: null } });
  });
});
