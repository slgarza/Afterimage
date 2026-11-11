"""Render standalone progress figures only from reviewed public allowlists."""

import argparse
import hashlib
import json
from datetime import datetime, timedelta
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.ticker import MaxNLocator


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def aware(value):
    result = datetime.fromisoformat(value)
    if result.utcoffset() is None:
        raise ValueError("aware source timestamp required")
    return result


def prepare_inputs(delivery, activity, coding_seconds):
    t0 = aware(delivery["clock"]["T0_utc"])
    asof = aware(delivery["as_of_utc"])
    t1 = delivery["clock"].get("T1_utc")
    endpoint = aware(t1) if t1 else asof
    if not t0 < endpoint <= asof or (
        t1 and delivery["clock"].get("full_delivery_finished") is not True
    ):
        raise ValueError("invalid completed or interim plot clock")
    events = []
    for row in delivery["rows"]:
        if not row["provisional_qualified"]:
            continue
        if not row["binding_checks"] or not all(row["binding_checks"].values()):
            raise ValueError("unbound provisional source row")
        recovered = row["recovery"]
        at = max(
            aware(recovered["merged_at_utc"]),
            aware(recovered["combined_green_observed_at_utc"]),
        )
        if not t0 <= at <= endpoint:
            raise ValueError("future or pre-release event rejected")
        category = (
            "support"
            if not row["workload_counts_as_feature_only_not_delivery"]
            else "repaired"
            if recovered["attribution"] == "coordinator_code_or_test_repair"
            else "unchanged"
        )
        events.append(
            {
                "task_id": row["task_id"],
                "category": category,
                "qualified_at_utc": at.isoformat(),
                "minutes_from_T0": (at - t0).total_seconds() / 60,
                "corrective_pr_does_not_add_second_task_unit": bool(
                    recovered["corrective_pr_for_existing_module"]
                ),
            }
        )
    if len({event["task_id"] for event in events}) != len(events):
        raise ValueError("duplicate task delivery credit")
    if (
        sum(event["category"] != "support" for event in events)
        != delivery["provisional"]["product_module_units"]
    ):
        raise ValueError("feature count differs from reviewed allowlist")
    spans = []
    for row in activity["rows"]:
        span = row.get("process_span")
        if span:
            spans.append(
                {
                    "task_id": row["task_id"],
                    "started_at_utc": span["started_at_utc"],
                    "ended_at_utc": span["ended_at_utc"],
                    "start_minutes_from_T0": (
                        aware(span["started_at_utc"]) - t0
                    ).total_seconds()
                    / 60,
                    "end_minutes_from_T0": (
                        aware(span["ended_at_utc"]) - t0
                    ).total_seconds()
                    / 60,
                }
            )
    if len(spans) != 100 or len({span["task_id"] for span in spans}) != 100:
        raise ValueError("100 distinct reported process spans required")
    coding_deadline = max(aware(span["started_at_utc"]) for span in spans) + timedelta(
        seconds=coding_seconds
    )
    return {
        "schema_version": 1,
        "T0_utc": t0.isoformat(),
        "as_of_utc": asof.isoformat(),
        "asof_minutes_from_T0": (asof - t0).total_seconds() / 60,
        "plot_clock_endpoint_utc": endpoint.isoformat(),
        "plot_minutes_from_T0": (endpoint - t0).total_seconds() / 60,
        "plot_clock_kind": "T1" if t1 else "as_of",
        "events": sorted(
            events, key=lambda event: (event["qualified_at_utc"], event["task_id"])
        ),
        "reported_process_spans": spans,
        "configured_coding_session_seconds": coding_seconds,
        "coding_deadline_from_latest_reported_start_utc": coding_deadline.isoformat(),
        "coding_deadline_minutes_from_T0": (coding_deadline - t0).total_seconds() / 60,
        "final_accepted_count": None,
        "final_T1_utc": endpoint.isoformat() if t1 else None,
        "original_workers_needs_repair": delivery["original_worker_outcomes"][
            "status_counts"
        ].get("needs_repair"),
        "original_workers_validated": delivery["original_worker_outcomes"][
            "validated_workers"
        ],
        "provisional_modules_per_plotted_clock_hour": delivery["provisional"][
            "product_module_units"
        ]
        * 3600
        / (endpoint - t0).total_seconds(),
        "AFK_series": None,
        "actual_billed_cost_usd": None,
        "provisional_feature_total": delivery["provisional"]["product_module_units"],
        "support_total": delivery["provisional"]["support_units"],
        "source_scope": "Only currently qualified distinct task units; B003 is one event after latest corrective combined green. Historical PRs never add duplicate feature credit.",
        "limits": [
            "Process spans contain model/queue/idle gaps and unmeasured clock/transport effects.",
            "Qualification timestamps are coordinator observations of recorded CI/review/tree gates, not final quality acceptance.",
            "No CPU utilization, actual model inference concurrency, continuous useful100-agent proof, AFK baseline or billed dollars is plotted.",
        ],
    }


def render(inputs, output_dir, metadata):
    matplotlib.rcParams.update(
        {
            "font.family": "DejaVu Sans",
            "font.size": 10,
            "axes.spines.top": False,
            "axes.spines.right": False,
            "svg.hashsalt": metadata["plot_inputs_sha256"][:16],
        }
    )
    fig, axes = plt.subplots(
        2, 1, figsize=(14, 9), sharex=True, gridspec_kw={"height_ratios": [1.1, 1]}
    )
    fig.subplots_adjust(top=0.84, bottom=0.25, left=0.085, right=0.97, hspace=0.42)
    feature_total = inputs["provisional_feature_total"]
    endpoint = aware(inputs["plot_clock_endpoint_utc"])
    maximum = inputs["plot_minutes_from_T0"]
    fig.suptitle(
        "Afterimage pilot100: provisional recovery progress",
        fontsize=18,
        x=0.085,
        ha="left",
        y=0.98,
    )
    fig.text(
        0.085,
        0.925,
        f"{feature_total} provisional product modules | {'closed clock T1' if inputs['final_T1_utc'] else 'as of'} {endpoint.strftime('%Y-%m-%d %H:%M:%S UTC')} | final acceptance unknown",
        fontsize=11,
    )
    fig.text(
        0.085,
        0.895,
        f"Original workers: {inputs['original_workers_needs_repair']} needs_repair / {inputs['original_workers_validated']} validated. The current recovery is assisted and provisional.",
        fontsize=10,
    )
    times = sorted(
        {0.0, maximum, *[event["minutes_from_T0"] for event in inputs["events"]]}
    )
    colors = {"unchanged": "#2166ac", "repaired": "#d95f02", "support": "#777777"}
    categories = [
        ("all_features", "Product modules total", "#222222", "-", 2.7),
        ("unchanged", "Unchanged recoveries", colors["unchanged"], "-", 1.7),
        ("repaired", "Coordinator repairs", colors["repaired"], "--", 1.7),
        ("support", "Supporting tasks", colors["support"], ":", 1.7),
    ]
    for category, label, color, style, width in categories:
        chosen = (
            [event for event in inputs["events"] if event["category"] != "support"]
            if category == "all_features"
            else [event for event in inputs["events"] if event["category"] == category]
        )
        values = [
            sum(event["minutes_from_T0"] <= point for event in chosen)
            for point in times
        ]
        axes[0].step(
            times,
            values,
            where="post",
            color=color,
            linestyle=style,
            linewidth=width,
            label=f"{label} ({len(chosen)})",
        )
    axes[0].set(
        title="Cumulative distinct task units — PROVISIONAL",
        ylabel="Task units",
        ylim=(-0.4, max(1, feature_total) + 1.5),
    )
    axes[0].yaxis.set_major_locator(MaxNLocator(integer=True, nbins=6))
    axes[0].legend(loc="upper left", ncol=2, frameon=False, fontsize=9)
    for span in inputs["reported_process_spans"]:
        axes[1].hlines(
            int(span["task_id"][1:]),
            span["start_minutes_from_T0"],
            span["end_minutes_from_T0"],
            color="#9b9b9b",
            linewidth=1.1,
            alpha=0.55,
        )
    axes[1].plot([], [], color="#9b9b9b", label="Reported coding process span")
    for category, label in [
        ("unchanged", "Qualified unchanged module"),
        ("repaired", "Qualified repaired module"),
        ("support", "Qualified support task"),
    ]:
        chosen = [event for event in inputs["events"] if event["category"] == category]
        axes[1].scatter(
            [event["minutes_from_T0"] for event in chosen],
            [int(event["task_id"][1:]) for event in chosen],
            s=26,
            color=colors[category],
            marker="o" if category != "repaired" else "D",
            label=label,
            zorder=4,
        )
    axes[1].set(
        title="100 reported process spans and observed qualification time",
        ylabel="Frozen task index",
        xlabel="Minutes since workload release T0",
        ylim=(101, 0),
        xlim=(0, max(10, maximum)),
    )
    axes[1].set_yticks([1, 25, 50, 75, 100], ["B001", "B025", "B050", "B075", "B100"])
    axes[1].legend(
        loc="upper center",
        bbox_to_anchor=(0.56, -0.23),
        ncol=2,
        frameon=False,
        fontsize=9,
    )
    deadline = inputs["coding_deadline_minutes_from_T0"]
    for axis in axes:
        axis.grid(axis="y", color="#e4e4e4", linewidth=0.7)
        axis.set_axisbelow(True)
        axis.axvline(deadline, color="#9e3333", linestyle="--", linewidth=1)
    axes[0].annotate(
        f"Original coding deadline\n({inputs['configured_coding_session_seconds'] / 60:g} min after reported starts)",
        xy=(deadline, 0.68),
        xycoords=("data", "axes fraction"),
        xytext=(5, -8),
        textcoords="offset points",
        va="top",
        fontsize=8,
        color="#8b2d2d",
        bbox={"facecolor": "white", "edgecolor": "none", "alpha": 0.9},
    )
    fig.text(
        0.085,
        0.075,
        "Each currently qualifying task appears once at its latest valid review/CI/tree qualification; B003's corrected green is one task unit.",
        fontsize=9,
    )
    fig.text(
        0.085,
        0.025,
        "Reported spans contain gaps; they do not measure CPU, inference or 100 useful agents. No AFK comparison or billed-cost series is asserted.",
        fontsize=9,
    )
    fig.text(
        0.085,
        0.05,
        "Invalidated states and the full defect history remain in the report. The 24 h quality observation is not complete.",
        fontsize=9,
    )
    stem = "pilot100-progress-" + endpoint.strftime("%Y%m%dT%H%M%SZ")
    png = output_dir / (stem + ".png")
    svg = output_dir / (stem + ".svg")
    if png.exists() or svg.exists():
        raise ValueError(
            "preserve existing rendered artifacts; choose a new output directory"
        )
    description = json.dumps(metadata, sort_keys=True)
    fig.savefig(
        png,
        dpi=150,
        metadata={
            "Software": "Matplotlib " + matplotlib.__version__,
            "Description": description,
        },
    )
    fig.savefig(
        svg,
        metadata={
            "Title": "Afterimage pilot100 provisional recovery progress",
            "Description": description,
            "Date": None,
        },
    )
    plt.close(fig)
    return png, svg


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--delivery", type=Path, required=True)
    parser.add_argument("--activity", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--coding-seconds", type=int, default=1800)
    args = parser.parse_args()
    if not 0 < args.coding_seconds <= 1800:
        raise ValueError("invalid configured coding timeout")
    delivery_raw = args.delivery.read_bytes()
    activity_raw = args.activity.read_bytes()
    inputs = prepare_inputs(
        json.loads(delivery_raw), json.loads(activity_raw), args.coding_seconds
    )
    inputs["source_sha256"] = {
        "delivery_allowlist": sha(delivery_raw),
        "activity_allowlist": sha(activity_raw),
        "plot_source": sha(Path(__file__).read_bytes()),
    }
    encoded = (json.dumps(inputs, indent=2) + "\n").encode()
    metadata = {
        "delivery_source_sha256": sha(delivery_raw),
        "activity_source_sha256": sha(activity_raw),
        "plot_source_sha256": inputs["source_sha256"]["plot_source"],
        "plot_inputs_sha256": sha(encoded),
        "as_of_utc": inputs["as_of_utc"],
        "plotted_clock_endpoint_utc": inputs["plot_clock_endpoint_utc"],
        "plot_clock_kind": inputs["plot_clock_kind"],
        "final_T1_utc": inputs["final_T1_utc"],
        "matplotlib_version": matplotlib.__version__,
        "final_acceptance_unknown": True,
        "source_is_public_allowlist_only": True,
    }
    args.output_dir.mkdir(mode=0o700, parents=True, exist_ok=True)
    input_path = args.output_dir / "plot-inputs-public-allowlist.json"
    with input_path.open("xb") as handle:
        handle.write(encoded)
    png, svg = render(inputs, args.output_dir, metadata)
    for path in (input_path, png, svg):
        path.chmod(0o600)
    result = {
        "kind": (
            "standalone_completed_clock_provisional_pilot_figure"
            if inputs["final_T1_utc"]
            else "standalone_interim_pilot_figure"
        ),
        "as_of_utc": inputs["as_of_utc"],
        "source": metadata,
        "files": {path.name: sha(path.read_bytes()) for path in (input_path, png, svg)},
        "provisional_product_modules": inputs["provisional_feature_total"],
        "support": inputs["support_total"],
        "B003_distinct_events": sum(
            event["task_id"] == "B003" for event in inputs["events"]
        ),
        "coding_deadline_minutes_after_T0": inputs["coding_deadline_minutes_from_T0"],
        "no_raw_runtime_or_account_finance": True,
        "external_operations": 0,
    }
    receipt = args.output_dir / "plot-artifacts-public-receipt.json"
    receipt.write_text(json.dumps(result, indent=2) + "\n")
    receipt.chmod(0o600)
    print(json.dumps(result))


if __name__ == "__main__":
    main()
