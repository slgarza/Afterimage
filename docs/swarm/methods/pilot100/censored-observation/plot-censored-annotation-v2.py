"""Annotation-only censored figure derivative; reads a fixed captured sidecar, never runtime."""

import argparse
import hashlib
import json
import os
from datetime import datetime
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
        "plotting_source_sha256": sha(Path(__file__).read_bytes()),
        "annotation_revision": "Removed unmeasured coding-deadline annotation; qualification events and counts unchanged.",
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
        "plotting_source_sha256": sha(Path(__file__).read_bytes()),
        "annotation_revision": "Removed unmeasured coding-deadline annotation only.",
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
    parser.add_argument("--sidecar", type=Path, required=True)
    parser.add_argument("--sidecar-sha256", required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    raw = args.sidecar.read_bytes()
    require(sha(raw) == args.sidecar_sha256, "captured sidecar hash differs")
    result = json.loads(raw)
    require(
        result["clock"]["T1_utc"] is None
        and result["clock"]["full_delivery_finished"] is False,
        "censored captured sidecar required",
    )
    require(
        result["kind"]
        == "CENSORED_frozen_window_observation_close_not_completed_workload",
        "wrong captured sidecar kind",
    )
    require(sha(encoded(result)) == sha(raw), "canonical sidecar bytes differ")
    args.output_dir.mkdir(mode=0o700, parents=True, exist_ok=False)
    receipt = plot(result, None, args.output_dir)
    receipt["source_captured_sidecar_sha256"] = sha(raw)
    receipt["plotting_source_sha256"] = sha(Path(__file__).read_bytes())
    receipt["annotation_only_derivative"] = True
    receipt["original_v1_source_sha256"] = (
        "7b63c5ac465338e1f4b680ada4004d6d1be66816dbde0b6dd632135ec1f9e7ac"
    )
    write_once(args.output_dir / "censored-figure-v2-receipt.json", encoded(receipt))
    print(json.dumps(receipt))


if __name__ == "__main__":
    main()
