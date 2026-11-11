"""Offline observation-window closure, never a completed-workload finalization.

Reads reviewed allowlists and private evidence; no provider, GitHub, ledger,
queue, dashboard or original artifact writes. Refuses an unelapsed cutoff.
"""

import argparse
import hashlib
import json
import os
import re
from collections import Counter
from datetime import UTC, datetime, timedelta
from pathlib import Path


def require(condition, message):
    if not condition:
        raise ValueError(message)


def aware(value):
    result = datetime.fromisoformat(value)
    require(result.utcoffset() is not None, "aware timestamp required")
    return result


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def encoded(value):
    return (json.dumps(value, indent=2, allow_nan=False) + "\n").encode()


def write_once(path, raw):
    with os.fdopen(
        os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600), "wb"
    ) as stream:
        stream.write(raw)


def active_process_count(script):
    count = 0
    for item in Path("/proc").iterdir():
        if not item.name.isdigit():
            continue
        try:
            arguments = (item / "cmdline").read_bytes().split(b"\0")
        except (FileNotFoundError, ProcessLookupError, PermissionError):
            continue
        count += os.fsencode(str(script)) in arguments
    return count


def classification(row, queued, nonempty, events):
    if row["provisional_qualified"]:
        return (
            "provisional_product"
            if row["workload_counts_as_feature_only_not_delivery"]
            else "provisional_support"
        )
    if not nonempty:
        return "original_empty_patch"
    if not queued:
        return "nonempty_not_attempted_in_recovery"
    status = queued.get("status")
    if status in {"waiting_head_ci", "head_ci_failed_or_cutoff"}:
        waits = [
            event
            for event in events
            if event.get("kind") == "head_ci_wait_finished"
            and event.get("task_id") == row["task_id"]
        ]
        return (
            "published_head_ci_failed"
            if waits and waits[-1].get("status") == "failed"
            else "published_head_ci_unresolved"
        )
    if status in {"merged_pending_combined_ci", "merged_combined_ci_failed"}:
        return "merged_combined_ci_unresolved_or_failed"
    if status == "merged_green_provisional":
        return "recorded_green_but_not_qualified_for_frozen_window"
    return "recovery_outcome_unresolved"


def observed_clock(release, captured):
    start, cutoff = aware(release["t0_utc"]), aware(release["delivery_cutoff_utc"])
    require(start < cutoff <= captured, "actual frozen cutoff has not elapsed")
    require(
        (cutoff - start).total_seconds() == 21600,
        "unexpected frozen observation window",
    )
    return {
        "T0_utc": start.isoformat(),
        "T1_utc": None,
        "full_delivery_finished": False,
        "frozen_delivery_window_cutoff_utc": cutoff.isoformat(),
        "observation_closed_at_utc": captured.isoformat(),
        "observation_window_seconds": (cutoff - start).total_seconds(),
        "window_endpoint_kind": "frozen_administrative_cutoff_not_OS_process_stop_or_completed_workload_T1",
        "original_clock_not_reset": True,
    }


def validate_observer_record(record, captured):
    require(
        type(record.get("attempt")) is int and 1 <= record["attempt"] <= 100,
        "invalid observer attempt",
    )
    require(
        type(record.get("return_code")) is int and -255 <= record["return_code"] <= 255,
        "invalid observer return code",
    )
    require(
        record.get("status")
        in {
            "missing_required_checks",
            "pending",
            "failed_or_cancelled",
            "all_exact_head_checks_green",
            "wrong_head",
            "incomplete_or_invalid",
            "http_or_cli_error",
            "invalid_json_or_schema",
        },
        "unreviewed observer status",
    )
    count = record.get("github_actions_check_count")
    require(
        count is None or type(count) is int and 0 <= count <= 100,
        "invalid observer check count",
    )
    require(
        aware(record["finished_at_utc"]) <= captured,
        "observer receipt is in the future",
    )


def checked_original_bytes(batch, row):
    result = {}
    for name, key in [
        ("changes.patch", "original_patch_sha256"),
        ("report.json", "original_report_sha256"),
        ("manifest.json", "original_manifest_sha256"),
    ]:
        path = batch / row["task_id"] / name
        require(path.is_file() and not path.is_symlink(), "unsafe original artifact")
        raw = path.read_bytes()
        require(sha(raw) == row[key], "original artifact changed since source snapshot")
        result[name] = raw
    return result


def capture(run, batch, delivery_path, activity_path):
    captured = datetime.now(UTC)
    paths = {
        "queue_state": run / "recovery-queue-state.json",
        "queue_journal": run / "recovery-journal.jsonl",
        "workload_release": run / "workload-release.json",
    }
    raw = {name: path.read_bytes() for name, path in paths.items()}
    release, state = json.loads(raw["workload_release"]), json.loads(raw["queue_state"])
    clock = observed_clock(release, captured)
    require(raw["queue_journal"].endswith(b"\n"), "partial journal")
    events = [json.loads(line) for line in raw["queue_journal"].splitlines()]
    delivery_raw, activity_raw = delivery_path.read_bytes(), activity_path.read_bytes()
    delivery, activity = json.loads(delivery_raw), json.loads(activity_raw)
    require(
        delivery["clock"]["T1_utc"] is None
        and delivery["clock"]["full_delivery_finished"] is False,
        "normal closed delivery is not a censored input",
    )
    require(
        delivery["clock"]["T0_utc"] == clock["T0_utc"]
        and aware(delivery["clock"]["delivery_cutoff_utc"])
        == aware(clock["frozen_delivery_window_cutoff_utc"]),
        "source window changed",
    )
    expected = delivery["source_evidence"]
    require(
        expected["queue_state_sha256"] == sha(raw["queue_state"])
        and expected["queue_journal_sha256"] == sha(raw["queue_journal"])
        and expected["workload_release_sha256"] == sha(raw["workload_release"]),
        "source snapshot changed",
    )
    require(
        delivery["original_worker_outcomes"]["status_counts"] == {"needs_repair": 100}
        and delivery["original_worker_outcomes"]["validated_workers"] == 0,
        "original worker outcomes differ",
    )
    require(
        not active_process_count(run / "recover-reviewed-queue.py")
        and not active_process_count(run / "watch-b096-delegated-get.py"),
        "queue or metadata observer is still active",
    )
    require(
        (run / "integration-control.stop").is_file(),
        "operator hold must remain in place",
    )
    # A genuine complete queue belongs to the stricter normal-finalization lane.
    complete = (
        len(state.get("tasks", {})) == 100
        and state.get("paused") is False
        and all(
            value.get("status")
            in {
                "merged_green_provisional",
                "original_empty_patch",
                "original_check_failed_requires_code_repair",
                "independent_review_rejected",
                "review_binding_failed",
                "plan_failed",
                "prepare_failed",
                "publish_failed",
                "head_ci_failed_or_cutoff",
            }
            for value in state["tasks"].values()
        )
        and all(
            value.get("status") == "passed"
            for value in state.get("post_merge_checks", {}).values()
        )
        and events[-1].get("kind") == "integration_queue_stopped"
        and events[-1].get("paused") is False
    )
    require(not complete, "use normal finalization for a genuinely complete queue")
    rows, plot_events, original_artifacts = [], [], {}
    for row in delivery["rows"]:
        task = row["task_id"]
        require(re.fullmatch(r"B(?:00[1-9]|0[1-9][0-9]|100)", task), "invalid task")
        queued = state.get("tasks", {}).get(task)
        originals = checked_original_bytes(batch, row)
        original_artifacts[task] = originals
        nonempty = bool(originals["changes.patch"])
        outcome = classification(row, queued, nonempty, events)
        item = {
            "task_id": task,
            "workload_classification": "product"
            if row["workload_counts_as_feature_only_not_delivery"]
            else "support",
            "original_worker_status": "needs_repair",
            "original_patch_nonempty": nonempty,
            "observed_recovery_classification": outcome,
            "raw_queue_status": queued.get("status") if queued else "not_recorded",
            "source_code_failure_inferred": False,
            "qualified_for_frozen_window": row["provisional_qualified"],
            "original_report_sha256": row["original_report_sha256"],
            "original_patch_sha256": row["original_patch_sha256"],
            "final_quality_accepted": None,
        }
        if row["provisional_qualified"]:
            recovery = row["recovery"]
            item["attribution"] = recovery["attribution"]
            when = max(
                aware(recovery["merged_at_utc"]),
                aware(recovery["combined_green_observed_at_utc"]),
            )
            require(
                aware(clock["T0_utc"])
                <= when
                <= aware(clock["frozen_delivery_window_cutoff_utc"]),
                "qualification is outside window",
            )
            plot_events.append(
                {
                    "task_id": task,
                    "category": "support"
                    if item["workload_classification"] == "support"
                    else "repaired"
                    if recovery["attribution"] == "coordinator_code_or_test_repair"
                    else "unchanged",
                    "qualified_at_utc": when.isoformat(),
                }
            )
        rows.append(item)
    require(
        {row["task_id"] for row in rows} == {f"B{i:03}" for i in range(1, 101)}
        and len(rows) == 100,
        "incomplete cohort projection",
    )
    counts = Counter(row["observed_recovery_classification"] for row in rows)
    features = counts["provisional_product"]
    support = counts["provisional_support"]
    require(
        features == delivery["provisional"]["product_module_units"]
        and support == delivery["provisional"]["support_units"],
        "qualified counts differ",
    )
    receipts = []
    observer = run / "b096-delegated-get-observer"
    for path in sorted(observer.glob("attempt-*.receipt.json")):
        record = json.loads(path.read_bytes())
        validate_observer_record(record, captured)
        receipts.append(
            {
                "attempt": record["attempt"],
                "finished_at_utc": record["finished_at_utc"],
                "return_code": record["return_code"],
                "status": record["status"],
                "github_actions_check_count": record["github_actions_check_count"],
                "source_receipt_sha256": sha(path.read_bytes()),
            }
        )
    latest = receipts[-1] if receipts else None
    require(
        len({record["attempt"] for record in receipts}) == len(receipts),
        "duplicate observer receipt",
    )
    latest_valid = next(
        (
            record
            for record in reversed(receipts)
            if record["return_code"] == 0
            and record["status"]
            in {
                "missing_required_checks",
                "pending",
                "failed_or_cancelled",
                "all_exact_head_checks_green",
            }
        ),
        None,
    )
    stops = [
        event for event in events if event.get("kind") == "integration_queue_stopped"
    ]
    require(
        stops and all(aware(event["at_utc"]) <= captured for event in stops),
        "actual queue stop missing or future",
    )
    result = {
        "schema_version": 1,
        "kind": "CENSORED_frozen_window_observation_close_not_completed_workload",
        "captured_at_utc": captured.isoformat(),
        "clock": clock,
        "actual_last_queue_process_stop_at_utc": stops[-1]["at_utc"],
        "recorded_queue_stop_event_count": len(stops),
        "runtime_queue_row_count": len(state.get("tasks", {})),
        "runtime_state_not_backfilled": True,
        "original_worker_outcomes": {
            "needs_repair": 100,
            "validated": 0,
            "originals_unchanged": True,
        },
        "observed_recovery_counts": dict(counts),
        "provisional_product_units": features,
        "provisional_support_units": support,
        "provisional_task_units": features + support,
        "product_attribution_counts": dict(
            Counter(
                row["attribution"]
                for row in rows
                if row["observed_recovery_classification"] == "provisional_product"
            )
        ),
        "CENSORED_provisional_product_units_per_frozen_observation_hour": features
        / (clock["observation_window_seconds"] / 3600),
        "CENSORED_provisional_task_units_per_frozen_observation_hour": (
            features + support
        )
        / (clock["observation_window_seconds"] / 3600),
        "completed_workload_or_accepted_throughput_claimed": False,
        "final_metrics": delivery["final_metrics"],
        "recovery_cost_scope": delivery["recovery_cost_scope"],
        "bounded_check_observer": {
            "scope": "Separate root-authorized100-attempt exact-head GET observer, not the200-GET CI snapshot budget.",
            "reserved_GET_attempts": len(
                list(observer.glob("attempt-*-reserved.json"))
            ),
            "completed_response_receipts": len(receipts),
            "maximum_reserved_attempts": 100,
            "latest_response": latest,
            "latest_valid_check_response": latest_valid,
            "check_status_at_exact_cutoff_verified": False,
            "actual_upstream_send_count": None,
            "samples": receipts,
            "raw_response_bytes_and_raw_response_hashes_not_exported": True,
        },
        "source_evidence": {
            **{name + "_sha256": sha(value) for name, value in raw.items()},
            "delivery_allowlist_sha256": sha(delivery_raw),
            "activity_allowlist_sha256": sha(activity_raw),
            "closure_analysis_source_sha256": sha(Path(__file__).read_bytes()),
            "sources_stable_during_projection": True,
        },
        "rows": rows,
        "plot_events": sorted(
            plot_events, key=lambda value: (value["qualified_at_utc"], value["task_id"])
        ),
        "limits": [
            "The original queue stopped at its recorded timestamp; the six-hour cutoff is an administrative observation endpoint, not a fabricated OS stop or completed-workload T1.",
            "The observed pending/empty-check response has its own timestamp; it does not prove platform outage, source-code failure or exact-cutoff CI state.",
            "Product, support, unresolved CI, unattempted recovery and empty original patches remain separate; all100 original worker failures are retained.",
            "Recovery is assisted. New paid workers=0 does not establish zero local/Codex/CI cost. Actual billed/eligible dollars, accepted24h outcomes and matched AFK comparison remain unknown.",
            "Reported worker process spans and sampled VMs do not prove continuous useful100-agent work, CPU utilization or inference concurrency.",
        ],
    }
    require(
        result["bounded_check_observer"]["reserved_GET_attempts"] <= 100,
        "observer attempt cap exceeded",
    )
    require(
        all(paths[name].read_bytes() == value for name, value in raw.items()),
        "sources changed during censored projection",
    )
    require(
        all(
            (batch / task / name).read_bytes() == value
            for task, artifacts in original_artifacts.items()
            for name, value in artifacts.items()
        ),
        "original artifact changed during projection",
    )
    require(
        not re.search(
            r"/home/|/Users/|/tmp/|sk-[A-Za-z0-9_-]{16,}|github_pat_|gh[pousr]_[A-Za-z0-9]{30,}",
            encoded(result).decode(),
        ),
        "unsafe public projection",
    )
    return result, activity


def plot(result, activity, out):
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    require(matplotlib.__version__ == "3.10.7", "use the pinned plotting environment")
    t0 = aware(result["clock"]["T0_utc"])
    end = aware(result["clock"]["frozen_delivery_window_cutoff_utc"])
    events = [
        {
            **event,
            "minute": (aware(event["qualified_at_utc"]) - t0).total_seconds() / 60,
        }
        for event in result["plot_events"]
    ]
    maximum = (end - t0).total_seconds() / 60
    spans = [row["process_span"] for row in activity["rows"] if row.get("process_span")]
    require(len(spans) == 100, "100 reported process spans required")
    coding_deadline = (
        max(aware(span["started_at_utc"]) for span in spans)
        + timedelta(seconds=1800)
        - t0
    ).total_seconds() / 60
    inputs = {
        "kind": "censored_observation_plot_inputs",
        "source_censored_allowlist_sha256": sha(encoded(result)),
        "T0_utc": t0.isoformat(),
        "administrative_window_end_utc": end.isoformat(),
        "actual_capture_utc": result["captured_at_utc"],
        "completed_workload_T1_utc": None,
        "actual_queue_stop_utc": result["actual_last_queue_process_stop_at_utc"],
        "product_units": result["provisional_product_units"],
        "support_units": result["provisional_support_units"],
        "events": events,
        "all100_original_workers_failed": True,
        "accepted24h_or_AFK_or_actual_invoice_claimed": False,
        "configured_coding_deadline_minutes_from_latest_reported_start": coding_deadline,
    }
    write_once(out / "censored-plot-inputs-public-allowlist.json", encoded(inputs))
    matplotlib.rcParams.update(
        {"font.family": "DejaVu Sans", "svg.hashsalt": sha(encoded(inputs))[:16]}
    )
    fig, ax = plt.subplots(figsize=(14, 8))
    fig.subplots_adjust(top=0.77, bottom=0.28, left=0.08, right=0.97)
    fig.suptitle(
        "CENSORED: Afterimage pilot100 — delivery incomplete",
        x=0.08,
        ha="left",
        y=0.97,
        fontsize=18,
    )
    fig.text(
        0.08,
        0.91,
        f"{result['provisional_product_units']} provisional product modules + {result['provisional_support_units']} support units | frozen 6 h observation window",
        fontsize=12,
    )
    fig.text(
        0.08,
        0.865,
        "Original workers: 100 needs_repair / 0 validated. Recovery is assisted; quality acceptance remains unknown.",
        fontsize=11,
    )
    points = sorted({0.0, maximum, *[event["minute"] for event in events]})
    for category, label, color, style in [
        ("product", "Product modules", "#222222", "-"),
        ("unchanged", "Unchanged product recoveries", "#2166ac", "-"),
        ("repaired", "Coordinator product repairs", "#d95f02", "--"),
        ("support", "Support units", "#777777", ":"),
    ]:
        selected = [
            event
            for event in events
            if (
                event["category"] != "support"
                if category == "product"
                else event["category"] == category
            )
        ]
        ax.step(
            points,
            [sum(event["minute"] <= at for event in selected) for at in points],
            where="post",
            label=f"{label} ({len(selected)})",
            color=color,
            linestyle=style,
            linewidth=2,
        )
    stopped = (
        aware(result["actual_last_queue_process_stop_at_utc"]) - t0
    ).total_seconds() / 60
    ax.axvline(
        stopped,
        color="#8b2d2d",
        linestyle="--",
        alpha=0.6,
        label="Actual recorded queue stop",
    )
    ax.axvline(
        coding_deadline,
        color="#888888",
        linestyle=":",
        alpha=0.7,
        label="Configured coding deadline",
    )
    ax.set(
        xlim=(0, maximum),
        ylim=(-0.5, result["provisional_product_units"] + 3),
        xlabel="Minutes since the original T0",
        ylabel="Currently qualifying distinct task units",
    )
    ax.legend(loc="upper left", frameon=False, ncol=2)
    ax.grid(alpha=0.18)
    fig.text(
        0.08,
        0.18,
        f"Administrative cutoff: {end.strftime('%H:%M:%S UTC')} | actual queue stop: {aware(result['actual_last_queue_process_stop_at_utc']).strftime('%H:%M:%S UTC')} | captured: {aware(result['captured_at_utc']).strftime('%H:%M:%S UTC')}",
        fontsize=10,
    )
    fig.text(
        0.08,
        0.13,
        "Each currently qualifying task appears once at its latest valid qualification. B003's corrected green is one task; prior invalidated states remain in the report.",
        fontsize=9,
    )
    fig.text(
        0.08,
        0.08,
        "There is no completed-workload T1, accepted24h score, AFK baseline or invoice. Observed spans/VMs do not establish CPU, inference or100useful-agent concurrency.",
        fontsize=9,
    )
    metadata = {
        "censored_allowlist_sha256": sha(encoded(result)),
        "plot_inputs_sha256": sha(encoded(inputs)),
        "window_endpoint_kind": "administrative_cutoff",
        "T1_utc": None,
        "matplotlib_version": matplotlib.__version__,
    }
    stem = "pilot100-censored-" + end.strftime("%Y%m%dT%H%M%SZ")
    png, svg = out / (stem + ".png"), out / (stem + ".svg")
    fig.savefig(
        png, dpi=150, metadata={"Description": json.dumps(metadata, sort_keys=True)}
    )
    fig.savefig(
        svg,
        metadata={"Date": None, "Description": json.dumps(metadata, sort_keys=True)},
    )
    plt.close(fig)
    for path in [png, svg]:
        path.chmod(0o600)
    return {
        "kind": "standalone_censored_observation_figure",
        "metadata": metadata,
        "files": {
            path.name: sha(path.read_bytes())
            for path in [png, svg, out / "censored-plot-inputs-public-allowlist.json"]
        },
        "final_accepted_or_completed_delivery_claimed": False,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ["run", "batch", "delivery", "activity", "output-dir"]:
        parser.add_argument("--" + name, type=Path, required=True)
    args = parser.parse_args()
    result, activity = capture(args.run, args.batch, args.delivery, args.activity)
    args.output_dir.mkdir(mode=0o700, parents=True, exist_ok=False)
    target = args.output_dir / "censored-observation-close-public-allowlist.json"
    write_once(target, encoded(result))
    receipt = plot(result, activity, args.output_dir)
    write_once(args.output_dir / "censored-plot-public-receipt.json", encoded(receipt))
    print(
        json.dumps(
            {
                "sidecar_name": target.name,
                "sidecar_sha256": sha(target.read_bytes()),
                "counts": result["observed_recovery_counts"],
                "T1_utc": None,
                "actual_queue_stop_at_utc": result[
                    "actual_last_queue_process_stop_at_utc"
                ],
                "actual_capture_utc": result["captured_at_utc"],
                "figure_files": receipt["files"],
            }
        )
    )


if __name__ == "__main__":
    main()
