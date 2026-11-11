# Independent acceptance methods for the 100-agent pilot

The JSON bundle contains the final 50 B051–B100 contract-derived fixture scripts,
a portable version of the corrected review harness, two superseded fixture
versions, curated execution summaries and synthetic harness smoke examples.
JavaScript remains text inside JSON so repository lint does not mistake fixture
globals for application modules. SHA-256 values cover the exact UTF-8 source
strings, including their newlines. `manifest.json` binds the complete bundle.

Initial fixture preparation happened during worker execution after dispatch at
2026-11-11 16:17:25 UTC. The first observed fixture file modification time is
16:27:41 UTC; modification time is not proof of creation. A preparation segment
was measured from 16:29:40 to 16:32:23 UTC (163.330613 seconds, counted once).
Earlier contract reading and the first 20 fixtures have no complete recorded
monotonic duration. The preparation receipt records that this reviewer had read
zero candidate implementations. These timings describe preparation before this
reviewer's patch inspection, rather than preparation before the run. They do not
establish worker access controls.

The final bundle preserves changes made after outputs were inspected:

- At 16:58–16:59 UTC, a candidate-private `same` function was found to collide
  with the fixture assertion helper in the original shared VM scope. The
  corrected harness evaluates the candidate in a private CommonJS function
  closure. B053/B054/B057 approvals were explicitly revoked and revalidated;
  B061's instrumentation failure was also retested. Historical hashes and
  superseded/failing executions remain separate from the canonical total.
- B072 changed at 17:04 UTC, before its first fixture execution. Its positive
  name input now unambiguously satisfies the trimmed-name contract; a boundary
  check permits rejection or normalization of surrounding whitespace. The
  frozen wording did not require normalization.
- B088 changed at 17:09 UTC after a fixture failure. Its original fixture
  incorrectly demanded a successful `mayAdvance:false` result for a nonhost.
  The contract also permits a fixed forbidden error. Both versions are included.
- B074's source-only approval was separately revoked because private fixture
  success did not deliver the regression tests required by the backlog task.
  The coordinator later authored a distinct test file and obtained a new review.
  The independent B074 fixture itself did not change.

The other 48 final fixture hashes match the recorded initial preparation hashes.
The 38 final original-source fixture executions passed 1,706 assertions. That
count already includes corrected retests, rather than adding each retest as a
new task. Earlier superseded v1 successes and instrumentation failures are
listed separately. B060 also received a separate nine-assertion rerun after a
coordinator type-only repair; emitted runtime JavaScript was byte-identical.

Twelve fixtures were not executed against original source because those workers
returned empty patches: B051, B052, B058, B064, B066, B081, B082, B083, B091,
B093, B094 and B095. All 50 scripts were syntax checked; syntax parsing is not
execution or acceptance. Export validation runs only synthetic smoke modules,
without rerunning the 1,706 assertions.

Fixture success is one review input. Strict TypeScript checks, lint, owned
regression tests, full project validation, exact-head CI, verified merge trees
and the post-merge quality window are separate gates. These methods establish
neither an autonomous worker success nor a connected application feature. This
bundle contains no AFK baseline comparison or claim of economic superiority.

To extract the current harness and fixtures, run this command from the target
repository root after its locked dependencies are installed. Use a fresh output
directory; extraction refuses to overwrite files.

```bash
node - docs/swarm/methods/pilot100/independent-acceptance/independent-acceptance.bundle.json .swarm/independent-acceptance <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const [bundlePath, output] = process.argv.slice(2);
const bundle = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));
if (bundle.schema_version !== 1) throw Error('Unexpected bundle schema');
const seen = new Set();
for (const entry of [bundle.harness, ...bundle.fixtures]) {
  if (!/^(harness\/verify-pure-leaf\.cjs|fixtures\/B[0-9]{3}\.js)$/.test(entry.relative_path)) throw Error('Unsafe path');
  if (seen.has(entry.relative_path)) throw Error('Duplicate path');
  seen.add(entry.relative_path);
  const hash = crypto.createHash('sha256').update(entry.source, 'utf8').digest('hex');
  if (hash !== entry.sha256) throw Error('Source integrity mismatch');
  const destination = path.join(output, entry.relative_path);
  fs.mkdirSync(path.dirname(destination), {recursive:true});
  fs.writeFileSync(destination, entry.source, {flag:'wx'});
}
NODE
```

For an available B055 implementation, the invocation is:

```bash
node .swarm/independent-acceptance/harness/verify-pure-leaf.cjs packages/engine/src/parallel100/crew-vote-ledger.ts .swarm/independent-acceptance/fixtures/B055.js . 5000
```

The arguments are source file, fixture file, target repository root and optional
VM timeout in milliseconds (default 5000; allowed 10–10000). The portable harness
resolves TypeScript from the target's `package.json` and loads the existing
engine module solely for the permitted `../index.js` import. The pilot used
Node v24.6.0 and TypeScript 5.9.3. The export replaces two private host-specific
paths with this explicit target parameter; it therefore has its own source hash,
distinct from the exact private v2 runtime hash retained in the bundle.

Candidate helpers stay inside the candidate closure. Fixture `check`, `same`,
`good` and `bad` helpers run in the fixture's VM realm, with a separate context
for the trusted engine. The harness transpiles syntax and evaluates assertions;
it does not perform the project's strict semantic TypeScript check. Inspect
modules as pure code before running them. Node VM contexts and synchronous
timeouts are not an operating-system security sandbox, memory isolation or a
proof that hostile code is safe. Use an appropriately isolated process without
credentials or network authority for untrusted execution.

`independent-acceptance.schema.json` describes the bundle format.
`export-validation.json` records schema/integrity/privacy checks and three
synthetic portable-harness smoke results. Synthetic labels, player IDs and
passcode sentinels inside fixtures are test data. Raw worker logs, credentials,
host paths, provider/account data and actual worker payloads are excluded.
