import { execFileSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { definitionDigest, digest, validateParallel100 } from './prepare-parallel100.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = '79404fe6d4ed5cf1b59b5610a3aebbe9d1f8021f';
const IDS = Array.from({ length: 100 }, (_, index) => `B${String(index + 1).padStart(3, '0')}`);
const SUPPORT = ['B077', 'B090', 'B094'];
const safePath = (path) => typeof path === 'string' && path.length > 0
  && !path.startsWith('/') && !path.includes('\\') && !path.includes('\0')
  && !path.split('/').some((part) => ['', '.', '..', '.git', '.swarm'].includes(part));
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const sha = (value) => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);

function git(root, ...args) {
  // Only local object reads: forbid promisor auto-fetch, external fsmonitor and
  // optional index locks. No shell, provider, ledger or GitHub operation.
  return execFileSync('git', ['--no-pager', '--no-optional-locks', '-C', root,
    '-c', 'core.fsmonitor=false', '-c', 'protocol.allow=never', ...args], {
    env: { ...process.env, GIT_NO_LAZY_FETCH: '1', GIT_OPTIONAL_LOCKS: '0' },
    stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 5_000_000,
  });
}

function cents(value) {
  if (typeof value !== 'string' || !/^\d+\.\d{2}$/.test(value)) return undefined;
  const result = Number(value.replace('.', ''));
  return Number.isSafeInteger(result) ? result : undefined;
}

function profileSetting(profile, section, name) {
  let current;
  const values = [];
  for (const line of profile.split('\n')) {
    const stripped = line.split('#')[0].trim();
    const header = /^\[([^\]]+)\]$/.exec(stripped);
    if (header) current = header[1];
    else if (current === section && new RegExp(`^${name}\\s*=`).test(stripped)) {
      values.push(stripped.slice(stripped.indexOf('=') + 1).trim());
    }
  }
  return values.length === 1 ? values[0] : undefined;
}

export function validateDeployment100(root = ROOT, {
  controllerRoot = resolve(root, '..', 'swarm-control'), gitRead = git,
} = {}) {
  const result = {
    valid: false, measurement_kind: 'offline_deployment_packet_validation', errors: [],
    checked_bindings: 0, frozen_bindings: 0, checked_source_references: 0,
    task_count: 0, read_only: true, live_execution_enabled: null,
    launch_readiness_verified: false, provider_capacity_verified: false,
    owner_authorization_verified: false, actual_billed_cost_usd: null,
    remote_operations: 0, live_agent_runs_created_by_this_check: 0,
  };
  const fail = (message) => result.errors.push(message);
  const require = (condition, message) => { if (!condition) fail(message); };
  try {
    const realRoot = realpathSync(root);
    const bytes = (path) => {
      if (!safePath(path)) throw new Error('unsafe path');
      const resolved = realpathSync(resolve(realRoot, path));
      if (!resolved.startsWith(realRoot + sep)) throw new Error('path escapes checkout');
      return readFileSync(resolved);
    };
    const load = (path) => JSON.parse(bytes(path));
    const packet = load('swarm/deployment100.json');
    const source = packet.source;
    require(packet.version === 1 && packet.id === 'afterimage-parallel100-deployment', 'packet: unsupported identity/version');
    require(packet.mode === 'preparation-only' && packet.scope === 'unpaired-module-scale-pilot'
      && packet.launchPermitted === false && packet.liveExecutionAuthorized === false,
    'packet: preparation must remain unauthorized and disabled');
    require(source.targetRepository === 'slgarza/Afterimage'
      && source.controllerRepository === 'slgarza/swarm-control', 'source: repository identity mismatch');
    require(source.targetBaseSha === BASE, 'source: exact frozen worker base required');
    for (const [name, path, commit] of [
      ['target', realRoot, source.targetBaseSha],
      ['controller', controllerRoot, source.controllerCommit],
      ['prepared controller', controllerRoot, source.preparedControllerCommit],
    ]) {
      if (!sha(commit)) { fail(`source: invalid ${name} commit`); continue; }
      try { gitRead(path, 'cat-file', '-e', `${commit}^{commit}`); }
      catch { fail(`source: unavailable local ${name} commit`); }
    }
    const expectedSources = [
      ['profile', 'swarm.toml'], ['manifest', 'swarm/parallel100.json'],
      ['designManifest', 'docs/design/SOURCE-MANIFEST.json'],
      ['benchmarkPolicy', 'docs/SWARM_BENCHMARK.md'],
      ['launchGuide', 'docs/SWARM100_LAUNCH.md'],
      ['acceptancePolicy', 'docs/SWARM100_ACCEPTANCE.md'],
    ];
    const operational = new Set(['docs/SWARM100_LAUNCH.md', 'docs/SWARM100_ACCEPTANCE.md']);
    const bindings = expectedSources.map(([key, path]) => {
      require(source[key]?.path === path, `source: ${key} path mismatch`);
      return source[key];
    });
    require(Array.isArray(source.contracts) && same(source.contracts.map((item) => item.path),
      ['docs/PILOT100_UI_CONTRACTS.md', 'docs/PILOT100_DOMAIN_CONTRACTS.md']), 'source: exact frozen contracts required');
    bindings.push(...source.contracts, ...packet.tasks);
    require(bindings.length === 108, 'bindings: exactly 108 entries required');
    const boundPaths = new Set();
    for (const entry of bindings) {
      if (!entry || !safePath(entry.path) || boundPaths.has(entry.path)
        || typeof entry.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(entry.sha256)) {
        fail('bindings: unsafe, duplicate or malformed binding'); continue;
      }
      boundPaths.add(entry.path);
      let current;
      try { current = bytes(entry.path); }
      catch { fail(`bindings: unavailable ${entry.path}`); continue; }
      require(digest(current) === entry.sha256, `bindings: current digest mismatch ${entry.path}`);
      result.checked_bindings += 1;
      if (!operational.has(entry.path)) {
        try {
          require(current.equals(gitRead(realRoot, 'show', `${BASE}:${entry.path}`)),
            `bindings: frozen worker base differs ${entry.path}`);
          result.frozen_bindings += 1;
        } catch { fail(`bindings: missing from frozen worker base ${entry.path}`); }
      }
    }
    require(result.checked_bindings === 108 && result.frozen_bindings === 106, 'bindings: incomplete release/source verification');
    require(same(packet.taskIds, IDS) && same(packet.tasks.map((task) => task.id), IDS), 'tasks: exact ordered B001-B100 required');
    const tasks = IDS.map((id, index) => {
      const task = load(`swarm/tasks/${id}.json`);
      const bound = packet.tasks[index];
      require(bound.path === `swarm/tasks/${id}.json` && task.id === id, `${id}: task path/identity mismatch`);
      require(bound.issue === 134 + index && bound.issue === task.issue
        && bound.issueUrl === task.issueUrl
        && bound.issueUrl === `https://github.com/slgarza/Afterimage/issues/${134 + index}`, `${id}: exact issue binding mismatch`);
      require(bound.countsAsFeatureDelivery === !SUPPORT.includes(id)
        && bound.countsAsFeatureDelivery === task.countsAsFeatureDelivery, `${id}: feature/support classification mismatch`);
      require(task.status === 'ready' && same(task.dependsOn, []) && same(task.blockedBy, []), `${id}: independent ready task required`);
      return task;
    });
    result.task_count = tasks.length;
    const manifest = load('swarm/parallel100.json');
    require(source.workloadDefinitionSha256 === manifest.backlogDefinitionSha256
      && source.workloadDefinitionSha256 === definitionDigest(tasks), 'workload: definition digest mismatch');
    require(packet.workload.taskCount === 100 && packet.workload.productModuleCandidates === 97
      && same(packet.workload.supportingTaskIds, SUPPORT)
      && packet.workload.dependencies === 0 && packet.workload.sharedOwnedPaths === 0
      && packet.workload.dispatchOverlappingATasks === false
      && packet.workload.moduleDeliveryEstablishesAppIntegration === false
      && packet.workload.liveCollisionRepairProven === false, 'workload: inventory or unsupported delivery/scale claim');
    const reserved = [...new Set(tasks.flatMap((task) => task.replacesScopeFrom))].sort();
    require(same(packet.workload.reservedOriginalTaskIds, reserved), 'workload: original A-scope reservation mismatch');
    const references = new Set(tasks.flatMap((task) => task.sourceRefs.map((path) => path.split('#')[0])));
    const design = load('docs/design/SOURCE-MANIFEST.json');
    for (const entry of design.files) {
      if (!safePath(entry.path)) { fail('design: unsafe source path'); continue; }
      references.add(`docs/design/${entry.path}`);
    }
    for (const path of references) {
      try {
        require(bytes(path).equals(gitRead(realRoot, 'show', `${BASE}:${path}`)), `source reference: frozen bytes differ ${path}`);
        result.checked_source_references += 1;
      } catch { fail('source reference: missing or unsafe frozen input'); }
    }
    const workload = validateParallel100(realRoot, { requireIssues: true });
    require(workload.valid, 'workload: independent-task, contract, design or disabled-profile validation failed');
    const profile = bytes('swarm.toml').toString();
    const live = profileSetting(profile, 'budget', 'live_enabled');
    result.live_execution_enabled = ['true', 'false'].includes(live) ? live === 'true' : null;
    require(live === 'false'
      && profileSetting(profile, 'budget', 'model_limit_cents') === '1800'
      && profileSetting(profile, 'budget', 'infra_limit_cents') === '700', 'profile: original disabled budget policy required');

    const runtime = packet.runtime;
    for (const [key, expected] of Object.entries({
      workers: 100, synchronized: true, gatewayConcurrency: 100,
      cpu: 2, memoryMiB: 2048, resourceValuesAreMaximums: true, cpuRequest: 0.5, memoryMiBRequest: 512,
      minimumConcurrentContainers: 101, administrativeHelperPeakContainers: 102,
      administrativeHelperPeakIsGuaranteedMaximum: false,
      agentTimeoutSeconds: 1800, maximumWorkerLifecycleSeconds: 2700,
      gatewayRunTtlSeconds: 2700, gatewayTtlSoftwareCeilingSeconds: 3600,
      gatewayHttpTimeoutSeconds: 900, workerModelStreamIdleTimeoutSeconds: 900,
      preparationBarrierTimeoutSeconds: 300, setupAndFinalCheckTimeoutSeconds: 240,
      unchangedDefaultAgentTimeoutSeconds: 300,
      providerRateTokensPerMinute: 800_000, providerRateRequestsPerMinute: 4000,
      providerRateMaximumCombinedWaitSeconds: 300,
      model: 'gpt-6.1-sol', gatewayOrigin: null, authorizedRuntimeProfile: null,
      allowOverlap: false, automaticRetry: false, automaticRefill: false,
      dispatchCommandExecuted: false, imageBuildExecuted: false, probeExecuted: false,
      gatewayDeploymentExecuted: false, workerHasGitHubOrProviderCredentials: false,
      credentialedIntegrationSeparatedFromWorker: true,
    })) require(runtime[key] === expected, `runtime: ${key} mismatch`);
    require(same(runtime.aggregateWorkerRequests, { cpu: 50, memoryGiB: 50 })
      && same(runtime.aggregateWorkerMaximums, { cpu: 200, memoryGiB: 200 }), 'runtime: aggregate resources inconsistent');
    for (const [key, setting] of [['workerApp', 'worker_app'], ['gatewayApp', 'gateway_app'],
      ['gatewayLedger', 'gateway_ledger'], ['environment', 'environment']]) {
      require(profileSetting(profile, 'runtime', setting) === JSON.stringify(runtime[key]), `runtime: ${key} differs from preserved profile`);
    }
    const capacity = runtime.suppliedModelCapacity;
    require(capacity.model === runtime.model && capacity.tokensPerMinute === 1_000_000
      && capacity.requestsPerMinute === 5000 && capacity.verifiedByProviderApi === false
      && capacity.interactiveTokensPerDay === null && capacity.batchQueueIsInteractiveDailyQuotaEvidence === false,
    'runtime: supplied capacity must remain accurately scoped and unverified');
    require(runtime.providerRateTokensPerMinute * 5 === capacity.tokensPerMinute * 4
      && runtime.providerRateRequestsPerMinute * 5 === capacity.requestsPerMinute * 4,
    'runtime: pacing must retain 20 percent headroom');
    require(same(runtime.proposedRuntimeTomlSettings, { gateway_concurrency: 100,
      gateway_tokens_per_minute: 800_000, gateway_requests_per_minute: 4000 }), 'runtime: proposed TOML pacing mismatch');

    const budget = packet.budget;
    for (const key of ['ownerAuthorization', 'authorizedNewSpendUsd', 'approvedIncrementalModelCeilingUsd',
      'approvedIncrementalInfrastructureCeilingUsd', 'approvedCumulativeModelLimitCents',
      'approvedCumulativeInfrastructureLimitCents', 'approvedRunModelReservationUsd', 'approvedSetupAndRepairScope',
      'providerCreditBalanceUsd', 'availableProviderFundsUsd', 'actualBilledCohortCostUsd']) {
      require(budget[key] === null, `budget: ${key} must remain unknown/unapproved`);
    }
    require(budget.currency === 'usd' && budget.billingReconciled === false
      && budget.allocationReleaseAuthorized === false && budget.migrationApplied === false
      && budget.proposalRetainedAllocationBasisMustBeRefreshed === true, 'budget: candidate must not imply approval, refund or actual billing');
    const run = budget.proposedRunReservationUsd;
    const probe = budget.fixedProbeAdmissionReserveUsd;
    const envelope = budget.proposedNewEnvelopeUsd;
    const remaining = budget.proposedRemainingEnvelopeUsd;
    require(cents(run.model) === 14_500 && cents(run.infrastructure) === 3100
      && cents(probe.model) === 50 && cents(probe.infrastructure) === 135, 'budget: exact run/probe reservation mismatch');
    const subtotal = cents(run.model) + cents(run.infrastructure) + cents(probe.model) + cents(probe.infrastructure);
    const total = cents(envelope.model) + cents(envelope.infrastructure);
    require(subtotal === 17_785 && cents(budget.proposedRunAndOneProbeReservationSubtotalUsd) === subtotal
      && total === 20_000 && cents(budget.planningNewSpendCeilingUsd) === total
      && cents(budget.proposedRemainingSetupCiRepairEnvelopeUsd) === total - subtotal,
    'budget: USD200 envelope/subtotal/remainder arithmetic mismatch');
    require(cents(envelope.model) === 15_000 && cents(envelope.infrastructure) === 5000
      && cents(remaining.model) === cents(envelope.model) - cents(run.model) - cents(probe.model)
      && cents(remaining.infrastructure) === cents(envelope.infrastructure) - cents(run.infrastructure) - cents(probe.infrastructure),
    'budget: separate model/infrastructure envelope mismatch');
    require(same(budget.currentPreparedPolicyCents, { model: 1800, infrastructure: 700 })
      && same(budget.proposalRetainedAllocationBasisCents, { model: 1800, infrastructure: 670 })
      && same(budget.proposedCumulativePolicyCents, { model: 16_800, infrastructure: 5670 })
      && cents(budget.modelRunSoftwareCeilingUsd) === 18_000, 'budget: historical allocations and cumulative draft must be preserved');

    const protocol = packet.protocol;
    require(protocol.status === 'candidate-not-approved' && protocol.comparisonMode === 'unpaired-scale-pilot'
      && protocol.targetBaseSha === source.targetBaseSha && protocol.workloadDefinitionSha256 === source.workloadDefinitionSha256
      && same(protocol.acceptancePolicy, source.acceptancePolicy)
      && protocol.proposedObservationWindowSeconds === 86_400 && protocol.observationWindowApproved === false,
    'protocol: candidate source/acceptance/window mismatch');
    require(protocol.efficiencyWinProven === false && protocol.scaleRequirementProven === false
      && protocol.sameFileCollisionRepairProven === false && protocol.afkConfiguration === null
      && protocol.afkRun === null && protocol.organizerApproval === null
      && protocol.actualEligibleCostUsd === null && protocol.mergedGreenPrsPerHour === null
      && protocol.mergedGreenPrsPerDollar === null, 'protocol: unmeasured scale, AFK or cost claims forbidden');
    require(Array.isArray(packet.gates) && packet.gates.length === 11
      && new Set(packet.gates.map((gate) => gate.id)).size === 11
      && packet.gates.every((gate) => ['pending', 'pending-refresh'].includes(gate.status) && gate.evidence === null),
    'gates: live gates must remain pending without invented evidence');
    result.valid = result.errors.length === 0;
    return result;
  } catch {
    fail('packet: missing, unsafe or malformed input');
    return result;
  }
}

function main() {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  let root = ROOT;
  let controllerRoot;
  let argumentError = false;
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--json') continue;
    if (['--root', '--controller'].includes(args[index]) && args[index + 1] && !args[index + 1].startsWith('--')) {
      const option = args[index];
      const value = resolve(args[++index]);
      if (option === '--root') root = value;
      else controllerRoot = value;
    } else argumentError = true;
  }
  const result = argumentError ? { valid: false, errors: ['Only --json, --root PATH and --controller PATH are accepted.'] }
    : validateDeployment100(root, controllerRoot ? { controllerRoot } : {});
  console.log(json ? JSON.stringify(result, null, 2)
    : result.valid ? `Valid preparation packet: ${result.checked_bindings} bindings, ${result.task_count} tasks; execution stays disabled.`
      : `Invalid preparation packet:\n${result.errors.join('\n')}`);
  process.exitCode = result.valid ? 0 : 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
