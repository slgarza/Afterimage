# Read-only GitHub CI metadata method

This analysis method records a bounded observation of GitHub Actions metadata for accepted pilot task heads and their verified merge commits. Historical B003 corrective commits carry zero additional feature credit. It does not review application behavior, grant a delivery verdict, measure model performance, establish billing, or accept the 24-hour quality window.

Run the offline synthetic fixtures from this directory:

```sh
python3 test-ci-metadata.py
```

The fixtures use temporary local files and injected API payloads. They make no GitHub, model or cloud calls. Python 3.11 or newer and the standard library suffice. The source and fixtures were also checked with the controller repository's Ruff configuration and Python compilation.

A coordinator with an already authorized read scope may use the collector against their own private run inputs:

```sh
python3 collect-ci-metadata.py --run YOUR_PRIVATE_RUN_DIRECTORY --repository slgarza/Afterimage --phase current
# Only after the integration queue is stopped and all 100 outcomes are terminal:
python3 collect-ci-metadata.py --run YOUR_PRIVATE_RUN_DIRECTORY --repository slgarza/Afterimage --phase final
```

These are separate explicit invocations, never a sampler. A private persistent counter reserves each GET attempt before requesting, including failed requests, with a combined limit of 200 across both phases. Each phase has a single invocation marker. A final invocation requires a stopped, nonpaused queue with exactly B001 through B100, terminal outcomes and matching stop-event counts. The collector uses its own lock, writes only its analysis outputs, and never writes the integration state, journal or workload release. Current inputs may advance during GETs; input hashes, time bounds and change flags are recorded, with no atomic-snapshot claim or automatic retries.

At most 128 unique commit SHAs are selected. Each new source read uses one check-runs request capped at 100 entries. Workflow listing is capped at three pages of 100 entries per phase, and unstable pagination or missing entries remain unknown. Only GitHub Actions check runs and validated metadata fields/URLs for the requested repository enter the public allowlist. Completed cached observations describe historical check IDs; they do not establish the latest 24-hour state or the absence of future reruns. A final cache hit additionally requires the original retained body to match its SHA-256 and reproduce the exact curated check projection.

The final-source method computes a SHA-256 over original `gh api` stdout bytes, retains them privately before JSON parsing, and exports only the body and endpoint hashes. Response headers and stderr are not retained. The private inputs can include metadata outside the public allowlist and must never be published. This package excludes private response bodies, caches, counters, phase markers, original run inputs and runtime state.

The first current snapshot had already started with the earlier in-memory parser when the additional raw-body retention requirement arrived. Its original API bodies and body hashes were not retained. No current requests were repeated. The separately published current-snapshot limitation records that gap; `method-history.json` preserves the exact historical source bytes as a JSON string and its SHA-256. Final-source reads replace unbound historical cache entries within the same original global GET limit.

Public metadata includes reported check start/completion intervals and workflow source timestamps. Workflow `updated_at` is not relabeled as completion. Runner scheduling delay, runner CPU duration and isolated GitHub API queue time remain null. Coordinator head-CI wait means publication through observed green, including execution, scheduling, API/transport and polling; it is not a measurement of one queue alone.

This package can rerun the offline method fixtures without the private run. Reproducing a historical observation byte for byte requires the retained private original bodies and run input snapshots; the published allowlist and source hashes alone do not provide those private inputs. GitHub metadata may subsequently change.
