import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import test from 'node:test';

import { childEnvironment, profileCommands, runBenchmark } from './benchmark-pilot.mjs';

const digest = (value) => createHash('sha256').update(value).digest('hex');
const read = (path) => JSON.parse(readFileSync(path, 'utf8'));

function fixture(context, validator = 'process.stdout.write("metadata passed\\n");') {
  const root = mkdtempSync(join(tmpdir(), 'afterimage-benchmark-test-'));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  for (const path of ['tools', 'swarm/tasks', 'docs/design']) mkdirSync(join(root, path), { recursive: true });
  writeFileSync(join(root, '.gitignore'), '.swarm/\n');
  writeFileSync(join(root, 'tools/validate-pilot100.mjs'), validator);
  // The full profile runs this deliberately small fixture test, not this suite.
  writeFileSync(join(root, 'tools/benchmark-pilot.test.mjs'), 'import test from "node:test"; test("synthetic fixture", () => {});\n');
  writeFileSync(join(root, 'package.json'), JSON.stringify({ private: true, scripts: { check: 'node check.mjs' } }));
  writeFileSync(join(root, 'check.mjs'), 'process.stdout.write("baseline passed\\n");\n');
  for (let number = 1; number <= 100; number += 1) {
    const id = `A${String(number).padStart(3, '0')}`;
    writeFileSync(join(root, 'swarm/tasks', `${id}.json`), JSON.stringify({ id, fixture: true }));
  }
  writeFileSync(join(root, 'docs/design/RULES.md'), 'Synthetic frozen rules fixture.\n');
  writeFileSync(join(root, 'docs/design/SOURCE-MANIFEST.json'), JSON.stringify({ version: 1, files: [{ path: 'RULES.md' }] }));
  for (const args of [['init', '-q'], ['config', 'user.name', 'Benchmark Test'],
    ['config', 'user.email', 'benchmark@example.invalid'], ['add', '.'], ['commit', '-qm', 'synthetic fixture']]) {
    execFileSync('git', args, { cwd: root, stdio: 'ignore' });
  }
  return root;
}

async function until(check, timeout = 4000) {
  const deadline = Date.now() + timeout;
  while (!check()) {
    if (Date.now() >= deadline) throw new Error('fixture condition timed out');
    await new Promise((done) => setTimeout(done, 10));
  }
}

test('profiles are fixed and full also measures the nonrecursive unit-test command', () => {
  assert.deepEqual(profileCommands('full').map((phase) => phase.id), ['metadata', 'benchmark-tests', 'baseline']);
  assert.deepEqual(profileCommands('metadata')[0].argv.slice(1), ['tools/validate-pilot100.mjs', '--require-issues']);
  assert.deepEqual(profileCommands('baseline')[0].argv, ['npm', 'run', 'check']);
  assert.throws(() => profileCommands('deploy'), /benchmark_profile_invalid/);
});

test('the parallel cohort adds linked metadata and preparation tests to the full profile', () => {
  const commands = profileCommands('full', { parallelCohort: true });
  assert.deepEqual(commands.map((phase) => phase.id), ['metadata', 'parallel-metadata', 'benchmark-tests', 'baseline']);
  assert.deepEqual(commands[1].argv.slice(1), ['tools/prepare-parallel100.mjs', '--require-issues', '--workload-only']);
  assert.equal(commands[2].argv.at(-1), 'tools/prepare-parallel100.test.mjs');
});

test('child environment removes credentials and runtime injection while retaining required paths', () => {
  const safe = childEnvironment({ PATH: '/usr/bin', HOME: '/synthetic', LANG: 'en_US.UTF-8',
    CODEX_API_KEY: 'synthetic secret', GH_TOKEN: 'synthetic secret', AWS_SECRET_ACCESS_KEY: 'synthetic secret',
    NPM_TOKEN: 'synthetic secret', NODE_OPTIONS: '--require synthetic.js', GOOGLE_APPLICATION_CREDENTIALS: '/synthetic/private.json' });
  assert.equal(safe.PATH, '/usr/bin');
  assert.equal(safe.HOME, '/synthetic');
  for (const name of ['CODEX_API_KEY', 'GH_TOKEN', 'AWS_SECRET_ACCESS_KEY', 'NPM_TOKEN', 'NODE_OPTIONS', 'GOOGLE_APPLICATION_CREDENTIALS']) {
    assert.equal(safe[name], undefined);
  }
  assert.equal(safe.GIT_TERMINAL_PROMPT, '0');
});

test('full profile records each command and immutable source identity without live metrics', async (context) => {
  const root = fixture(context);
  const result = await runBenchmark({ root, profile: 'full' });
  assert.equal(result.exitCode, 0);
  const receipt = read(result.outputPath);
  assert.equal(receipt.status, 'passed');
  assert.equal(receipt.measurement_kind, 'local_validation');
  assert.equal(receipt.is_live_swarm_run, false);
  assert.equal(receipt.source_unchanged, true);
  assert.equal(receipt.source_snapshot.task_files.length, 100);
  assert.match(receipt.source_snapshot.commit_sha, /^[a-f0-9]{40}$/);
  assert.match(receipt.source_snapshot.design_manifest_sha256, /^[a-f0-9]{64}$/);
  assert.equal(receipt.source_snapshot.dirty, false);
  assert.deepEqual(receipt.phases.map((phase) => phase.status), ['passed', 'passed', 'passed']);
  for (const phase of receipt.phases) {
    assert.equal(phase.exit_code, 0);
    assert.equal(phase.signal, null);
    assert.ok(phase.monotonic_duration_seconds >= 0);
    assert.ok(Date.parse(phase.finished_at_utc) >= Date.parse(phase.started_at_utc));
    assert.ok(phase.stdout.bytes > 0);
    assert.match(phase.stdout.sha256, /^[a-f0-9]{64}$/);
  }
  for (const metric of ['cost_usd', 'merged_green_prs', 'active_coding_agents', 'observed_concurrency']) assert.equal(receipt[metric], null);
  assert.ok(receipt.clock.monotonic_duration_seconds > 0);
  assert.equal(receipt.events.filter((event) => event.type === 'phase_started').length, 3);
  assert.equal(receipt.events.filter((event) => event.type === 'phase_finished').length, 3);
  assert.ok(receipt.checkpoint_sequence >= 9);
});

test('failure persists pre/post checkpoints and output digests but never raw secrets', async (context) => {
  const secret = 'SYNTHETIC_PRIVATE_OUTPUT_DO_NOT_PERSIST';
  const root = fixture(context, `
import {readFileSync} from 'node:fs';
const checkpoint=JSON.parse(readFileSync('.swarm/benchmarks/failure.json','utf8'));
if(checkpoint.phases[0].status!=='running'||!checkpoint.source_snapshot) process.exit(19);
if(process.env.CODEX_API_KEY||process.env.GH_TOKEN||process.env.NPM_TOKEN) process.exit(20);
process.stdout.write(${JSON.stringify(secret)});
process.stderr.write('synthetic stderr');
process.exitCode=7;
`);
  mkdirSync(join(root, '.swarm'), { recursive: true });
  const ledger = join(root, '.swarm/control.sqlite3');
  const budget = Buffer.from('synthetic retained allocation:42');
  writeFileSync(ledger, budget);
  const output = join(root, '.swarm/benchmarks/failure.json');
  const result = await runBenchmark({ root, profile: 'full', output, environment: {
    ...process.env, CODEX_API_KEY: secret, GH_TOKEN: secret, NPM_TOKEN: secret,
  } });
  const receipt = read(output);
  assert.equal(result.exitCode, 1);
  assert.equal(receipt.status, 'failed');
  assert.deepEqual(receipt.phases.map((phase) => phase.status), ['failed', 'skipped', 'skipped']);
  assert.equal(receipt.phases[0].exit_code, 7);
  assert.equal(receipt.phases[0].stdout.bytes, Buffer.byteLength(secret));
  assert.equal(receipt.phases[0].stdout.sha256, digest(secret));
  assert.equal(receipt.phases[0].stderr.sha256, digest('synthetic stderr'));
  for (const filename of readdirSync(join(root, '.swarm/benchmarks'))) {
    assert.equal(readFileSync(join(root, '.swarm/benchmarks', filename), 'utf8').includes(secret), false);
  }
  assert.deepEqual(readFileSync(ledger), budget);
});

test('restart cannot overwrite a previous failure or in-progress receipt', async (context) => {
  const root = fixture(context, 'process.exitCode=4;');
  const output = join(root, '.swarm/benchmarks/restart.json');
  const first = await runBenchmark({ root, profile: 'metadata', output });
  const original = readFileSync(output);
  await assert.rejects(runBenchmark({ root, profile: 'metadata', output }), /benchmark_output_exists/);
  assert.deepEqual(readFileSync(output), original);
  writeFileSync(join(root, 'tools/validate-pilot100.mjs'), 'process.stdout.write("retried metadata\\n");');
  const retried = await runBenchmark({ root, profile: 'metadata' });
  assert.equal(retried.receipt.status, 'passed');
  assert.notEqual(first.receipt.run_id, retried.receipt.run_id);
  assert.deepEqual(readFileSync(output), original);
  const interrupted = join(root, '.swarm/benchmarks/in-progress.json');
  writeFileSync(interrupted, JSON.stringify({ status: 'running', synthetic: true }));
  await assert.rejects(runBenchmark({ root, profile: 'metadata', output: interrupted }), /benchmark_output_exists/);
  assert.equal(read(interrupted).status, 'running');
});

test('interruption preserves a running checkpoint and settles the actual child signal', async (context) => {
  const root = fixture(context, 'setInterval(()=>{},1000);');
  const output = join(root, '.swarm/benchmarks/interrupted.json');
  const controller = new AbortController();
  const resultPromise = runBenchmark({ root, profile: 'full', output, signal: controller.signal });
  await until(() => {
    try { return read(output).phases[0].status === 'running'; } catch { return false; }
  });
  const before = read(output);
  assert.equal(before.clock.finished_at_utc, null);
  assert.equal(before.phases[0].exit_code, null);
  controller.abort('SIGTERM');
  const result = await resultPromise;
  const receipt = read(output);
  assert.equal(result.exitCode, 130);
  assert.equal(receipt.status, 'interrupted');
  assert.equal(receipt.phases[0].signal, 'SIGTERM');
  assert.equal(receipt.phases[0].failure_code, 'interrupted');
  assert.equal(receipt.phases[1].status, 'skipped');
  assert.ok(receipt.phases[0].monotonic_duration_seconds >= 0);
  assert.notEqual(receipt.clock.finished_at_utc, null);
});

test('output traversal and symlink escapes cannot touch other private files', async (context) => {
  const root = fixture(context);
  mkdirSync(join(root, '.swarm/benchmarks'), { recursive: true });
  const ledger = join(root, '.swarm/control.sqlite3');
  writeFileSync(ledger, 'do not modify');
  await assert.rejects(runBenchmark({ root, output: ledger }), /benchmark_output_outside_private_directory/);
  await assert.rejects(runBenchmark({ root, output: join(root, '.swarm/benchmarks/../escape.json') }), /benchmark_output_outside_private_directory/);
  const external = join(root, 'external');
  mkdirSync(external);
  symlinkSync(external, join(root, '.swarm/benchmarks/link'), 'dir');
  await assert.rejects(runBenchmark({ root, output: join(root, '.swarm/benchmarks/link/escape.json') }), /benchmark_directory_unsafe/);
  assert.equal(readFileSync(ledger, 'utf8'), 'do not modify');
  assert.deepEqual(readdirSync(external), []);
});

test('a source change during validation is recorded and cannot claim an unchanged passing baseline', async (context) => {
  const root = fixture(context, `import {writeFileSync} from 'node:fs'; writeFileSync('docs/design/RULES.md','changed during validation');`);
  const result = await runBenchmark({ root, profile: 'metadata' });
  assert.equal(result.receipt.phases[0].status, 'passed');
  assert.equal(result.receipt.source_unchanged, false);
  assert.equal(result.receipt.status, 'failed');
  assert.equal(result.receipt.failure_code, 'source_changed_during_validation');
});

test('additional B task definitions and tracked preparation contracts are frozen in receipts', async (context) => {
  const root = fixture(context, `import {writeFileSync} from 'node:fs'; writeFileSync('docs/PILOT100_UI_CONTRACTS.md','changed contract');`);
  writeFileSync(join(root, 'swarm/tasks/B001.json'), JSON.stringify({ id: 'B001', fixture: true }));
  writeFileSync(join(root, 'docs/PILOT100_UI_CONTRACTS.md'), 'frozen contract');
  execFileSync('git', ['add', '.'], { cwd: root, stdio: 'ignore' });
  execFileSync('git', ['commit', '-qm', 'add synthetic task and contract'], { cwd: root, stdio: 'ignore' });
  const result = await runBenchmark({ root, profile: 'metadata' });
  assert.equal(result.receipt.source_snapshot.task_files.length, 101);
  assert.equal(result.receipt.source_snapshot.task_files.at(-1).id, 'B001');
  assert.equal(result.receipt.source_snapshot.preparation_files[0].path, 'docs/PILOT100_UI_CONTRACTS.md');
  assert.equal(result.receipt.status, 'failed');
  assert.equal(result.receipt.failure_code, 'source_changed_during_validation');
});

test('snapshot failures still produce a failed checkpoint with no child command run', async (context) => {
  const root = fixture(context);
  writeFileSync(join(root, 'docs/design/SOURCE-MANIFEST.json'), 'invalid json');
  const result = await runBenchmark({ root, profile: 'full' });
  const receipt = read(result.outputPath);
  assert.equal(receipt.status, 'failed');
  assert.equal(receipt.failure_code, 'snapshot_design_manifest_invalid');
  assert.deepEqual(receipt.phases.map((phase) => phase.status), ['skipped', 'skipped', 'skipped']);
  assert.notEqual(receipt.clock.finished_at_utc, null);
});
