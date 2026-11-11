import { describe, expect, it, vi } from 'vitest';

import { resolveOperationPair } from '../../src/parallel100/operation-outcome.js';

type Input = Parameters<typeof resolveOperationPair>[0];
const invalid = { ok: false, error: { code: 'invalid-input' } };
const repair = { outcome: 'repair', repairDelta: 1, sabotageDelta: 0, trace: 'safe' };
const sabotage = { outcome: 'sabotage', repairDelta: 0, sabotageDelta: 1, trace: 'corrupted' };
const anomaly = { outcome: 'anomaly', repairDelta: 0, sabotageDelta: 0, trace: 'mixed' };

// Independently specified row-major truth tables from Rules v1 §5.
const matrices = [
  { routes: ['North Relay', 'Core Bypass', 'Reservoir'],
    gates: ['Phase Lock', 'Ground Bridge', 'Load Shed'],
    safe: { routeId: 'Core Bypass', gateId: 'Ground Bridge' },
    corrupted: { routeId: 'Reservoir', gateId: 'Phase Lock' },
    expected: [anomaly, anomaly, anomaly, anomaly, repair, anomaly, sabotage, anomaly, anomaly] },
  { routes: ['Metro Loop', 'Freight Spine', 'Skyway'],
    gates: ['West Gate', 'Central Gate', 'East Gate'],
    safe: { routeId: 'Metro Loop', gateId: 'East Gate' },
    corrupted: { routeId: 'Freight Spine', gateId: 'Central Gate' },
    expected: [anomaly, anomaly, repair, anomaly, sabotage, anomaly, anomaly, anomaly, anomaly] },
  { routes: ['Archive Vault', 'Civic Cloud', 'Street Cache'],
    gates: ['Mirror Seal', 'Paper Trail', 'Cold Store'],
    safe: { routeId: 'Civic Cloud', gateId: 'Cold Store' },
    corrupted: { routeId: 'Street Cache', gateId: 'Mirror Seal' },
    expected: [anomaly, anomaly, anomaly, anomaly, anomaly, repair, sabotage, anomaly, anomaly] },
  { routes: ['Triage Link', 'Surgical Grid', 'Emergency Battery'],
    gates: ['Sterile Gate', 'Backup Gate', 'Flood Gate'],
    safe: { routeId: 'Emergency Battery', gateId: 'Backup Gate' },
    corrupted: { routeId: 'Surgical Grid', gateId: 'Flood Gate' },
    expected: [anomaly, anomaly, anomaly, anomaly, anomaly, sabotage, anomaly, repair, anomaly] },
  { routes: ['Upper Conduit', 'River Switch', 'Drain Relay'],
    gates: ['Pressure Lock', 'Sluice Gate', 'Dry Dock'],
    safe: { routeId: 'Drain Relay', gateId: 'Sluice Gate' },
    corrupted: { routeId: 'River Switch', gateId: 'Pressure Lock' },
    expected: [anomaly, anomaly, anomaly, sabotage, anomaly, anomaly, anomaly, repair, anomaly] },
  { routes: ['Cold Stack', 'Glass Array', 'Night Beacon'],
    gates: ['Halo Lock', 'Ember Gate', 'Ash Filter'],
    safe: { routeId: 'Glass Array', gateId: 'Ash Filter' },
    corrupted: { routeId: 'Night Beacon', gateId: 'Ember Gate' },
    expected: [anomaly, anomaly, anomaly, anomaly, anomaly, repair, anomaly, sabotage, anomaly] },
];

function fixture(): Input {
  return {
    routes: ['r0', 'r1', 'r2'], gates: ['g0', 'g1', 'g2'],
    selected: { routeId: 'r1', gateId: 'g1' },
    safe: { routeId: 'r1', gateId: 'g1' },
    corrupted: { routeId: 'r2', gateId: 'g0' },
  };
}

function resolveUnknown(input: unknown) {
  return resolveOperationPair(input as Input);
}

describe('resolveOperationPair', () => {
  it.each(matrices)('enumerates all nine pairs for $routes', (matrix) => {
    const outcomes = [];
    for (const [row, routeId] of matrix.routes.entries()) {
      for (const [column, gateId] of matrix.gates.entries()) {
        const input = { ...matrix, selected: { routeId, gateId } };
        const result = resolveOperationPair(input);
        expect(result).toEqual({ ok: true, value: matrix.expected[row * 3 + column] });
        if (result.ok) outcomes.push(result.value.outcome);
      }
    }
    expect(outcomes.filter((value) => value === 'repair')).toHaveLength(1);
    expect(outcomes.filter((value) => value === 'sabotage')).toHaveLength(1);
    expect(outcomes.filter((value) => value === 'anomaly')).toHaveLength(7);
  });

  it.each(['routeId', 'gateId'] as const)('allows distinct diagnostic pairs sharing %s', (key) => {
    const input = fixture();
    const corrupted = { ...input.corrupted, [key]: input.safe[key] };
    expect(resolveOperationPair({ ...input, corrupted, selected: corrupted }))
      .toEqual({ ok: true, value: sabotage });
  });

  it('exposes classification only and returns fresh output without mutation or random draws', () => {
    const input = fixture();
    Object.values(input).forEach(Object.freeze);
    Object.freeze(input);
    const before = JSON.stringify(input);
    const random = vi.spyOn(Math, 'random').mockImplementation(() => {
      throw new Error('unexpected randomness');
    });
    try {
      const first = resolveOperationPair(input);
      const second = resolveOperationPair(input);
      expect(first).toEqual({ ok: true, value: repair });
      expect(second).toEqual(first);
      expect(first).not.toBe(second);
      if (first.ok && second.ok) expect(first.value).not.toBe(second.value);
      expect(JSON.stringify(first)).not.toContain('r1');
      expect(JSON.stringify(first)).not.toContain('g1');
      expect(JSON.stringify(input)).toBe(before);
      expect(random).not.toHaveBeenCalled();
    } finally {
      random.mockRestore();
    }
  });

  it.each(['routes', 'gates'] as const)('rejects malformed %s catalogues', (key) => {
    for (const value of [null, {}, 'abc', [], ['a', 'b'], ['a', 'b', 'c', 'd'],
      ['a', 'a', 'b'], ['a', 1, 'b'], ['a', null, 'b'], new Array(3)]) {
      expect(resolveUnknown({ ...fixture(), [key]: value })).toEqual(invalid);
    }
  });

  it.each(['selected', 'safe', 'corrupted'] as const)('rejects malformed or unknown %s pairs', (key) => {
    for (const value of [null, undefined, {}, 'pair',
      { routeId: 'unknown', gateId: 'g1' }, { routeId: 'r1', gateId: 'unknown' },
      { routeId: 'g1', gateId: 'r1' }, { routeId: 1, gateId: 'g1' },
      { routeId: 'r1', gateId: null }]) {
      const input = Object.freeze({ ...fixture(), [key]: value });
      const before = JSON.stringify(input);
      expect(resolveUnknown(input)).toEqual(invalid);
      expect(JSON.stringify(input)).toBe(before);
    }
  });

  it('rejects overlapping diagnostic definitions and malformed roots', () => {
    const input = fixture();
    expect(resolveOperationPair({ ...input, corrupted: { ...input.safe } })).toEqual(invalid);
    for (const value of [null, undefined, 1, 'input', [], {}]) {
      expect(resolveUnknown(value)).toEqual(invalid);
    }
  });

  it('rejects accessors without invoking getters or string conversion', () => {
    const getter = vi.fn(() => { throw new Error('getter invoked'); });
    const conversion = vi.fn(() => 'r1');
    const routes = ['r0', 'r1', 'r2'];
    Object.defineProperty(routes, '1', { get: getter });
    const selected = Object.defineProperty({ gateId: 'g1' }, 'routeId', { get: getter });
    const root = Object.defineProperty(fixture(), 'routes', { get: getter });
    for (const input of [root, { ...fixture(), routes }, { ...fixture(), selected },
      { ...fixture(), selected: { routeId: { toString: conversion }, gateId: 'g1' } }]) {
      expect(resolveUnknown(input)).toEqual(invalid);
    }
    expect(getter).not.toHaveBeenCalled();
    expect(conversion).not.toHaveBeenCalled();
  });
});
