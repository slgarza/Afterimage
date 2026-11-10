import assert from 'node:assert/strict';
import childProcess from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import test from 'node:test';

import { definitionDigest, digest, validateParallel100 } from './prepare-parallel100.mjs';

const read = (path) => JSON.parse(readFileSync(path, 'utf8'));
const write = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
const ids = Array.from({ length: 100 }, (_, index) => `B${String(index + 1).padStart(3, '0')}`);

function fixture(context, { linked = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'afterimage-parallel100-test-'));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  for (const path of ['swarm/tasks', 'docs/design', 'docs/contracts']) mkdirSync(join(root, path), { recursive: true });
  writeFileSync(join(root, 'docs/design/RULES.md'), 'Original synthetic rules for an offline fixture.\n');
  write(join(root, 'docs/design/SOURCE-MANIFEST.json'), {
    version: 1, files: [{ path: 'RULES.md', sha256: digest(readFileSync(join(root, 'docs/design/RULES.md'))) }],
  });
  writeFileSync(join(root, 'docs/SWARM_BENCHMARK.md'), 'Record preparation separately from live execution.\n');
  const contractPaths = ['docs/contracts/UI.md', 'docs/contracts/DOMAIN.md'];
  for (const [index, path] of contractPaths.entries()) {
    writeFileSync(join(root, path), ids.slice(index * 50, (index + 1) * 50)
      .map((id) => `export function Fixture${id}(): void;`).join('\n'));
  }
  // Scope traceability uses synthetic metadata, independent of actual A-series tasks.
  write(join(root, 'swarm/tasks/A001.json'), { id: 'A001', title: 'Synthetic original scope' });
  const manifest = {
    version: 1, id: 'afterimage-parallel100', taskIds: ids,
    liveExecutionAuthorized: false,
    designManifestSha256: digest(readFileSync(join(root, 'docs/design/SOURCE-MANIFEST.json'))),
    contracts: contractPaths.map((path) => ({ path, sha256: digest(readFileSync(join(root, path))) })),
    benchmarkPolicy: { path: 'docs/SWARM_BENCHMARK.md', sha256: digest(readFileSync(join(root, 'docs/SWARM_BENCHMARK.md'))) },
  };
  const tasks = ids.map((id, index) => ({
    id, title: `Implement independent synthetic feature ${id}`,
    prompt: `Implement Fixture${id} inside its declared ownership and verify its four acceptance cases.`,
    ownership: [`packages/fixture/src/${id}.ts`, `packages/fixture/tests/${id}.test.ts`],
    acceptance: ['Accept the documented input.', 'Reject malformed input.', 'Preserve input immutability.', 'Pass independent behavioral checks.'],
    status: 'ready', dependsOn: [], blockedBy: [], countsAsFeatureDelivery: true,
    preparationCohort: manifest.id, designManifestSha256: manifest.designManifestSha256,
    contract: { path: contractPaths[index < 50 ? 0 : 1], export: `Fixture${id}` },
    sourceRefs: [contractPaths[index < 50 ? 0 : 1], 'docs/design/RULES.md'],
    replacesScopeFrom: ['A001'],
    ...(linked ? { issue: 1001 + index, issueUrl: `https://github.com/slgarza/Afterimage/issues/${1001 + index}` } : {}),
  }));
  for (const task of tasks) write(join(root, 'swarm/tasks', `${task.id}.json`), task);
  manifest.backlogDefinitionSha256 = definitionDigest(tasks);
  write(join(root, 'swarm/parallel100.json'), manifest);
  writeFileSync(join(root, 'swarm.toml'), '[runtime]\ngateway_concurrency = 100\n[budget]\nlive_enabled = false\nmax_live_agents = 100\nmodel_limit_cents = 1800\ninfra_limit_cents = 700\n');
  return root;
}

function editTask(root, id, edit, { refreeze = true } = {}) {
  const path = join(root, 'swarm/tasks', `${id}.json`);
  const task = read(path);
  edit(task);
  write(path, task);
  if (refreeze) {
    const manifestPath = join(root, 'swarm/parallel100.json');
    const manifest = read(manifestPath);
    manifest.backlogDefinitionSha256 = definitionDigest(ids.map((taskId) => read(join(root, 'swarm/tasks', `${taskId}.json`))));
    write(manifestPath, manifest);
  }
}

function rejects(root, expected, options) {
  const result = validateParallel100(root, options);
  assert.equal(result.valid, false);
  assert.equal(result.local_parallel_work_prepared, false);
  assert.match(result.errors.join('\n'), expected);
  assert.equal(result.launch_readiness_verified, false);
  return result;
}

function treeSnapshot(root, directory = root) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? treeSnapshot(root, path) : [{ path: relative(root, path), sha256: digest(readFileSync(path)) }];
  }).sort((a, b) => a.path.localeCompare(b.path));
}

test('100 independent linked tasks validate preparation without claiming live readiness', (context) => {
  const root = fixture(context);
  const result = validateParallel100(root, { requireIssues: true });
  assert.equal(result.valid, true, result.errors.join('\n'));
  assert.equal(result.tasks, 100);
  assert.equal(result.ready_tasks, 100);
  assert.equal(result.linked_issues, 100);
  assert.equal(result.dependencies, 0);
  assert.equal(result.shared_owned_paths, 0);
  assert.equal(result.measurement_kind, 'static_preparation');
  assert.equal(result.local_parallel_work_prepared, true);
  assert.equal(result.live_execution_enabled, false);
  assert.equal(result.launch_readiness_verified, false);
  assert.equal(result.provider_capacity_verified, false);
  assert.equal(result.remaining_budget_verified, false);
  assert.equal(result.actual_billed_cost_usd, null);
  assert.equal(result.live_agent_runs, null);
  assert.equal(result.live_agent_runs_created_by_this_check, 0);
  assert.match(result.workload_definition_sha256, /^[a-f0-9]{64}$/);
  assert.equal(existsSync(join(root, '.swarm')), false);
});

test('the frozen workload ignores publication bookkeeping and task order, but binds actual scope', (context) => {
  const root = fixture(context);
  const tasks = ids.map((id) => read(join(root, 'swarm/tasks', `${id}.json`)));
  const original = definitionDigest(tasks);
  assert.equal(definitionDigest([...tasks].reverse()), original);
  assert.equal(definitionDigest(tasks.map((task) => ({ ...task, issue: 5000, issueUrl: 'synthetic bookkeeping' }))), original);
  for (const change of [
    { prompt: 'A different implementation requirement.' },
    { ownership: ['packages/other/src/feature.ts'] },
    { acceptance: ['A different behavioral acceptance rule.'] },
  ]) assert.notEqual(definitionDigest([{ ...tasks[0], ...change }, ...tasks.slice(1)]), original);
});

test('dependencies, external blockers and unready work cannot enter the independent cohort', (context) => {
  for (const change of [
    { dependsOn: ['B002'] }, { blockedBy: ['EXTERNAL_CONFIGURATION'] }, { status: 'blocked' },
  ]) {
    const root = fixture(context);
    editTask(root, 'B001', (task) => Object.assign(task, change));
    rejects(root, /B001: cohort requires independent ready work/);
  }
});

test('identical and ancestor ownership collide while separate sibling paths remain independent', (context) => {
  for (const ownership of [['packages/fixture/src/B002.ts'], ['packages/fixture/src']]) {
    const root = fixture(context);
    editTask(root, 'B001', (task) => { task.ownership = ownership; });
    const result = rejects(root, /B001\/B002: ownership collision/);
    assert.ok(result.shared_owned_paths > 0);
  }
  const root = fixture(context);
  editTask(root, 'B001', (task) => { task.ownership = ['packages/fixture/src/B001-nested/feature.ts']; });
  assert.equal(validateParallel100(root).valid, true);
});

test('changed task scope, frozen design, contracts and benchmark policy invalidate preparation', (context) => {
  const workload = fixture(context);
  editTask(workload, 'B001', (task) => { task.prompt += ' Changed after freeze.'; }, { refreeze: false });
  rejects(workload, /workload definitions changed since freeze/);
  const design = fixture(context);
  writeFileSync(join(design, 'docs/design/RULES.md'), 'Changed frozen source.\n');
  rejects(design, /changed frozen source RULES.md/);
  const contract = fixture(context);
  writeFileSync(join(contract, 'docs/contracts/UI.md'), 'Changed frozen contract.\n');
  rejects(contract, /contract: digest mismatch/);
  const policy = fixture(context);
  writeFileSync(join(policy, 'docs/SWARM_BENCHMARK.md'), 'Changed evidence obligations.\n');
  rejects(policy, /benchmark policy digest mismatch/);
});

test('contract exports and original scope traceability must exist and remain unique', (context) => {
  const missing = fixture(context);
  editTask(missing, 'B001', (task) => { task.contract.export = 'AbsentSyntheticExport'; });
  rejects(missing, /export absent from frozen contract/);
  const duplicate = fixture(context);
  editTask(duplicate, 'B001', (task) => { task.contract.export = 'FixtureB002'; });
  rejects(duplicate, /duplicate public export/);
  const reference = fixture(context);
  editTask(reference, 'B001', (task) => { task.sourceRefs = ['docs/design/RULES.md']; });
  rejects(reference, /contract source reference required/);
  const trace = fixture(context);
  editTask(trace, 'B001', (task) => { task.replacesScopeFrom = ['A999']; });
  rejects(trace, /original A-scope traceability required/);
});

test('issue publication may be pending during drafting but is mandatory for final preparation', (context) => {
  const root = fixture(context, { linked: false });
  const draft = validateParallel100(root);
  assert.equal(draft.valid, true);
  assert.equal(draft.linked_issues, 0);
  const final = rejects(root, /unique real issue identity required/, { requireIssues: true });
  assert.equal(final.errors.filter((error) => error.includes('unique real issue identity')).length, 100);
});

test('duplicate issue numbers and mismatched repository issue URLs are rejected', (context) => {
  const duplicate = fixture(context);
  editTask(duplicate, 'B002', (task) => { task.issue = 1001; task.issueUrl = 'https://github.com/slgarza/Afterimage/issues/1001'; });
  rejects(duplicate, /B002: unique real issue identity required/, { requireIssues: true });
  const mismatch = fixture(context);
  editTask(mismatch, 'B001', (task) => { task.issueUrl = 'https://github.com/example/other/issues/1001'; });
  rejects(mismatch, /B001: unique real issue identity required/);
});

test('new B-series work cannot reuse an original A-series issue identity', (context) => {
  const root = fixture(context);
  write(join(root, 'swarm/tasks/A001.json'), {
    id: 'A001', title: 'Synthetic original scope', issue: 1001,
    issueUrl: 'https://github.com/slgarza/Afterimage/issues/1001',
  });
  const result = rejects(root, /B001: unique real issue identity required/, { requireIssues: true });
  assert.equal(result.linked_issues, 99);
});

test('the cohort requires exactly its frozen ordered 100 task identities', (context) => {
  const missing = fixture(context);
  rmSync(join(missing, 'swarm/tasks/B100.json'));
  rejects(missing, /exactly 100 B-series files required|B100: missing or invalid task/);
  const extra = fixture(context);
  write(join(extra, 'swarm/tasks/B101.json'), { id: 'B101' });
  rejects(extra, /exactly 100 B-series files required/);
  const reordered = fixture(context);
  const path = join(reordered, 'swarm/parallel100.json');
  const manifest = read(path);
  manifest.taskIds.reverse();
  write(path, manifest);
  rejects(reordered, /exact ordered B001-B100 cohort required/);
});

test('execution stays disabled and both configured capacities must explicitly cover 100 workers', (context) => {
  for (const [before, after, expected] of [
    ['live_enabled = false', 'live_enabled = true', /live execution must remain disabled/],
    ['max_live_agents = 100', 'max_live_agents = 10', /explicit worker and gateway capacities/],
    ['gateway_concurrency = 100', 'gateway_concurrency = 20', /explicit worker and gateway capacities/],
  ]) {
    const root = fixture(context);
    const path = join(root, 'swarm.toml');
    writeFileSync(path, readFileSync(path, 'utf8').replace(before, after));
    rejects(root, expected);
  }
  const root = fixture(context);
  const path = join(root, 'swarm/parallel100.json');
  const manifest = read(path);
  manifest.liveExecutionAuthorized = true;
  write(path, manifest);
  rejects(root, /paid execution must remain unauthorized/);
});

test('missing and malformed policy, design and profile inputs fail closed without throwing', (context) => {
  for (const path of ['docs/SWARM_BENCHMARK.md', 'docs/design/SOURCE-MANIFEST.json', 'swarm.toml']) {
    const root = fixture(context);
    rmSync(join(root, path));
    const result = validateParallel100(root);
    assert.equal(result.valid, false, `Missing ${path} was accepted.`);
    assert.equal(result.launch_readiness_verified, false);
    assert.ok(result.errors.length > 0);
  }
  const root = fixture(context);
  writeFileSync(join(root, 'docs/design/SOURCE-MANIFEST.json'), '{invalid JSON');
  const result = validateParallel100(root);
  assert.equal(result.valid, false);
  assert.equal(result.launch_readiness_verified, false);
});

test('malformed ownership and source references fail closed instead of escaping validation', (context) => {
  for (const change of [
    { ownership: { malicious: '../outside' } }, { ownership: ['../outside'] },
    { ownership: 'packages/fixture' }, { ownership: [42] },
    { sourceRefs: { malicious: '../outside' } }, { sourceRefs: [42] },
  ]) {
    const root = fixture(context);
    editTask(root, 'B001', (task) => Object.assign(task, change));
    const result = validateParallel100(root);
    assert.equal(result.valid, false);
    assert.equal(result.launch_readiness_verified, false);
    assert.ok(result.errors.length > 0);
  }
});

test('duplicate assignments or a false flag in another section cannot hide live execution', (context) => {
  const duplicate = fixture(context);
  const duplicatePath = join(duplicate, 'swarm.toml');
  writeFileSync(duplicatePath, `${readFileSync(duplicatePath, 'utf8')}live_enabled = true\n`);
  rejects(duplicate, /live execution must remain disabled/);
  const otherSection = fixture(context);
  const sectionPath = join(otherSection, 'swarm.toml');
  writeFileSync(sectionPath, `${readFileSync(sectionPath, 'utf8').replace('live_enabled = false', 'live_enabled = true')}\n[project]\nlive_enabled = false\n`);
  rejects(otherSection, /live execution must remain disabled/);
  const duplicateCapacity = fixture(context);
  const capacityPath = join(duplicateCapacity, 'swarm.toml');
  writeFileSync(capacityPath, readFileSync(capacityPath, 'utf8').replace(
    'gateway_concurrency = 100', 'gateway_concurrency = 100\ngateway_concurrency = 1',
  ));
  rejects(duplicateCapacity, /explicit worker and gateway capacities/);
});

test('an export name substring cannot impersonate a frozen contract export', (context) => {
  const root = fixture(context);
  editTask(root, 'B001', (task) => { task.contract.export = 'FixtureB00'; });
  rejects(root, /export absent from frozen contract/);
});

test('workload-only validation permits a future enabled profile without authorizing any execution', (context) => {
  const root = fixture(context);
  const path = join(root, 'swarm.toml');
  writeFileSync(path, readFileSync(path, 'utf8').replace('live_enabled = false', 'live_enabled = true'));
  rejects(root, /live execution must remain disabled/);
  const result = validateParallel100(root, { requireIssues: true, requireDisabled: false });
  assert.equal(result.valid, true, result.errors.join('\n'));
  assert.equal(result.live_execution_enabled, true);
  assert.equal(result.launch_readiness_verified, false);
  assert.equal(result.remaining_budget_verified, false);
  assert.equal(result.provider_capacity_verified, false);
  assert.equal(result.live_agent_runs, null);
  assert.equal(result.live_agent_runs_created_by_this_check, 0);
  writeFileSync(path, `${readFileSync(path, 'utf8')}live_enabled = false\n`);
  rejects(root, /one explicit valid live flag required/, { requireDisabled: false });
});

test('validation makes no fetch or subprocess calls and preserves durable budget evidence byte for byte', (context) => {
  const root = fixture(context);
  mkdirSync(join(root, '.swarm'));
  const ledger = Buffer.from('Synthetic retained ledger: prior allowances and failed allocations.\n');
  writeFileSync(join(root, '.swarm/control.sqlite3'), ledger);
  writeFileSync(join(root, '.swarm/gateway-budget.json'), '{"synthetic_prior_allocated_cents":2500}\n');
  const before = treeSnapshot(root);
  const forbidden = () => { throw new Error('Static preparation attempted an external call.'); };
  const spies = [context.mock.method(globalThis, 'fetch', forbidden)];
  for (const name of ['spawn', 'spawnSync', 'exec', 'execSync', 'execFile', 'execFileSync']) {
    spies.push(context.mock.method(childProcess, name, forbidden));
  }
  syncBuiltinESMExports();
  context.after(() => { context.mock.restoreAll(); syncBuiltinESMExports(); });
  const result = validateParallel100(root, { requireIssues: true });
  assert.equal(result.valid, true);
  assert.deepEqual(treeSnapshot(root), before);
  assert.deepEqual(readFileSync(join(root, '.swarm/control.sqlite3')), ledger);
  for (const spy of spies) assert.equal(spy.mock.calls.length, 0);
});
