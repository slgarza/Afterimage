import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const directory = resolve(root, 'swarm/tasks');
const requireIssues = process.argv.includes('--require-issues');
const errors = [];
const sourceRoot = resolve(root, 'docs/design');
const sourceManifestBytes = readFileSync(resolve(sourceRoot, 'SOURCE-MANIFEST.json'));
const designManifestSha256 = createHash('sha256').update(sourceManifestBytes).digest('hex');
const tasks = new Map();
const issues = new Set();
const fail = (id, message) => errors.push(`${id}: ${message}`);
const nonempty = (value) => typeof value === 'string' && value.trim().length > 0;
const strings = (value) => Array.isArray(value) && value.every(nonempty);
const safePath = (value) => nonempty(value) && !value.startsWith('/') && !value.includes('\\')
  && !value.split('/').some((part) => ['', '.', '..', '.git', '.swarm'].includes(part));

const batch = JSON.parse(readFileSync(resolve(root, 'swarm/pilot100.json')));
const policyHash = createHash('sha256')
  .update(readFileSync(resolve(root, 'docs/SWARM_BENCHMARK.md'))).digest('hex');
if (batch.benchmarkPolicy?.path !== 'docs/SWARM_BENCHMARK.md'
  || batch.benchmarkPolicy?.sha256 !== policyHash
  || batch.benchmarkPolicy?.requiredForAllStages !== true) {
  fail('benchmark', 'the mandatory policy must be present and bound by its actual digest');
}

const sources = JSON.parse(sourceManifestBytes);
if (sources.version !== 1 || !Array.isArray(sources.files) || sources.files.length !== 11) {
  fail('design', 'expected the eleven frozen source documents');
} else {
  const seen = new Set();
  for (const source of sources.files) {
    if (!safePath(source.path) || seen.has(source.path)) {
      fail('design', 'invalid or duplicate frozen source path');
      continue;
    }
    seen.add(source.path);
    try {
      const actual = createHash('sha256').update(readFileSync(resolve(sourceRoot, source.path))).digest('hex');
      if (actual !== source.sha256) fail('design', `source digest changed: ${source.path}`);
    } catch {
      fail('design', `missing frozen source: ${source.path}`);
    }
  }
}

for (const filename of readdirSync(directory).filter((name) => /^A\d{3}\.json$/.test(name)).sort()) {
  try {
    const task = JSON.parse(readFileSync(resolve(directory, filename), 'utf8'));
    if (task.id !== filename.slice(0, -5)) fail(filename, 'ID differs from filename');
    if (!nonempty(task.title) || !nonempty(task.prompt)) fail(filename, 'title/prompt required');
    if (task.designManifestSha256 !== designManifestSha256) fail(filename, 'task is not bound to the frozen design source');
    if (!strings(task.ownership) || !task.ownership.length || !task.ownership.every(safePath)) {
      fail(filename, 'ownership must use explicit repository-relative paths');
    }
    if (!strings(task.acceptance) || task.acceptance.length < 3) fail(filename, 'three acceptance criteria required');
    if (!strings(task.dependsOn) || new Set(task.dependsOn).size !== task.dependsOn.length) {
      fail(filename, 'dependencies must be unique IDs');
    }
    if (!['ready', 'blocked', 'merged', 'superseded'].includes(task.status)) fail(filename, 'explicit status required');
    if (!strings(task.blockedBy) || !strings(task.sourceRefs) || !task.sourceRefs.length) {
      fail(filename, 'blocker and source reference arrays required');
    }
    if (typeof task.countsAsFeatureDelivery !== 'boolean') fail(filename, 'feature classification required');
    if (task.status === 'ready' && task.blockedBy?.length) fail(filename, 'ready task has decision blockers');
    for (const ref of task.sourceRefs ?? []) {
      const path = ref.split('#')[0];
      if (!safePath(path)) {
        fail(filename, 'unsafe source reference');
        continue;
      }
      try { readFileSync(resolve(root, path)); } catch { fail(filename, `missing source ${path}`); }
    }
    if (requireIssues || task.issue !== undefined) {
      if (!Number.isSafeInteger(task.issue) || task.issue <= 0 || issues.has(task.issue)) {
        fail(filename, 'unique real positive GitHub issue required');
      } else {
        issues.add(task.issue);
        if (task.issueUrl !== `https://github.com/slgarza/Afterimage/issues/${task.issue}`) {
          fail(filename, 'issue URL differs from repository/number');
        }
      }
    }
    tasks.set(task.id, task);
  } catch {
    fail(filename, 'invalid JSON/task structure');
  }
}

for (let number = 1; number <= 100; number += 1) {
  const id = `A${String(number).padStart(3, '0')}`;
  if (!tasks.has(id)) fail(id, 'missing task');
}
if (tasks.size !== 100) fail('batch', 'exactly 100 A-series tasks required');

const visited = new Set();
const active = new Set();
function visit(id) {
  if (active.has(id)) { fail(id, 'dependency cycle'); return; }
  if (visited.has(id)) return;
  const task = tasks.get(id);
  if (!task) { fail(id, 'missing dependency'); return; }
  active.add(id);
  for (const dependency of task.dependsOn ?? []) {
    visit(dependency);
    if (task.status === 'ready' && tasks.get(dependency)?.status !== 'merged') {
      fail(id, `ready task needs unmerged ${dependency}`);
    }
  }
  active.delete(id);
  visited.add(id);
}
for (const id of tasks.keys()) visit(id);

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  const values = [...tasks.values()];
  const counts = (key) => Object.fromEntries([...new Set(values.map((task) => task[key]))]
    .map((value) => [String(value), values.filter((task) => task[key] === value).length]));
  console.log(JSON.stringify({
    tasks: tasks.size,
    issueLinks: issues.size,
    statuses: counts('status'),
    categories: counts('category'),
    featureCandidates: values.filter((task) => task.countsAsFeatureDelivery).length,
    designManifestSha256,
    readyTaskIds: values.filter((task) => task.status === 'ready').map((task) => task.id),
    liveExecutionAuthorized: false,
  }, null, 2));
}
