# Last CI metadata observation: completed or censored

This method extends the earlier retained-source reader before its first last-observation invocation. It preserves the original completed-workload gate and adds a separately authorized censored alternative at the actual frozen delivery cutoff. The previous prepared source is archived unchanged; its initial current snapshot and body-retention limitation remain historical facts.

Exactly one current observation and at most one later observation are permitted. The later observation can be a genuine terminal-cohort `final`, or a `censored` last observation after the frozen cutoff when integration is incomplete. A shared durable marker makes the two later alternatives mutually exclusive, blocks later sampling, and honors any older final marker. Failed or interrupted invocations are not automatically retried.

A normal final still requires a real nonpaused queue stop, all100 explicit terminal outcomes and matching stop-event counts; the coordinator separately verifies complete post-merge checks and stable sources. Censored requires the actual cutoff to have been reached and reports only real merged/tree-verified/postgreen tasks plus historical zero-credit B003 evidence. It never manufactures100 queue states or a process stop at the cutoff.

Every observation explicitly disclaims completed-workload clock authority. A censored result is labeled `supporting_censored_last_observation`, with completed-workload T1null, no full-delivery completion claim and no quality-window acceptance. The separate authoritative delivery-clock collector remains responsible for any genuine completed-workload clock. Source hashes/time bounds/change flags remain visible; no atomic-snapshot claim is made.

The same persistent200GET-attempt cap covers both original and later reader versions;61 attempts were already used by the initial current observation, leaving139. No counter is reset. The separate explicitly authorized5GET B096 incident investigation is recorded separately. At most128 selected commit reads plus three workflow pages fit the remaining reader allowance. All failures consume reserved attempts.

The later reader retains exact local input streams and original GitHub stdout bodies privately before JSON derivation. Public metadata exports only the field allowlist and source/body hashes. Retained complete-check caches are reusable only when their original body hash and parsed projection match. Raw bodies, cache/counter/marker files and runtime state must never be published.

Run only the offline method fixtures here:

```sh
python3 -B test-ci-metadata.py
```

The25 tests use synthetic payloads and temporary local state and make no actual GitHub, model or cloud calls. Censored gating tests cover missing/future cutoff, partial-cohort labeling/source retention, normal-final/censored mutual exclusion and preservation of the shared budget. No real observation or remote-execution example is included in this package. Root authorized one conditional later observation; this document grants no new read/spend authority.

The head-CI wait aggregate counts recorded event observations, including pending/failed outcomes and later reconciliation totals. It reports outcome counts, distinct tasks separately, a raw-event duration median and overlap markers. Durations are explicitly non-additive, with no summed duration, and the median is neither an all-green nor a distinct-task median. Runner/API queue time remains unknown.
