import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const safePath = (path) => typeof path === 'string' && path.length > 0
  && !path.startsWith('/') && !path.includes('\\')
  && !path.split('/').some((part) => ['', '.', '..', '.git', '.swarm'].includes(part));
const overlap = (a, b) => a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`);
const text = (value) => typeof value === 'string' && value.trim().length > 0;
const strings = (value) => Array.isArray(value) && value.every(text);
const ids = Array.from({ length: 100 }, (_, index) => `B${String(index + 1).padStart(3, '0')}`);

export function definitionDigest(tasks) {
  // Issue identities are publication bookkeeping; all actual work scope is frozen.
  const definitions = tasks.map((task) => {
    const definition = { ...task };
    delete definition.issue;
    delete definition.issueUrl;
    return definition;
  }).sort((a, b) => a.id.localeCompare(b.id));
  return digest(JSON.stringify(definitions));
}

export function validateParallel100(root = ROOT, options = {}) {
  try { return validateInputs(root, options); }
  catch {
    return { valid: false, measurement_kind: 'static_preparation',
      errors: ['preparation: missing, unsafe or malformed input'], local_parallel_work_prepared: false,
      launch_readiness_verified: false };
  }
}

function setting(profile, section, key) {
  let current;
  const values = [];
  for (const line of profile.split('\n')) {
    const stripped = line.split('#')[0].trim();
    const header = /^\[([^\]]+)\]$/.exec(stripped);
    if (header) current = header[1];
    else if (current === section && new RegExp(`^${key}\\s*=`).test(stripped)) values.push(stripped.split('=')[1].trim());
  }
  return values.length === 1 ? values[0] : undefined;
}

function validateInputs(root, { requireIssues = false, requireDisabled = true } = {}) {
  const errors = [];
  const fail = (id, message) => errors.push(`${id}: ${message}`);
  const load = (path) => JSON.parse(readFileSync(resolve(root, path), 'utf8'));
  let manifest;
  try { manifest = load('swarm/parallel100.json'); }
  catch { return { valid: false, errors: ['manifest: missing or invalid JSON'] }; }
  if (manifest.id !== 'afterimage-parallel100' || manifest.version !== 1
    || JSON.stringify(manifest.taskIds) !== JSON.stringify(ids)) fail('manifest', 'exact ordered B001-B100 cohort required');
  if (manifest.liveExecutionAuthorized !== false) fail('manifest', 'paid execution must remain unauthorized');
  const tasks = [];
  const issues = new Set();
  const originalIssues = new Set(readdirSync(resolve(root, 'swarm/tasks'))
    .filter((name) => /^A\d{3}\.json$/.test(name))
    .map((name) => load(`swarm/tasks/${name}`).issue)
    .filter((number) => Number.isSafeInteger(number) && number > 0));
  const designBytes = readFileSync(resolve(root, 'docs/design/SOURCE-MANIFEST.json'));
  const designHash = digest(designBytes);
  for (const source of JSON.parse(designBytes).files) {
    if (!safePath(source.path)) { fail('design', 'unsafe source path'); continue; }
    if (digest(readFileSync(resolve(root, 'docs/design', source.path))) !== source.sha256) fail('design', `changed frozen source ${source.path}`);
  }
  const contracts = new Map();
  for (const entry of manifest.contracts ?? []) {
    if (!safePath(entry.path) || contracts.has(entry.path)) { fail('contract', 'unsafe or duplicate path'); continue; }
    try {
      const bytes = readFileSync(resolve(root, entry.path));
      if (digest(bytes) !== entry.sha256) fail('contract', `digest mismatch ${entry.path}`);
      contracts.set(entry.path, bytes.toString());
    } catch { fail('contract', `missing ${entry.path}`); }
  }
  if (contracts.size !== 2) fail('contract', 'both frozen UI and domain contracts required');
  if (manifest.designManifestSha256 !== designHash) fail('manifest', 'design digest mismatch');
  const policyPath = 'docs/SWARM_BENCHMARK.md';
  if (manifest.benchmarkPolicy?.path !== policyPath
    || manifest.benchmarkPolicy?.sha256 !== digest(readFileSync(resolve(root, policyPath)))) fail('manifest', 'benchmark policy digest mismatch');
  const filenames = readdirSync(resolve(root, 'swarm/tasks')).filter((name) => /^B\d{3}\.json$/.test(name)).sort();
  if (filenames.length !== 100) fail('cohort', 'exactly 100 B-series files required');
  for (const id of ids) {
    let task;
    try { task = load(`swarm/tasks/${id}.json`); } catch { fail(id, 'missing or invalid task'); continue; }
    tasks.push(task);
    if (task.id !== id || !text(task.title) || !text(task.prompt)) fail(id, 'ID/title/prompt invalid');
    if (task.status !== 'ready' || !Array.isArray(task.dependsOn) || task.dependsOn.length
      || !Array.isArray(task.blockedBy) || task.blockedBy.length) fail(id, 'cohort requires independent ready work, without hidden gates');
    if (task.preparationCohort !== manifest.id || task.designManifestSha256 !== designHash) fail(id, 'cohort/source binding mismatch');
    if (!strings(task.ownership) || !task.ownership.length || !task.ownership.every(safePath)) fail(id, 'unsafe or missing ownership');
    if (!strings(task.acceptance) || task.acceptance.length < 4) fail(id, 'four concrete acceptance criteria required');
    if (typeof task.countsAsFeatureDelivery !== 'boolean') fail(id, 'feature/support classification required');
    const contract = task.contract;
    if (!contract || !/^[A-Za-z][A-Za-z0-9]*$/.test(contract.export)
      || !new RegExp(`\\b${contract.export}\\b`).test(contracts.get(contract.path) ?? '')) fail(id, 'export absent from frozen contract');
    if (!strings(task.sourceRefs) || !task.sourceRefs.includes(contract?.path)) fail(id, 'contract source reference required');
    for (const path of task.sourceRefs ?? []) {
      const file = path.split('#')[0];
      if (!safePath(file) || !existsSync(resolve(root, file))) fail(id, 'unsafe or missing source reference');
    }
    if (!strings(task.replacesScopeFrom) || !task.replacesScopeFrom.length
      || task.replacesScopeFrom.some((old) => !/^A\d{3}$/.test(old) || !existsSync(resolve(root, 'swarm/tasks', `${old}.json`)))) fail(id, 'original A-scope traceability required');
    if (requireIssues || task.issue !== undefined) {
      if (!Number.isSafeInteger(task.issue) || task.issue < 1 || issues.has(task.issue) || originalIssues.has(task.issue)
        || task.issueUrl !== `https://github.com/slgarza/Afterimage/issues/${task.issue}`) fail(id, 'unique real issue identity required');
      else issues.add(task.issue);
    }
  }
  let collisions = 0;
  for (let i = 0; i < tasks.length; i += 1) {
    for (let j = i + 1; j < tasks.length; j += 1) {
      if ((tasks[i].ownership ?? []).some((a) => (tasks[j].ownership ?? []).some((b) => overlap(a, b)))) {
        collisions += 1;
        fail(`${tasks[i].id}/${tasks[j].id}`, 'ownership collision in independent cohort');
      }
      if (tasks[i].contract?.export === tasks[j].contract?.export) fail(`${tasks[i].id}/${tasks[j].id}`, 'duplicate public export');
    }
  }
  if (definitionDigest(tasks) !== manifest.backlogDefinitionSha256) fail('manifest', 'workload definitions changed since freeze');
  const profile = readFileSync(resolve(root, 'swarm.toml'), 'utf8');
  const live = setting(profile, 'budget', 'live_enabled');
  if (!['true', 'false'].includes(live)) fail('profile', 'one explicit valid live flag required');
  if (requireDisabled && live !== 'false') fail('profile', 'live execution must remain disabled');
  if (setting(profile, 'budget', 'max_live_agents') !== '100'
    || setting(profile, 'runtime', 'gateway_concurrency') !== '100') fail('profile', 'explicit worker and gateway capacities of100 required');
  return {
    valid: errors.length === 0, errors, measurement_kind: 'static_preparation',
    cohort: manifest.id, tasks: tasks.length, ready_tasks: tasks.filter((t) => t.status === 'ready').length,
    linked_issues: issues.size, dependencies: tasks.reduce((n, t) => n + (t.dependsOn?.length ?? 0), 0),
    shared_owned_paths: collisions, design_manifest_sha256: designHash,
    workload_definition_sha256: definitionDigest(tasks),
    local_parallel_work_prepared: errors.length === 0,
    live_execution_enabled: live === 'true', launch_readiness_verified: false,
    provider_capacity_verified: false, remaining_budget_verified: false,
    actual_billed_cost_usd: null, live_agent_runs: null,
    live_agent_runs_created_by_this_check: 0,
  };
}

function main() {
  const args = process.argv.slice(2);
  if (args.some((arg) => !['--require-issues', '--workload-only'].includes(arg))) throw new Error('Only --require-issues and --workload-only are accepted; this tool never dispatches.');
  const result = validateParallel100(ROOT, { requireIssues: args.includes('--require-issues'),
    requireDisabled: !args.includes('--workload-only') });
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.valid ? 0 : 1;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
