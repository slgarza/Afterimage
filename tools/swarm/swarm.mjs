#!/usr/bin/env node

/**
 * Small, local-first swarm control plane.
 *
 * Workers never write to main. This script gives each task an isolated git
 * worktree and a lease; the integrator remains responsible for validation,
 * commits, push and PR creation.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const toolDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(toolDir, '../..');
const taskDir = join(toolDir, 'tasks');
const swarmDir = join(repoRoot, '.swarm');
const worktreeDir = join(swarmDir, 'worktrees');
const leaseDir = join(swarmDir, 'leases');
const runDir = join(swarmDir, 'runs');
const command = process.argv[2];
const taskId = process.argv[3];

function die(message) {
  console.error(`swarm: ${message}`);
  process.exit(1);
}

function git(args, cwd = repoRoot) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function run(commandName, args, cwd) {
  execFileSync(commandName, args, { cwd, stdio: 'inherit' });
}

function ensureDirs() {
  for (const directory of [swarmDir, worktreeDir, leaseDir, runDir]) mkdirSync(directory, { recursive: true });
}

function allTasks() {
  if (!existsSync(taskDir)) return [];
  return (awaitableReaddir(taskDir))
    .filter((name) => name.endsWith('.json'))
    .map((name) => loadTask(name.slice(0, -5)));
}

function awaitableReaddir(directory) {
  // Kept synchronous deliberately: state changes must be atomic within one CLI invocation.
  return execFileSync('find', [directory, '-maxdepth', '1', '-type', 'f', '-name', '*.json', '-print'], { encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((file) => file.slice(directory.length + 1));
}

function loadTask(id) {
  const filename = join(taskDir, `${id}.json`);
  if (!existsSync(filename)) die(`unknown task ${id}`);
  let task;
  try {
    task = JSON.parse(readFileSync(filename, 'utf8'));
  } catch (error) {
    die(`invalid JSON in ${filename}: ${error.message}`);
  }
  for (const field of ['id', 'title', 'ownership', 'prompt', 'acceptance']) {
    if (!task[field]) die(`${filename} is missing ${field}`);
  }
  if (task.id !== id) die(`${filename} id must match filename`);
  if (!Array.isArray(task.ownership) || !Array.isArray(task.acceptance)) die(`${filename} ownership and acceptance must be arrays`);
  task.dependsOn ??= [];
  return task;
}

function leasePath(id) { return join(leaseDir, `${id}.json`); }
function taskWorktree(id) { return join(worktreeDir, id); }

function getLease(id) {
  const filename = leasePath(id);
  return existsSync(filename) ? JSON.parse(readFileSync(filename, 'utf8')) : null;
}

function activeLeases() {
  if (!existsSync(leaseDir)) return [];
  return awaitableReaddir(leaseDir).map((name) => JSON.parse(readFileSync(join(leaseDir, name), 'utf8')));
}

function dependencyCheck(task) {
  for (const dependency of task.dependsOn) {
    const report = join(runDir, `${dependency}.json`);
    if (!existsSync(report) || JSON.parse(readFileSync(report, 'utf8')).status !== 'validated') {
      die(`${task.id} depends on ${dependency}, which is not validated`);
    }
  }
}

function ownershipConflicts(task) {
  return activeLeases().filter((lease) => lease.taskId !== task.id && lease.ownership.some((path) => task.ownership.some((owned) => path === owned || path.startsWith(`${owned}/`) || owned.startsWith(`${path}/`))));
}

function writeBrief(task, worktree) {
  const body = `# ${task.id}: ${task.title}\n\n## Worker contract\n\n${task.prompt}\n\n## Ownership (do not edit outside this list)\n\n${task.ownership.map((path) => `- \`${path}\``).join('\n')}\n\n## Acceptance\n\n${task.acceptance.map((item) => `- [ ] ${item}`).join('\n')}\n\n## Required handoff\n\nReport files touched, commands run and their output, limitations, and any needed dependency. Do not commit, push, open a PR, or modify main. The integrator validates and performs those actions.\n`;
  writeFileSync(join(worktree, 'SWARM-TASK.md'), body);
}

function linkDependencies(worktree) {
  const source = join(repoRoot, 'node_modules');
  const destination = join(worktree, 'node_modules');
  if (!existsSync(source) || existsSync(destination)) return;
  symlinkSync(relative(worktree, source), destination, 'dir');
}

function prepare(id) {
  ensureDirs();
  const task = loadTask(id);
  if (getLease(id)) die(`${id} already has an active lease`);
  dependencyCheck(task);
  const conflicts = ownershipConflicts(task);
  if (conflicts.length) die(`${id} conflicts with active lease(s): ${conflicts.map((lease) => lease.taskId).join(', ')}`);
  const worktree = taskWorktree(id);
  if (existsSync(worktree)) die(`worktree already exists at ${worktree}; release ${id} or inspect it`);
  const branch = `swarm/${id.toLowerCase()}`;
  const branchExists = git(['branch', '--list', branch]) === branch;
  git(branchExists ? ['worktree', 'add', worktree, branch] : ['worktree', 'add', '-b', branch, worktree, 'HEAD']);
  linkDependencies(worktree);
  writeBrief(task, worktree);
  const lease = { taskId: id, branch, worktree, ownership: task.ownership, createdAt: new Date().toISOString(), status: 'claimed' };
  writeFileSync(leasePath(id), `${JSON.stringify(lease, null, 2)}\n`);
  console.log(JSON.stringify(lease, null, 2));
}

function validate(id) {
  ensureDirs();
  const lease = getLease(id);
  if (!lease) die(`${id} has no active lease`);
  if (!existsSync(lease.worktree)) die(`${id} lease points to a missing worktree`);
  run('npm', ['run', 'check'], lease.worktree);
  const report = { taskId: id, status: 'validated', branch: lease.branch, worktree: lease.worktree, validatedAt: new Date().toISOString(), command: 'npm run check' };
  writeFileSync(join(runDir, `${id}.json`), `${JSON.stringify(report, null, 2)}\n`);
  lease.status = 'validated';
  lease.validatedAt = report.validatedAt;
  writeFileSync(leasePath(id), `${JSON.stringify(lease, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
}

function release(id) {
  const lease = getLease(id);
  if (!lease) die(`${id} has no active lease`);
  if (existsSync(lease.worktree)) git(['worktree', 'remove', '--force', lease.worktree]);
  rmSync(leasePath(id));
  console.log(`released ${id}`);
}

function status() {
  const rows = allTasks().map((task) => {
    const lease = getLease(task.id);
    const report = existsSync(join(runDir, `${task.id}.json`)) ? JSON.parse(readFileSync(join(runDir, `${task.id}.json`), 'utf8')) : null;
    return { id: task.id, title: task.title, ownership: task.ownership, state: report?.status ?? lease?.status ?? 'ready', branch: lease?.branch ?? null };
  });
  console.log(JSON.stringify(rows, null, 2));
}

function usage() {
  console.log(`Usage:\n  node tools/swarm/swarm.mjs status\n  node tools/swarm/swarm.mjs prepare TASK_ID\n  node tools/swarm/swarm.mjs validate TASK_ID\n  node tools/swarm/swarm.mjs release TASK_ID\n\nState lives in .swarm/ (ignored). Workers get one worktree and one ownership lease; the integrator owns commits, PRs and merging.`);
}

try {
  if (command === 'status') status();
  else if (command === 'prepare' && taskId) prepare(taskId);
  else if (command === 'validate' && taskId) validate(taskId);
  else if (command === 'release' && taskId) release(taskId);
  else usage();
} catch (error) {
  die(error.stderr?.toString().trim() || error.message);
}
