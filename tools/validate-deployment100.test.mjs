import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { definitionDigest, digest } from './prepare-parallel100.mjs';
import { validateDeployment100 } from './validate-deployment100.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PACKET = 'swarm/deployment100.json';
const BASE = '79404fe6d4ed5cf1b59b5610a3aebbe9d1f8021f';
const read = (root, path) => JSON.parse(readFileSync(join(root, path), 'utf8'));
const write = (root, path, value) => writeFileSync(join(root, path), `${JSON.stringify(value, null, 2)}\n`);

function bindings(packet) {
  return ['profile', 'manifest', 'designManifest', 'benchmarkPolicy', 'launchGuide', 'acceptancePolicy']
    .map((key) => packet.source[key]).concat(packet.source.contracts, packet.tasks);
}

function fixture(context) {
  const root = mkdtempSync(join(tmpdir(), 'afterimage-release-validation-'));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  const packet = read(ROOT, PACKET);
  const paths = new Set([PACKET, ...bindings(packet).map((entry) => entry.path)]);
  for (const task of packet.tasks) {
    const original = read(ROOT, task.path);
    for (const path of original.sourceRefs) paths.add(path.split('#')[0]);
  }
  for (const item of read(ROOT, 'docs/design/SOURCE-MANIFEST.json').files) paths.add(`docs/design/${item.path}`);
  for (const name of readdirSync(join(ROOT, 'swarm/tasks'))) {
    if (/^A\d{3}\.json$/.test(name)) paths.add(`swarm/tasks/${name}`);
  }
  const frozen = new Map();
  for (const path of paths) {
    const bytes = readFileSync(join(ROOT, path));
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), bytes);
    frozen.set(path, Buffer.from(bytes));
  }
  const commits = new Set([BASE, packet.source.controllerCommit, packet.source.preparedControllerCommit]);
  const calls = [];
  // Frozen object bytes are independent from subsequent filesystem/packet edits.
  // Injecting object reads keeps tests self-contained even in a shallow checkout
  // without the separate controller repository. The CLI always uses real Git.
  const gitRead = (_root, ...args) => {
    calls.push(args);
    if (args[0] === 'cat-file' && args[1] === '-e' && commits.has(args[2].replace(/\^\{commit\}$/, ''))) return Buffer.alloc(0);
    if (args[0] === 'show' && args[1].startsWith(`${BASE}:`)) {
      const path = args[1].slice(BASE.length + 1);
      if (frozen.has(path) && !['docs/SWARM100_LAUNCH.md', 'docs/SWARM100_ACCEPTANCE.md'].includes(path)) return frozen.get(path);
    }
    throw new Error('Object absent from synthetic frozen object store.');
  };
  return { root, calls, validate: () => validateDeployment100(root, { gitRead }) };
}

function editPacket(fixture, edit) {
  const packet = read(fixture.root, PACKET);
  edit(packet);
  write(fixture.root, PACKET, packet);
}

function rejects(fixture, expected) {
  const result = fixture.validate();
  assert.equal(result.valid, false);
  assert.match(result.errors.join('\n'), expected);
  assert.equal(result.launch_readiness_verified, false);
  assert.equal(result.remote_operations, 0);
  return result;
}

function snapshot(root, directory = root) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? snapshot(root, path) : [[path.slice(root.length + 1), digest(readFileSync(path))]];
  }).sort(([left], [right]) => left.localeCompare(right));
}

test('valid packet checks all 108 bindings, 106 frozen inputs and exact 100 tasks without approving launch', (context) => {
  const prepared = fixture(context);
  const result = prepared.validate();
  assert.equal(result.valid, true, result.errors.join('\n'));
  assert.equal(result.checked_bindings, 108);
  assert.equal(result.frozen_bindings, 106);
  assert.equal(result.task_count, 100);
  assert.ok(result.checked_source_references >= 11);
  assert.equal(result.live_execution_enabled, false);
  assert.equal(result.launch_readiness_verified, false);
  assert.equal(result.provider_capacity_verified, false);
  assert.equal(result.owner_authorization_verified, false);
  assert.equal(result.actual_billed_cost_usd, null);
  assert.equal(result.live_agent_runs_created_by_this_check, 0);
  assert.ok(prepared.calls.every(([operation]) => ['show', 'cat-file'].includes(operation)));
});

test('tampered bytes fail even when the packet and manifest are rebound to the changed task', (context) => {
  const prepared = fixture(context);
  const task = read(prepared.root, 'swarm/tasks/B001.json');
  task.prompt += '\nTampered implementation instructions.';
  write(prepared.root, 'swarm/tasks/B001.json', task);
  const packet = read(prepared.root, PACKET);
  packet.tasks[0].sha256 = digest(readFileSync(join(prepared.root, packet.tasks[0].path)));
  const manifest = read(prepared.root, packet.source.manifest.path);
  manifest.backlogDefinitionSha256 = definitionDigest(packet.taskIds.map((id) => read(prepared.root, `swarm/tasks/${id}.json`)));
  write(prepared.root, packet.source.manifest.path, manifest);
  packet.source.manifest.sha256 = digest(readFileSync(join(prepared.root, packet.source.manifest.path)));
  packet.source.workloadDefinitionSha256 = manifest.backlogDefinitionSha256;
  packet.protocol.workloadDefinitionSha256 = manifest.backlogDefinitionSha256;
  write(prepared.root, PACKET, packet);
  rejects(prepared, /frozen worker base differs swarm\/tasks\/B001.json/);
});

test('operational documents require current hashes and may be new relative to the frozen worker base', (context) => {
  const prepared = fixture(context);
  writeFileSync(join(prepared.root, 'docs/SWARM100_LAUNCH.md'), 'Reviewed updated launch instructions.\n');
  rejects(prepared, /current digest mismatch docs\/SWARM100_LAUNCH.md/);
  editPacket(prepared, (packet) => {
    packet.source.launchGuide.sha256 = digest(readFileSync(join(prepared.root, 'docs/SWARM100_LAUNCH.md')));
  });
  assert.equal(prepared.validate().valid, true);
  assert.equal(prepared.calls.some(([operation, spec]) => operation === 'show' && spec.endsWith(':docs/SWARM100_LAUNCH.md')), false);
});

test('missing or duplicate bindings and unavailable local commit pins fail closed', (context) => {
  const duplicate = fixture(context);
  editPacket(duplicate, (packet) => { packet.tasks[1] = packet.tasks[0]; });
  rejects(duplicate, /duplicate or malformed binding/);
  const missing = fixture(context);
  rmSync(join(missing.root, 'docs/PILOT100_UI_CONTRACTS.md'));
  rejects(missing, /bindings: unavailable docs\/PILOT100_UI_CONTRACTS.md/);
  const pin = fixture(context);
  editPacket(pin, (packet) => { packet.source.controllerCommit = 'b'.repeat(40); });
  rejects(pin, /unavailable local controller commit/);
  const moved = fixture(context);
  editPacket(moved, (packet) => { packet.source.targetBaseSha = 'b'.repeat(40); });
  rejects(moved, /exact frozen worker base required/);
});

test('IDs, exact issue identities and supporting-task classifications cannot drift', (context) => {
  const identities = fixture(context);
  editPacket(identities, (packet) => { packet.taskIds.reverse(); });
  rejects(identities, /exact ordered B001-B100/);
  const issue = fixture(context);
  editPacket(issue, (packet) => { packet.tasks[0].issueUrl = 'https://github.com/other/repo/issues/134'; });
  rejects(issue, /B001: exact issue binding mismatch/);
  const support = fixture(context);
  editPacket(support, (packet) => { packet.tasks[76].countsAsFeatureDelivery = true; });
  rejects(support, /B077: feature\/support classification mismatch/);
});

test('disabled preparation cannot acquire execution, budget or invented live evidence', (context) => {
  for (const edit of [
    (packet) => { packet.launchPermitted = true; },
    (packet) => { packet.liveExecutionAuthorized = true; },
    (packet) => { packet.budget.ownerAuthorization = 'invented'; },
    (packet) => { packet.budget.migrationApplied = true; },
    (packet) => { packet.gates[0].status = 'passed'; },
    (packet) => { packet.protocol.efficiencyWinProven = true; },
  ]) {
    const prepared = fixture(context);
    editPacket(prepared, edit);
    rejects(prepared, /unauthorized|unknown\/unapproved|must not imply|must remain pending|unmeasured/);
  }
  const live = fixture(context);
  const path = join(live.root, 'swarm.toml');
  writeFileSync(path, readFileSync(path, 'utf8').replace('live_enabled = false', 'live_enabled = true'));
  assert.equal(rejects(live, /original disabled budget policy required/).live_execution_enabled, true);
});

test('USD200 arithmetic preserves separate envelopes and historical cumulative allocations', (context) => {
  for (const edit of [
    (packet) => { packet.budget.proposedRunReservationUsd.model = '170.00'; },
    (packet) => { packet.budget.proposedRunAndOneProbeReservationSubtotalUsd = '177.84'; },
    (packet) => { packet.budget.proposedRemainingSetupCiRepairEnvelopeUsd = '22.16'; },
    (packet) => { packet.budget.proposedNewEnvelopeUsd.model = '150.01'; },
    (packet) => { packet.budget.proposedRemainingEnvelopeUsd.infrastructure = '17.66'; },
    (packet) => { packet.budget.proposedCumulativePolicyCents.infrastructure = 5000; },
    (packet) => { packet.budget.planningNewSpendCeilingUsd = 200; },
  ]) {
    const prepared = fixture(context);
    editPacket(prepared, edit);
    rejects(prepared, /budget:/);
  }
});

test('pacing, shared queue and every session/expiry timeout must describe the same candidate', (context) => {
  for (const [key, wrong] of [
    ['agentTimeoutSeconds', 300], ['maximumWorkerLifecycleSeconds', 1200],
    ['gatewayRunTtlSeconds', 1800], ['gatewayTtlSoftwareCeilingSeconds', 1800],
    ['gatewayHttpTimeoutSeconds', 600], ['workerModelStreamIdleTimeoutSeconds', 600],
    ['providerRateTokensPerMinute', 1_000_000], ['providerRateRequestsPerMinute', 5000],
    ['providerRateMaximumCombinedWaitSeconds', 600],
  ]) {
    const prepared = fixture(context);
    editPacket(prepared, (packet) => { packet.runtime[key] = wrong; });
    rejects(prepared, new RegExp(`runtime: ${key} mismatch`));
  }
  const capacity = fixture(context);
  editPacket(capacity, (packet) => { packet.runtime.suppliedModelCapacity.interactiveTokensPerDay = 1_350_000; });
  rejects(capacity, /supplied capacity must remain accurately scoped/);
});

test('dependency and frozen design source changes are rejected independently of the packet hashes', (context) => {
  const dependency = fixture(context);
  const task = read(dependency.root, 'swarm/tasks/B001.json');
  task.dependsOn = ['B002'];
  write(dependency.root, 'swarm/tasks/B001.json', task);
  rejects(dependency, /B001: independent ready task required/);
  const source = fixture(context);
  writeFileSync(join(source.root, 'docs/design/RULES-SPEC-v1.md'), 'Changed original rules.\n');
  rejects(source, /source reference: frozen bytes differ docs\/design\/RULES-SPEC-v1.md/);
});

test('unsafe paths, escaped symlinks and malformed packet shapes fail without exposing contents', (context) => {
  const unsafe = fixture(context);
  editPacket(unsafe, (packet) => { packet.source.launchGuide.path = '../outside'; });
  rejects(unsafe, /path mismatch|unsafe/);
  const escaped = fixture(context);
  const outside = mkdtempSync(join(tmpdir(), 'afterimage-outside-fixture-'));
  context.after(() => rmSync(outside, { recursive: true, force: true }));
  writeFileSync(join(outside, 'private.md'), 'synthetic-private-value-never-output');
  rmSync(join(escaped.root, 'docs/SWARM100_LAUNCH.md'));
  symlinkSync(join(outside, 'private.md'), join(escaped.root, 'docs/SWARM100_LAUNCH.md'));
  const result = rejects(escaped, /unavailable docs\/SWARM100_LAUNCH.md/);
  assert.doesNotMatch(JSON.stringify(result), /synthetic-private-value-never-output/);
  const malformed = fixture(context);
  writeFileSync(join(malformed.root, PACKET), '{broken JSON');
  rejects(malformed, /missing, unsafe or malformed input/);
});

test('validation never calls fetch and leaves every local file and retained ledger unchanged', (context) => {
  const prepared = fixture(context);
  mkdirSync(join(prepared.root, '.swarm'));
  writeFileSync(join(prepared.root, '.swarm/control.sqlite3'), 'Retained synthetic budget; never reset or refund.\n');
  const before = snapshot(prepared.root);
  const fetch = context.mock.method(globalThis, 'fetch', () => { throw new Error('Network access forbidden.'); });
  const result = prepared.validate();
  assert.equal(result.valid, true, result.errors.join('\n'));
  assert.deepEqual(snapshot(prepared.root), before);
  assert.equal(fetch.mock.calls.length, 0);
});

test('CLI --json returns fixed validation errors and nonzero status without shell/provider execution', (context) => {
  const prepared = fixture(context);
  writeFileSync(join(prepared.root, PACKET), '{broken JSON');
  const result = spawnSync(process.execPath, [join(ROOT, 'tools/validate-deployment100.mjs'), '--json', '--root', prepared.root], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.equal(JSON.parse(result.stdout).valid, false);
  assert.equal(result.stderr, '');
  const argument = spawnSync(process.execPath, [join(ROOT, 'tools/validate-deployment100.mjs'), '--json', '--launch'], { encoding: 'utf8' });
  assert.equal(argument.status, 1);
  assert.equal(JSON.parse(argument.stdout).valid, false);
});
