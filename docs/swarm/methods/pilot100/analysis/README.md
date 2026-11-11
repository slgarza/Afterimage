# Pilot 100 evidence analysis methods

These are the current target-specific analysis tools for the recorded Afterimage
pilot. They are separate from the worker/controller runtime at
`979026cbb0d405623c30cdbf4bcf0c9e937bcf01` and the recovery operators in
`../operators/`. Publishing these sources starts no worker, provider or GitHub
operation. The CI metadata collector has its own separate method package.

Every exported Python source is byte-identical to its captured private original.
`source-provenance.json` binds original/public SHA256 values and records zero
export changes. Operator paths were already CLI inputs. Generic redaction-prefix
literals and deliberately synthetic test paths are retained; no actual operator
home directory, raw input, customer source, credential/hash or account financial
record is bundled. Historical artifacts can reference earlier method hashes;
the original versioned inputs and source versions remain privately preserved.

| Source | What can be audited |
| --- | --- |
| `analyze-activity-overhead.py` | Parses JSON events without executing logged commands; distinct process/command envelopes, conservative completed-command intervals, nonexclusive read/write/check heuristics, input hashes and unknown model timing. |
| `collect-delivery-allowlist.py` | Binds frozen original tasks/reports/patches, independent reviews and current integration/CI/tree evidence; emits versioned provisional delivery snapshots and strict optional clock closure. |
| `operator_measurements` inside the collector | Validated duration-origin fallback, shared invocation segments counted once, canonical/historical review segments and non-additive coordinator authoring envelopes. It is an inline helper rather than a separate runtime module. |
| `plot-pilot-evidence.py` | Builds deterministic plot inputs and standalone PNG/SVG from public allowlists, with original worker failures, assisted/provisional categories and reported-process limitations. |

## Dependencies and offline tests

Use Python 3.12 and the recorded controller installed in a separate development
environment, including its existing Ruff dependency. Core analysis adds no new
Node or Python runtime dependency. Git is required for the frozen local `git show`
checks; these tools do not fetch a remote target. No credentials are required for
the synthetic suites. Run from this directory:

```sh
python test-activity-overhead.py
python test-delivery-allowlist.py
python test-delivery-finalize.py
python test-operator-measurements.py
ruff check --isolated .
python -m compileall -q .
```

Those suites contain 6, 10, 11 and 5 tests respectively. They use temporary
synthetic fixtures, not actual approvals or closed-run evidence. They neither
invoke GitHub/providers nor modify a real run.

Plotting alone optionally requires Matplotlib 3.10.7. The exact auxiliary
environment's eleven package pins are in `requirements-plot.lock.txt`; they are
not added to the live controller environment. With those optional dependencies:

```sh
python test-plot-inputs.py
python plot-pilot-evidence.py --delivery DELIVERY_ALLOWLIST.json   --activity ACTIVITY_ALLOWLIST.json --output-dir NEW_OUTPUT_DIRECTORY
```

The five plot tests prove closed T1 controls the axis and denominator even
when publication is later, B003 history contributes one task unit, original
failures remain visible, and late/future events are rejected. Figures record
input/source hashes and Matplotlib version. Repeated rendering was byte-identical
on the run host; that is not a universal cross-platform byte identity guarantee.

## Inputs, outputs and reproducibility limits

Authorized reviewers with the original private evidence layout can reproduce
activity and delivery derivations:

```sh
python analyze-activity-overhead.py --run RUN_DIRECTORY --batch BATCH_DIRECTORY   --target TARGET_CHECKOUT --output NEW_ACTIVITY_ALLOWLIST.json
python collect-delivery-allowlist.py --run RUN_DIRECTORY --batch BATCH_DIRECTORY   --target TARGET_CHECKOUT
```

The analyzer intentionally references this cohort's named final gateway/provider
receipts. Their originals include private runtime data and are not published.
Public aggregates cannot reconstruct missing original JSON. The sources and
synthetic tests expose the algorithm; full private-input reproduction remains
restricted to authorized evidence reviewers. Plot reproduction needs only the
published safe delivery/activity inputs, the method source and pinned optional
plot environment.

The collector writes a fresh versioned allowlist under `delivery-allowlists/`.
Its `latest-private.json` pointer contains a private source path and is never an
approved public artifact. Choose fresh analyzer/plot output locations and preserve
previous attempts. No tool resets original worker outcomes or accounting.

`--finalize` is an explicit offline mode that refuses an active, paused, unstable,
unfinished or unreconciled queue. It requires a genuine final stop event, all 100
terminal task outcomes, matching frozen release and completion flags, required
combined CI/tree/review bindings, and closure after recorded delivery work. It
uses the actual stop time, capped at the frozen cutoff, for T1. Only provisional
through-completed-clock rates are added; 24-hour acceptance, actual dollars and
AFK efficiency stay unknown. A root completion flag alone cannot close the clock.

The plotter uses closed T1 for its endpoint, denominator and clock title when
present; interim plots retain their as-of endpoint. Curves contain currently
qualifying distinct modules at their latest valid qualification time. B003's
invalidated initial PR is not another delivery; its corrected green is one point.
Supporting tasks are separate. Process spans contain gaps and are not CPU,
inference or continuous useful-agent measurements. The image states 100 original
`needs_repair` outcomes and zero validated workers; assisted recovery does not
rewrite that failure history or establish a contest win.

Snapshot revision 2 corrects the final figure receipt kind to identify a completed delivery clock while keeping acceptance provisional. Its synthetic CLI test renders PNG/SVG and checks that the receipt and inputs retain the closed T1 instead of publication time. Historical figure bytes and live workers/operators are unchanged.
