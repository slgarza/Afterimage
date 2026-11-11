# Same-tree CI retry reference methods

This held analysis package explains the B096 CI retry and stopped-queue reconciliation. It contains source-text templates for three frozen private operators and their 14 offline guard tests. Templates are stored as JSON strings so an ordinary source/test discovery command cannot accidentally execute a remote mutation.

The observed workflow had separate outcomes:

1. Both original workflow/check/job records remained in progress with null conclusions after all 17 reported steps, including post steps and Complete job, reported success. Step success was not accepted as exact-head CI success.
2. Ordinary cancellation, ordinary rerun and force-cancellation requests did not resolve those records. Their actual results and delays belong in the separate incident evidence, without a claim about the service's root cause.
3. The first operator made one successful exact-old-head lease push of a message-only replacement commit. Whole tested tree, single tested-base parent and admitted patch bytes remained identical. Its immediate postpush PR query returned old metadata, so that operator failed before updating canonical head metadata. It was not rerun.
4. The second operator made GET-only confirmations and saved a same-tree attestation before reconciling canonical head metadata. Its local attestation records a zero push-retry count and preserves the earlier failed confirmation.
5. The third operator remains a separately gated plan/merge reconciliation method. It requires actual successful checks at the current exact head, preserves the old wait and full delivery clock, performs the existing guarded merge once, verifies the actual merge identity/tree, restores the stop marker, and leaves combined-main CI pending. This package does not claim that a plan, merge or final CI acceptance occurred.

The final first-operator source includes two initial Ruff findings corrected before execution. The earlier lint/tool trace is known from the coordinator transcript; its raw bytes were not retained here, and no raw trace hash is invented. Two source-review findings, shared integration locking and a durable attempted/uncertain push record, were also corrected before execution.

`operators.bundle.json` supplies each original source SHA-256, exported source SHA-256, parameterized AST hash and counts of explicit parameter substitutions. Curation replaced run-directory expressions and concrete runtime identifiers with an explicit `PARAMETERS` dictionary: repository, task/PR, old/new heads, retry archive token, stopped PID, commit message and approved auxiliary-source pins. It also reconstructs repository endpoints/attempt paths from those parameters. Private verification reversed exactly those substitutions and recovered the complete original AST. Formatting/comments differ because the reference text was generated with Python AST unparsing; algorithms and guards were not edited.

The original queue and phase source pins recorded in `provenance.json` identify the actual private runtime bytes. They are not hashes of the parameterized/style-normalized public operator snapshots. These templates cannot simply be run against the transformed public inputs. Explicit expected-pin parameters do not authorize changing the actual runtime pins, accepting an unreviewed helper, or bypassing review. Reproducing the actual operation requires the original approved private inputs and appropriate coordinator authorization.

Run only the offline package validation:

```sh
python3 -B verify-export.py
```

It verifies source hashes/ASTs, parses and compiles four templates, and materializes them with synthetic parameters in a temporary directory to run the 14 guard tests. It never invokes any operator entrypoint, real GitHub query, branch push, merge, model call or cloud operation. No remote-execution example is supplied. The package is a historical analysis reference, not a general unattended recovery command. Failed or uncertain remote operations require a separate explicit reconciliation; automatic retries remain disabled.

No actual runtime identifiers/paths, raw responses/logs, credentials, account state or operator outcome payloads are embedded in template source. Original response bodies, current integration/queue data and incident receipts remain private or in separately reviewed public evidence allowlists. The optional timing fields describe measured validation only; unmeasured curation time remains unknown.
