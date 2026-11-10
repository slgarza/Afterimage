import { spawn, spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import {
  closeSync, existsSync, fsyncSync, linkSync, lstatSync, mkdirSync, openSync,
  readFileSync, readlinkSync, realpathSync, renameSync, unlinkSync, writeFileSync,
} from 'node:fs';
import { dirname, extname, isAbsolute, relative, resolve, sep } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const DEFAULT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PHASE_TIMEOUT_MS = 20 * 60 * 1000;
const MAX_SNAPSHOT_BYTES = 32 * 1024 * 1024;
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const utc = () => new Date().toISOString();
const elapsed = (start) => Number(process.hrtime.bigint() - start) / 1e9;
const emptyOutput = () => ({ bytes: 0, sha256: null });

class BenchmarkError extends Error {
  constructor(code) { super(code); this.code = code; }
}

export function childEnvironment(input = process.env) {
  const allowed = new Set([
    'PATH', 'HOME', 'USER', 'LOGNAME', 'TMPDIR', 'TMP', 'TEMP', 'LANG', 'LANGUAGE',
    'LC_ALL', 'LC_CTYPE', 'TZ', 'TERM', 'NO_COLOR', 'CI', 'SystemRoot', 'PATHEXT',
  ]);
  const environment = Object.fromEntries(Object.entries(input).filter(([key]) => allowed.has(key)));
  return {
    ...environment,
    GIT_TERMINAL_PROMPT: '0',
    NPM_CONFIG_USERCONFIG: process.platform === 'win32' ? 'NUL' : '/dev/null',
    NPM_CONFIG_UPDATE_NOTIFIER: 'false', NPM_CONFIG_AUDIT: 'false', NPM_CONFIG_FUND: 'false',
  };
}

function git(root, argv, environment) {
  const result = spawnSync('git', argv, {
    cwd: root, env: environment, shell: false, maxBuffer: MAX_SNAPSHOT_BYTES,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.error || result.status !== 0) throw new BenchmarkError('snapshot_git_failed');
  return result.stdout;
}

function contained(root, candidate) {
  const part = relative(root, candidate);
  return part !== '' && !part.startsWith(`..${sep}`) && part !== '..' && !isAbsolute(part);
}

function regularFile(path) {
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_SNAPSHOT_BYTES) {
    throw new BenchmarkError('snapshot_file_invalid');
  }
  return readFileSync(path);
}

function checkedDirectory(path) {
  if (!existsSync(path)) mkdirSync(path, { mode: 0o700 });
  const stat = lstatSync(path);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new BenchmarkError('benchmark_directory_unsafe');
}

function outputLocation(root, requested, environment) {
  const common = realpathSync(git(root, ['rev-parse', '--path-format=absolute', '--git-common-dir'], environment).toString().trim());
  const sharedRoot = dirname(common);
  const state = resolve(sharedRoot, '.swarm');
  const benchmarks = resolve(state, 'benchmarks');
  // These are new artifact directories, never budget-policy or ledger paths.
  checkedDirectory(state);
  checkedDirectory(benchmarks);
  const output = requested ? resolve(root, requested) : resolve(benchmarks, `local-validation-${randomUUID()}.json`);
  if (!contained(benchmarks, output) || extname(output) !== '.json') throw new BenchmarkError('benchmark_output_outside_private_directory');
  const segments = relative(benchmarks, dirname(output)).split(sep).filter(Boolean);
  let current = benchmarks;
  for (const segment of segments) {
    current = resolve(current, segment);
    checkedDirectory(current);
  }
  if (existsSync(output)) throw new BenchmarkError('benchmark_output_exists');
  const ignored = spawnSync('git', ['check-ignore', '--quiet', '--no-index', '--', relative(sharedRoot, output)], {
    cwd: sharedRoot, env: environment, shell: false, stdio: 'ignore',
  });
  if (ignored.error || ignored.status !== 0) throw new BenchmarkError('benchmark_directory_not_ignored');
  return output;
}

function checkpoint(output, receipt, initial = false) {
  receipt.checkpoint_sequence += 1;
  receipt.checkpointed_at_utc = utc();
  const temporary = `${output}.tmp-${randomUUID()}`;
  let descriptor;
  try {
    descriptor = openSync(temporary, 'wx', 0o600);
    writeFileSync(descriptor, `${JSON.stringify(receipt, null, 2)}\n`);
    fsyncSync(descriptor);
    closeSync(descriptor);
    descriptor = undefined;
    if (initial) {
      // link is atomic and cannot overwrite another invocation's receipt.
      linkSync(temporary, output);
      unlinkSync(temporary);
    } else {
      renameSync(temporary, output);
    }
    const directory = openSync(dirname(output), 'r');
    try { fsyncSync(directory); } finally { closeSync(directory); }
  } catch {
    if (descriptor !== undefined) closeSync(descriptor);
    if (existsSync(temporary)) unlinkSync(temporary);
    throw new BenchmarkError('benchmark_checkpoint_failed');
  }
}

function snapshot(root, environment) {
  const commit = git(root, ['rev-parse', '--verify', 'HEAD^{commit}'], environment).toString().trim();
  if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(commit)) throw new BenchmarkError('snapshot_commit_invalid');
  const status = git(root, ['status', '--porcelain=v1', '-z', '--untracked-files=all'], environment);
  const diff = git(root, ['diff', '--binary', '--full-index', '--no-ext-diff', '--no-textconv', 'HEAD', '--'], environment);
  const tasks = [];
  for (let number = 1; number <= 100; number += 1) {
    const id = `A${String(number).padStart(3, '0')}`;
    tasks.push({ id, sha256: sha256(regularFile(resolve(root, 'swarm/tasks', `${id}.json`))) });
  }
  const sourceRoot = resolve(root, 'docs/design');
  const sourceBytes = regularFile(resolve(sourceRoot, 'SOURCE-MANIFEST.json'));
  let manifest;
  try { manifest = JSON.parse(sourceBytes); } catch { throw new BenchmarkError('snapshot_design_manifest_invalid'); }
  if (!Array.isArray(manifest.files)) throw new BenchmarkError('snapshot_design_manifest_invalid');
  const design = manifest.files.map((entry) => {
    if (typeof entry.path !== 'string' || !entry.path.endsWith('.md') || entry.path.includes('\\')) {
      throw new BenchmarkError('snapshot_design_path_invalid');
    }
    const path = resolve(sourceRoot, entry.path);
    if (!contained(sourceRoot, path) || !contained(sourceRoot, realpathSync(path))) {
      throw new BenchmarkError('snapshot_design_path_invalid');
    }
    return { path: entry.path, sha256: sha256(regularFile(path)) };
  }).sort((left, right) => left.path.localeCompare(right.path));
  const untracked = git(root, ['ls-files', '--others', '--exclude-standard', '-z'], environment)
    .toString().split('\0').filter(Boolean).sort().map((path) => {
      const absolute = resolve(root, path);
      if (!contained(root, absolute)) throw new BenchmarkError('snapshot_untracked_path_invalid');
      const stat = lstatSync(absolute);
      return { path, sha256: sha256(stat.isSymbolicLink() ? `symlink:${readlinkSync(absolute)}` : regularFile(absolute)) };
    });
  const tooling = ['tools/benchmark-pilot.mjs', 'tools/benchmark-pilot.test.mjs',
    'tools/validate-pilot100.mjs', 'package.json', 'package-lock.json'].filter((path) => existsSync(resolve(root, path)))
    .map((path) => ({ path, sha256: sha256(regularFile(resolve(root, path))) }));
  return {
    commit_sha: commit, dirty: status.length !== 0, dirty_diff_sha256: sha256(diff),
    status_sha256: sha256(status), task_files: tasks, task_manifest_sha256: sha256(JSON.stringify(tasks)),
    design_manifest_sha256: sha256(sourceBytes), design_files: design, untracked_files: untracked, tooling_files: tooling,
  };
}

export function profileCommands(profile) {
  const metadata = { id: 'metadata', argv: [process.execPath, 'tools/validate-pilot100.mjs', '--require-issues'] };
  const tests = { id: 'benchmark-tests', argv: [process.execPath, '--test', 'tools/benchmark-pilot.test.mjs'] };
  const baseline = { id: 'baseline', argv: ['npm', 'run', 'check'] };
  if (profile === 'metadata') return [metadata];
  if (profile === 'baseline') return [baseline];
  if (profile === 'full') return [metadata, tests, baseline];
  throw new BenchmarkError('benchmark_profile_invalid');
}

function captureCommand(argv, root, environment, abortSignal) {
  return new Promise((done) => {
    const hashes = { stdout: createHash('sha256'), stderr: createHash('sha256') };
    const counts = { stdout: 0, stderr: 0 };
    let failure = null;
    let forced;
    const child = spawn(argv[0], argv.slice(1), {
      cwd: root, env: environment, shell: false, detached: process.platform !== 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const terminate = (signal) => {
      try {
        if (process.platform === 'win32') child.kill(signal);
        else process.kill(-child.pid, signal);
      } catch { /* A child can finish between interruption and signaling. */ }
    };
    const abort = () => {
      failure = 'interrupted';
      terminate(abortSignal.reason === 'SIGINT' ? 'SIGINT' : 'SIGTERM');
      forced = setTimeout(() => terminate('SIGKILL'), 5000);
      forced.unref();
    };
    abortSignal?.addEventListener('abort', abort, { once: true });
    if (abortSignal?.aborted) abort();
    const timeout = setTimeout(() => {
      failure = 'command_timeout';
      terminate('SIGTERM');
      forced = setTimeout(() => terminate('SIGKILL'), 5000);
      forced.unref();
    }, PHASE_TIMEOUT_MS);
    timeout.unref();
    for (const channel of ['stdout', 'stderr']) {
      child[channel].on('data', (bytes) => { counts[channel] += bytes.length; hashes[channel].update(bytes); });
      child[channel].on('error', () => { failure = 'output_stream_failed'; terminate('SIGTERM'); });
    }
    child.on('error', () => { failure = 'spawn_failed'; });
    child.on('close', (exitCode, signal) => {
      clearTimeout(timeout);
      if (forced) clearTimeout(forced);
      abortSignal?.removeEventListener('abort', abort);
      done({
        exit_code: exitCode, signal,
        failure_code: failure ?? (exitCode === 0 && signal === null ? null : 'command_failed'),
        stdout: { bytes: counts.stdout, sha256: hashes.stdout.digest('hex') },
        stderr: { bytes: counts.stderr, sha256: hashes.stderr.digest('hex') },
      });
    });
  });
}

export async function runBenchmark({ root = DEFAULT_ROOT, profile = 'full', output, signal, environment = process.env } = {}) {
  root = realpathSync(root);
  const commands = profileCommands(profile);
  const childEnv = childEnvironment(environment);
  const outputPath = outputLocation(root, output, childEnv);
  const clockStart = process.hrtime.bigint();
  const receipt = {
    receipt_format_version: 1, run_id: randomUUID(), measurement_kind: 'local_validation',
    is_live_swarm_run: false, profile, status: 'running', checkpoint_sequence: 0,
    clock: { definition: 'Local validation after output-path admission through commands and final source snapshot; includes intermediate checkpoints, excludes final receipt write; not swarm delivery time.',
      started_at_utc: utc(), finished_at_utc: null, monotonic_duration_seconds: null },
    runtime: { node: process.version, platform: process.platform, architecture: process.arch },
    source_snapshot: null, final_source_snapshot: null, source_unchanged: null,
    cost_usd: null, merged_green_prs: null, active_coding_agents: null, observed_concurrency: null,
    phases: commands.map((command) => ({ ...command, status: 'planned', started_at_utc: null,
      finished_at_utc: null, monotonic_duration_seconds: null, exit_code: null, signal: null,
      failure_code: null, stdout: emptyOutput(), stderr: emptyOutput() })),
    events: [{ type: 'run_started', at_utc: utc() }], failure_code: null,
  };
  checkpoint(outputPath, receipt, true);
  try {
    receipt.source_snapshot = snapshot(root, childEnv);
    checkpoint(outputPath, receipt);
    for (const phase of receipt.phases) {
      if (signal?.aborted) {
        receipt.status = 'interrupted';
        receipt.failure_code = 'interrupted';
        break;
      }
      phase.status = 'running';
      phase.started_at_utc = utc();
      const phaseStart = process.hrtime.bigint();
      receipt.events.push({ type: 'phase_started', phase: phase.id, at_utc: phase.started_at_utc });
      checkpoint(outputPath, receipt);
      const result = await captureCommand(phase.argv, root, childEnv, signal);
      Object.assign(phase, result, { finished_at_utc: utc(), monotonic_duration_seconds: elapsed(phaseStart) });
      phase.status = result.failure_code === null ? 'passed' : result.failure_code === 'interrupted' ? 'interrupted' : 'failed';
      receipt.events.push({ type: 'phase_finished', phase: phase.id, at_utc: phase.finished_at_utc, status: phase.status });
      checkpoint(outputPath, receipt);
      if (phase.status !== 'passed') {
        receipt.status = phase.status;
        receipt.failure_code = phase.failure_code;
        break;
      }
    }
    receipt.final_source_snapshot = snapshot(root, childEnv);
    receipt.source_unchanged = sha256(JSON.stringify(receipt.source_snapshot)) === sha256(JSON.stringify(receipt.final_source_snapshot));
    if (receipt.status === 'running') {
      receipt.status = receipt.source_unchanged ? 'passed' : 'failed';
      receipt.failure_code = receipt.source_unchanged ? null : 'source_changed_during_validation';
    }
  } catch (error) {
    receipt.status = signal?.aborted ? 'interrupted' : 'failed';
    receipt.failure_code = error instanceof BenchmarkError ? error.code : 'benchmark_validation_failed';
    for (const phase of receipt.phases.filter((item) => item.status === 'running')) {
      phase.status = receipt.status;
      phase.failure_code = receipt.failure_code;
      phase.finished_at_utc = utc();
    }
  }
  for (const phase of receipt.phases.filter((item) => item.status === 'planned')) {
    phase.status = 'skipped';
    phase.failure_code = receipt.status === 'interrupted' ? 'interrupted_before_phase' : 'previous_phase_failed';
  }
  receipt.clock.finished_at_utc = utc();
  receipt.clock.monotonic_duration_seconds = elapsed(clockStart);
  receipt.events.push({ type: 'run_finished', at_utc: receipt.clock.finished_at_utc, status: receipt.status });
  checkpoint(outputPath, receipt);
  return { receipt, outputPath, exitCode: receipt.status === 'passed' ? 0 : receipt.status === 'interrupted' ? 130 : 1 };
}

async function main() {
  const arguments_ = process.argv.slice(2);
  if (arguments_.length === 1 && arguments_[0] === '--help') {
    console.log('Usage: node tools/benchmark-pilot.mjs [--profile metadata|baseline|full] [--output PRIVATE_BENCHMARK_JSON]');
    return;
  }
  const options = {};
  for (let index = 0; index < arguments_.length; index += 2) {
    const flag = arguments_[index];
    const value = arguments_[index + 1];
    if (!value || !['--profile', '--output'].includes(flag) || options[flag.slice(2)] !== undefined) {
      throw new BenchmarkError('benchmark_arguments_invalid');
    }
    options[flag.slice(2)] = value;
  }
  const controller = new AbortController();
  const interrupt = () => controller.abort('SIGINT');
  const terminate = () => controller.abort('SIGTERM');
  process.on('SIGINT', interrupt);
  process.on('SIGTERM', terminate);
  try {
    const result = await runBenchmark({ ...options, signal: controller.signal });
    console.log(JSON.stringify({ receipt: result.outputPath, status: result.receipt.status, measurement_kind: 'local_validation' }));
    process.exitCode = result.exitCode;
  } finally {
    process.removeListener('SIGINT', interrupt);
    process.removeListener('SIGTERM', terminate);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(() => {
    console.error('benchmark_failed: inspect the private receipt when available; no raw child output is persisted.');
    process.exitCode = 1;
  });
}
