"""Offline versioned delivery evidence; never invoke GitHub or a provider."""

import argparse
import hashlib
import json
import math
import os
import re
import subprocess
from collections import Counter
from datetime import UTC, datetime, timedelta
from pathlib import Path

from swarm_control.pilot_integrate import SECRET

SHA256 = re.compile(r"^[a-f0-9]{64}$")
GIT_SHA = re.compile(r"^[a-f0-9]{40}$")
TASK = re.compile(r"^B(?:00[1-9]|0[1-9][0-9]|100)$")
REPO = "slgarza/Afterimage"
SUPPORT = {"B077", "B090", "B094"}


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def read(path):
    if not path.is_file() or path.is_symlink():
        raise ValueError("missing or symlink evidence input")
    raw = path.read_bytes()
    return raw, json.loads(raw)


def aware(value):
    result = datetime.fromisoformat(value)
    if result.utcoffset() is None:
        raise ValueError("aware evidence timestamp required")
    return result


def seconds(start, end):
    return None if not start or not end else (aware(end) - aware(start)).total_seconds()


def safe_hash(value, pattern=SHA256):
    return value if isinstance(value, str) and pattern.fullmatch(value) else None


def safe_url(value):
    return (
        value
        if isinstance(value, str)
        and re.fullmatch(
            r"https://github\.com/slgarza/Afterimage/(?:pull/\d+|commit/[a-f0-9]{40}/checks|actions/runs/\d+(?:/job/\d+)?)",
            value,
        )
        else None
    )


def inside_delivery_window(t0, cutoff, merged_at, green_observed_at):
    try:
        return (
            aware(t0) <= aware(merged_at) <= aware(green_observed_at) <= aware(cutoff)
        )
    except (ValueError, TypeError):
        return False


def validate_bindings(
    task,
    report,
    original_report_raw,
    original_patch,
    state,
    post,
    artifact,
    review_raw,
    review,
    repair=None,
    delta=None,
):
    repaired = state.get("delivery_attribution") == "coordinator_code_or_test_repair"
    expected = "launch_packet" if int(task[1:]) <= 50 else "preflight_engine"
    original_hash = sha(original_patch)
    report_hash = sha(original_report_raw)
    patch = state.get("patch_sha256")
    checked = {
        "original_failed_outcome_preserved": report.get("status") == "needs_repair",
        "review_receipt_hash": sha(review_raw) == state.get("review_receipt_sha256"),
        "independent_expected_reviewer": review.get("reviewer") == expected
        and review.get("independence") is True
        and review.get("task_id") == task,
        "review_original_report_and_patch_binding": review.get("original_report_sha256")
        == report_hash
        and review.get("original_patch_sha256") == original_hash,
        "reviewed_candidate_patch_binding": review.get("reviewed_patch_sha256")
        == patch
        == artifact.get("patch_sha256"),
        "review_verdict": review.get("verdict")
        == ("approve_repaired" if repaired else "approve_recovered"),
        "queue_provisional_status": state.get("status") == "merged_green_provisional",
        "combined_checks_passed": post.get("status") == "passed",
        "actual_tree_verified": state.get("merged_tree_verified") is True
        and post.get("merged_tree_verified") is True,
        "no_reconciliation_required": not state.get(
            "requires_coordinator_reconciliation", False
        )
        and not post.get("requires_coordinator_reconciliation", False),
        "merged_artifact": artifact.get("status") == "merged"
        and artifact.get("application_method") == "direct",
        "exact_head_binding": safe_hash(state.get("head_sha"), GIT_SHA) is not None
        and state.get("head_sha")
        == artifact.get("head_sha")
        == artifact.get("green_head_sha"),
        "actual_merge_binding": safe_hash(state.get("merge_commit_sha"), GIT_SHA)
        is not None
        and state.get("merge_commit_sha")
        == post.get("merge_commit_sha")
        == artifact.get("merge_commit_sha"),
        "pr_binding": state.get("pr_number") == artifact.get("pr_number")
        and safe_url(state.get("pr_url")) is not None
        and state.get("pr_url") == artifact.get("pr_url") == post.get("pr_url"),
        "base_and_tree_present": safe_hash(artifact.get("tested_base_sha"), GIT_SHA)
        is not None
        and safe_hash(artifact.get("tested_tree"), GIT_SHA) is not None,
        "merge_timestamp_bound": state.get("merged_at") == artifact.get("merged_at")
        and bool(artifact.get("merged_at")),
    }
    try:
        checked["aware_review_after_original_finish"] = aware(
            review["reviewed_at_utc"]
        ) >= aware(report["finished_at"])
    except (ValueError, KeyError, TypeError):
        checked["aware_review_after_original_finish"] = False
    if repaired:
        repair = repair or {}
        checked["repair_original_binding"] = (
            repair.get("original_report_sha256") == report_hash
            and repair.get("original_patch_sha256") == original_hash
        )
        checked["repair_candidate_binding"] = (
            repair.get("repaired_patch_sha256") == patch
            and repair.get("actor") == "root"
            and repair.get("full_validation_passed") is True
        )
        checked["repair_delta_binding"] = delta is not None and sha(
            delta
        ) == repair.get("coordinator_delta_sha256") == review.get(
            "coordinator_delta_sha256"
        )
    else:
        checked["unchanged_original_candidate"] = bool(
            original_patch
        ) and patch == original_hash == report.get(
            "checked_patch_sha256"
        ) == report.get("patch_sha256")
        checked["unchanged_original_check_passed"] = (
            type(report.get("check_exit")) is int
            and report["check_exit"] == 0
            and review.get("recovered_patch_review") is True
        )
    return checked


def measured_seconds(record, names):
    for name in names:
        value = record.get(name)
        if value is None:
            continue
        if type(value) not in (int, float) or not math.isfinite(value) or value < 0:
            raise ValueError("invalid finite nonnegative measured duration")
        return value, name
    return None, None


def first_aware_field(record, names):
    for name in names:
        if record.get(name) is not None:
            aware(record[name])
            return record[name], name
    return None, None


def operator_measurements(run):
    specs = [
        (
            "domain_six_originals",
            "repair-diagnostics/domain-six-originals-01/completed.json",
            ("monotonic_elapsed_seconds",),
            "One common diagnostic across six original patches; parent duration counted once.",
        ),
        (
            "ui_eight_originals",
            "repair-diagnostics/ui-eight-originals-01/completed.json",
            ("common_monotonic_elapsed_seconds",),
            "One common client validation, not eight separate elapsed durations; original label was corrected in the source.",
        ),
        (
            "review_fixture_preparation",
            "reviews/tools/common-preparation-receipt.json",
            ("measured_segment_monotonic_seconds",),
            "Only captured preparation segment; earlier preparation elapsed time remains unknown.",
        ),
        (
            "harness_correction",
            "reviews/tools/harness-correction-complete.json",
            ("monotonic_elapsed_seconds",),
            "Harness correction includes its nested regression checks; do not add the nested subset again.",
        ),
        (
            "public_acceptance_export",
            "reviews/tools/public-acceptance-export-complete.json",
            ("common_monotonic_elapsed_seconds",),
            "Common export elapsed window includes its smoke-test subset; not per-case work.",
        ),
        (
            "repaired_review_preparation",
            "reviews/tools/repaired-review-preparation-complete.json",
            ("monotonic_elapsed_seconds",),
            "Common repaired-review preparation; count invocation once.",
        ),
        (
            "repaired_staging_proof_preparation",
            "reviews/tools/repaired-review-staging-proof-preparation-complete.json",
            ("monotonic_elapsed_seconds",),
            "Only captured staging-proof segment; prior generation and reading time remains unknown.",
        ),
        (
            "generic_repair_queue_audit_verification",
            "independent-generic-repair-queue-audit-136a769e.json",
            ("receipt_verification_monotonic_elapsed_seconds",),
            "Only captured receipt verification; earlier source-review elapsed time remains unknown.",
        ),
    ]
    shared = []
    for identity, relative, fields, scope in specs:
        path = run / relative
        raw, data = read(path) if path.is_file() else (None, {})
        duration, origin = measured_seconds(data, fields)
        start, start_origin = first_aware_field(
            data, ("measured_segment_started_at_utc", "started_at_utc")
        )
        end, end_origin = first_aware_field(
            data, ("finished_at_utc", "completed_at_utc")
        )
        shared.append(
            {
                "measurement_id": identity,
                "source_receipt_sha256": sha(raw) if raw is not None else None,
                "source_available": raw is not None,
                "measured_segment_seconds": duration,
                "duration_origin_field": origin,
                "started_at_utc": start,
                "finished_at_utc": end,
                "start_origin_field": start_origin,
                "end_origin_field": end_origin,
                "scope": scope,
                "case_multiplier_applied": False,
                "nested_subphase_durations_are_subsets_not_additive": True,
                "earlier_unmeasured_segment_seconds": None,
                "exclusive_person_attention_established": False,
            }
        )
    reviews = []
    for lane in ("recovery", "repairs"):
        for path in sorted((run / "reviews" / lane).glob("B*.json")):
            raw, data = read(path)
            task = data.get("task_id")
            if not isinstance(task, str) or not TASK.fullmatch(task):
                raise ValueError("invalid canonical review task")
            duration, origin = measured_seconds(
                data, ("review_duration_seconds", "monotonic_elapsed_seconds")
            )
            prior, prior_origin = measured_seconds(
                data, ("prior_semantic_segment_seconds_excluding_common_diagnostics",)
            )
            earlier, earlier_origin = measured_seconds(
                data,
                ("earlier_semantic_review_and_binding_investigation_elapsed_seconds",),
            )
            start, start_origin = first_aware_field(data, ("reviewer_started_at_utc",))
            end, end_origin = first_aware_field(
                data, ("reviewer_finished_at_utc", "reviewed_at_utc")
            )
            reviews.append(
                {
                    "task_id": task,
                    "lane": lane,
                    "receipt_role": "canonical"
                    if path.name == task + ".json"
                    else "preserved_historical",
                    "source_receipt_sha256": sha(raw),
                    "reviewer": data.get("reviewer")
                    if data.get("reviewer") in {"launch_packet", "preflight_engine"}
                    else None,
                    "verdict": data.get("verdict")
                    if data.get("verdict")
                    in {"approve_recovered", "approve_repaired", "reject"}
                    else None,
                    "measured_review_segment_seconds": duration,
                    "duration_origin_field": origin,
                    "started_at_utc": start,
                    "finished_at_utc": end,
                    "start_origin_field": start_origin,
                    "end_origin_field": end_origin,
                    "prior_semantic_segment_seconds_excluding_shared_diagnostics": prior,
                    "prior_segment_origin_field": prior_origin,
                    "earlier_semantic_and_binding_investigation_seconds": earlier,
                    "earlier_segment_origin_field": earlier_origin,
                    "additive_exclusive_person_time": False,
                    "entire_historical_review_coverage_asserted": False,
                }
            )
    attempts = []
    for path in sorted((run / "coordinator-repairs").glob("B*/repair.json")):
        repair_raw, repair = read(path)
        attempt = path.parent.name
        task = repair.get("task_id")
        if not isinstance(task, str) or not TASK.fullmatch(task):
            raise ValueError("invalid coordinator authoring task")
        diagnostic = run / "repair-diagnostics" / attempt / "integration.json"
        start_raw, start_data = read(diagnostic) if diagnostic.is_file() else (None, {})
        start, start_origin = first_aware_field(
            start_data, ("started_at_utc", "preparation_started_at", "started_at")
        )
        end, end_origin = first_aware_field(repair, ("recorded_at_utc",))
        duration = seconds(start, end)
        if duration is not None and duration < 0:
            raise ValueError("negative authoring envelope")
        attempts.append(
            {
                "task_id": task,
                "attempt_id": attempt,
                "started_at_utc": start,
                "finished_at_utc": end,
                "envelope_seconds": duration,
                "start_origin_field": start_origin,
                "end_origin_field": end_origin,
                "integration_metadata_sha256": sha(start_raw)
                if start_raw is not None
                else None,
                "repair_metadata_sha256": sha(repair_raw),
                "not_exclusive_attention_or_cpu_time": True,
                "quality_correction_of_existing_module": repair.get(
                    "quality_correction_of_already_merged_task"
                )
                is True,
            }
        )
    tasks = []
    for task in sorted({entry["task_id"] for entry in attempts}):
        members = [entry for entry in attempts if entry["task_id"] == task]
        known = [entry for entry in members if entry["envelope_seconds"] is not None]
        start = min((aware(entry["started_at_utc"]) for entry in known), default=None)
        end = max((aware(entry["finished_at_utc"]) for entry in known), default=None)
        tasks.append(
            {
                "task_id": task,
                "attempt_count": len(members),
                "attempts_with_known_envelopes": len(known),
                "started_at_utc": start.isoformat() if start else None,
                "finished_at_utc": end.isoformat() if end else None,
                "outer_envelope_seconds": (end - start).total_seconds()
                if start and end
                else None,
                "overlapping_envelopes_must_not_be_summed_as_person_time": True,
            }
        )
    owner = run / "recovery-coordinator-repairs-complete.json"
    owner_raw, flag = read(owner) if owner.is_file() else (None, {})
    expected = flag.get("coordinator_repaired_candidates")
    if type(expected) is not int:
        expected = None
    return {
        "shared_invocations": shared,
        "canonical_review_measured_segments": [
            value for value in reviews if value["receipt_role"] == "canonical"
        ],
        "preserved_historical_review_measured_segments": [
            value
            for value in reviews
            if value["receipt_role"] == "preserved_historical"
        ],
        "coordinator_authoring_attempt_envelopes": attempts,
        "coordinator_authoring_task_envelopes": tasks,
        "coverage": {
            "declared_coordinator_repaired_tasks": expected,
            "declared_new_paid_workers": flag.get("new_paid_workers")
            if type(flag.get("new_paid_workers")) is int
            and flag["new_paid_workers"] == 0
            else None,
            "observed_authoring_tasks": len(tasks),
            "declared_owner_receipt_sha256": sha(owner_raw)
            if owner_raw is not None
            else None,
            "all_declared_task_envelopes_present": expected is not None
            and len(tasks) == expected
            and all(entry["outer_envelope_seconds"] is not None for entry in tasks),
            "all_historical_time_or_exclusive_attention_measured": False,
            "missing_measurements_remain_null": True,
            "durations_are_not_summed_or_multiplied_by_test_cases": True,
        },
    }


def local_validation_receipts(run):
    records = []
    unparsed = 0
    # Operator receipts are metadata outside copied repositories. Never scan app/package JSON.
    base = run / "repair-diagnostics"
    candidates = []
    for parent, dirs, files in os.walk(base):
        dirs[:] = [
            name
            for name in dirs
            if name not in {"tree", "node_modules", ".git", ".swarm"}
        ]
        candidates.extend(
            Path(parent) / name for name in files if name.endswith(".json")
        )
    for path in sorted(candidates):
        try:
            raw, d = read(path)
        except (ValueError, UnicodeError):
            unparsed += 1
            continue
        if not isinstance(d, dict):
            continue
        validation = d.get("kind") == "coordinator_local_repair_validation" or (
            "return_code" in d and "wall_seconds" in d and "argv" in d
        )
        diagnostic = d.get("kind") == "explicit_coordinator_local_repair_diagnostic"
        if not validation and not diagnostic:
            continue
        task = d.get("task_id")
        if not isinstance(task, str) or not TASK.fullmatch(task):
            raise ValueError("invalid diagnostic task")
        phase = (
            "typecheck"
            if "type" in path.name
            else "full_benchmark"
            if "benchmark" in path.name
            else "install"
            if "install" in path.name
            else "scoped_tests"
            if "scoped" in path.name
            else "current_base_diagnostic"
        )
        start = d.get("started_at_utc")
        end = d.get("ended_at_utc")
        if start:
            aware(start)
        if end:
            aware(end)
        duration = d.get("wall_seconds")
        code = d.get("return_code")
        if duration is not None and (
            type(duration) not in (int, float)
            or not math.isfinite(duration)
            or duration < 0
        ):
            raise ValueError("invalid diagnostic duration")
        if code is not None and type(code) is not int:
            raise ValueError("invalid diagnostic return code")
        records.append(
            {
                "kind": "coordinator_local_repair_validation",
                "task_id": task,
                "attempt_id": path.parent.name
                if re.fullmatch(r"B\d{3}-\d+", path.parent.name)
                else None,
                "phase": phase,
                "source_receipt_sha256": sha(raw),
                "started_at_utc": start,
                "ended_at_utc": end,
                "wall_seconds": duration,
                "return_code": code,
                "outcome": "passed"
                if code == 0
                else "failed"
                if code is not None or d.get("error_type")
                else "unknown",
                "output_sha256": safe_hash(d.get("output_sha256")),
                "test_case_count": None,
                "diagnostic_wrapper_not_additive_check_duration": diagnostic,
                "original_worker_outcome_preserved": d.get(
                    "original_worker_outcome_preserved",
                    d.get("original_status_preserved"),
                )
                is True,
                "new_paid_workers": False,
            }
        )
    return records, unparsed


def failed_candidate_bindings(run, target):
    benchmark_files = {}
    for path in (target / ".swarm" / "benchmarks").glob("*.json"):
        if path.is_file() and not path.is_symlink():
            raw = path.read_bytes()
            benchmark_files[sha(raw)] = raw
    records = []
    for path in sorted((run / "repair-diagnostics").glob("*/*/source-binding.json")):
        raw, binding = read(path)
        attempt = path.parent.parent.name
        task = attempt.split("-")[0]
        if not TASK.fullmatch(task):
            raise ValueError("invalid archived repair identity")
        failed_hash = safe_hash(binding.get("failed_benchmark_receipt_sha256"))
        candidate_hash = safe_hash(binding.get("candidate_sha256"))
        candidate = path.parent / "full-candidate.patch"
        candidate_verified = (
            candidate.is_file() and sha(candidate.read_bytes()) == candidate_hash
        )
        benchmark_raw = benchmark_files.get(failed_hash)
        benchmark = json.loads(benchmark_raw) if benchmark_raw else {}
        records.append(
            {
                "kind": "archived_failed_coordinator_candidate_source_binding",
                "task_id": task,
                "attempt_id": attempt,
                "source_binding_receipt_sha256": sha(raw),
                "failed_benchmark_receipt_sha256": failed_hash,
                "archived_failed_candidate_patch_sha256": candidate_hash,
                "archived_candidate_hash_verified": candidate_verified,
                "failed_benchmark_receipt_hash_verified": benchmark_raw is not None,
                "failed_benchmark_status_recorded": benchmark.get("status")
                if benchmark.get("status")
                in {"failed", "passed", "interrupted", "running"}
                else None,
                "source_matches_failed_benchmark_recorded": binding.get(
                    "source_matches_failed_benchmark"
                )
                is True,
                "source_correspondence_is_recorded_coordinator_attestation_not_independently_reexecuted": True,
            }
        )
    return records


def collect(run, batch, target):
    snapshot_started = datetime.now(UTC)
    state_raw, state = read(run / "recovery-queue-state.json")
    release_raw, release = read(run / "workload-release.json")
    journal_raw = (run / "recovery-journal.jsonl").read_bytes()
    complete = journal_raw.splitlines(keepends=True)
    trailing = bool(complete and not complete[-1].endswith(b"\n"))
    if trailing:
        complete = complete[:-1]
    events = [json.loads(line) for line in complete]
    event_kinds = Counter()
    operations = []
    for event in events:
        kind = event.get("kind")
        if not isinstance(kind, str) or not re.fullmatch(r"[a-z_]{1,100}", kind):
            raise ValueError("unexpected journal event kind")
        event_kinds[kind] += 1
        if kind == "operation_finished":
            task = event.get("task_id")
            phase = event.get("operation")
            if not TASK.fullmatch(task or "") or phase not in {
                "plan",
                "prepare",
                "publish",
                "merge",
            }:
                raise ValueError("invalid journal operation")
            operations.append(
                {
                    k: event.get(k)
                    for k in (
                        "task_id",
                        "operation",
                        "started_at_utc",
                        "ended_at_utc",
                        "wall_seconds",
                        "return_code",
                        "child_started",
                        "output_sha256",
                    )
                }
            )
    artifact_index = {}
    for path in list((run / "recovery-attempts").glob("B*/integration.json")) + list(
        (run / "coordinator-repairs").glob("B*/integration.json")
    ):
        raw, data = read(path)
        artifact_index.setdefault(data.get("task_id"), []).append((path, raw, data))
    rows = []
    artifact_errors = []
    eligible = []
    original_counts = Counter()
    base = release["worker_base_sha"]
    for number in range(1, 101):
        task = f"B{number:03}"
        directory = batch / task
        manifest_raw, manifest = read(directory / "manifest.json")
        report_raw, report = read(directory / "report.json")
        patch = (directory / "changes.patch").read_bytes()
        frozen = subprocess.run(
            ["git", "show", f"{base}:swarm/tasks/{task}.json"],
            cwd=target,
            capture_output=True,
            check=True,
        ).stdout
        if (
            manifest["task"] != json.loads(frozen)
            or manifest["base_sha"] != base
            or report["base_sha"] != base
            or report["task_id"] != task
            or sha(patch) != report["patch_sha256"]
        ):
            raise ValueError("original/frozen input mismatch")
        original_counts[report["status"]] += 1
        counts_feature = manifest["task"]["countsAsFeatureDelivery"]
        if type(counts_feature) is not bool or counts_feature != (task not in SUPPORT):
            raise ValueError("frozen support classification mismatch")
        queued = state["tasks"].get(task, {})
        row = {
            "task_id": task,
            "issue": manifest["task"]["issue"],
            "original_status": report["status"],
            "original_agent_exit": report.get("agent_exit"),
            "original_helper_check_exit": report.get("check_exit"),
            "original_report_sha256": sha(report_raw),
            "original_manifest_sha256": sha(manifest_raw),
            "original_patch_sha256": sha(patch),
            "frozen_task_sha256": sha(frozen),
            "workload_counts_as_feature_only_not_delivery": counts_feature,
            "queue_status": queued.get("status", "not_recorded"),
            "provisional_qualified": False,
            "final_quality_accepted": None,
            "binding_checks": {},
            "recovery": None,
            "historical_pr_chain": [],
        }
        for old in state.get("task_history", {}).get(task, []):
            row["historical_pr_chain"].append(
                {
                    "pr_url": safe_url(old.get("pr_url")),
                    "head_sha": safe_hash(old.get("head_sha"), GIT_SHA),
                    "reviewed_patch_sha256": safe_hash(old.get("patch_sha256")),
                    "review_receipt_sha256": safe_hash(
                        old.get("review_receipt_sha256")
                    ),
                    "merge_commit_sha": safe_hash(old.get("merge_commit_sha"), GIT_SHA),
                    "merged_at_utc": old.get("merged_at"),
                    "status": old.get("status")
                    if re.fullmatch(r"[a-z_]{1,100}", old.get("status", ""))
                    else None,
                    "additional_feature_credit": 0,
                    "historical_row_not_additional_delivery": True,
                }
            )
        if queued and queued.get("patch_sha256"):
            candidates = [
                item
                for item in artifact_index.get(task, [])
                if item[2].get("patch_sha256") == queued.get("patch_sha256")
                and (
                    queued.get("pr_number") is None
                    or item[2].get("pr_number") == queued.get("pr_number")
                )
            ]
            try:
                if len(candidates) != 1:
                    raise ValueError("candidate_missing_or_ambiguous")
                path, artifact_raw, artifact = candidates[0]
                repaired = (
                    queued.get("delivery_attribution")
                    == "coordinator_code_or_test_repair"
                )
                lane = "repairs" if repaired else "recovery"
                review_raw, review = read(run / "reviews" / lane / f"{task}.json")
                repair_raw, repair = (
                    read(path.parent / "repair.json") if repaired else (None, None)
                )
                delta = (
                    (path.parent / "coordinator-delta.patch").read_bytes()
                    if repaired
                    else None
                )
                checks = validate_bindings(
                    task,
                    report,
                    report_raw,
                    patch,
                    queued,
                    state.get("post_merge_checks", {}).get(task, {}),
                    artifact,
                    review_raw,
                    review,
                    repair,
                    delta,
                )
                checks["inside_frozen_delivery_window"] = inside_delivery_window(
                    release["t0_utc"],
                    release["delivery_cutoff_utc"],
                    artifact.get("merged_at"),
                    state.get("post_merge_checks", {})
                    .get(task, {})
                    .get("observed_at_utc"),
                )
                checks["actual_candidate_patch_file_hash"] = sha(
                    (path.parent / "changes.patch").read_bytes()
                ) == queued.get("patch_sha256")
                row["binding_checks"] = checks
                qualified = all(checks.values())
                row["provisional_qualified"] = qualified
                merge_at = artifact.get("merged_at")
                quality_until = (
                    (aware(merge_at) + timedelta(days=1)).isoformat()
                    if merge_at
                    else None
                )
                post = state.get("post_merge_checks", {}).get(task, {})
                row["recovery"] = {
                    "attribution": "coordinator_code_or_test_repair"
                    if repaired
                    else "trusted_local_unchanged_failed_worker_recovery",
                    "reviewer": review.get("reviewer")
                    if review.get("reviewer") in {"launch_packet", "preflight_engine"}
                    else None,
                    "review_receipt_sha256": sha(review_raw),
                    "reviewed_patch_sha256": safe_hash(queued.get("patch_sha256")),
                    "coordinator_delta_sha256": sha(delta)
                    if delta is not None
                    else None,
                    "applied_full_index_patch_sha256": safe_hash(
                        artifact.get("applied_patch_sha256")
                    ),
                    "artifact_integration_sha256": sha(artifact_raw),
                    "repair_metadata_sha256": sha(repair_raw)
                    if repair_raw is not None
                    else None,
                    "tested_base_sha": safe_hash(
                        artifact.get("tested_base_sha"), GIT_SHA
                    ),
                    "tested_tree_sha": safe_hash(artifact.get("tested_tree"), GIT_SHA),
                    "reviewed_head_sha": safe_hash(artifact.get("head_sha"), GIT_SHA),
                    "merge_commit_sha": safe_hash(
                        artifact.get("merge_commit_sha"), GIT_SHA
                    ),
                    "pr_url": safe_url(artifact.get("pr_url")),
                    "head_checks_url": f"https://github.com/{REPO}/commit/{artifact['head_sha']}/checks"
                    if safe_hash(artifact.get("head_sha"), GIT_SHA)
                    else None,
                    "combined_checks_url": f"https://github.com/{REPO}/commit/{artifact['merge_commit_sha']}/checks"
                    if safe_hash(artifact.get("merge_commit_sha"), GIT_SHA)
                    else None,
                    "preparation_started_at_utc": artifact.get(
                        "preparation_started_at"
                    ),
                    "checks_started_at_utc": artifact.get("checks_started_at"),
                    "checks_finished_at_utc": artifact.get("checks_finished_at"),
                    "full_integration_checks_elapsed_seconds": seconds(
                        artifact.get("checks_started_at"),
                        artifact.get("checks_finished_at"),
                    ),
                    "published_at_utc": artifact.get("published_at"),
                    "merged_at_utc": merge_at,
                    "combined_green_observed_at_utc": post.get("observed_at_utc")
                    if post.get("status") == "passed"
                    else None,
                    "review_started_at_utc": review.get("reviewer_started_at_utc"),
                    "review_finished_at_utc": review.get(
                        "reviewer_finished_at_utc", review.get("reviewed_at_utc")
                    ),
                    "review_duration_seconds": measured_seconds(
                        review, ("review_duration_seconds", "monotonic_elapsed_seconds")
                    )[0],
                    "review_duration_origin_field": measured_seconds(
                        review, ("review_duration_seconds", "monotonic_elapsed_seconds")
                    )[1],
                    "review_duration_is_measured_segment_not_exclusive_person_time": True,
                    "prior_local_full_validation_seconds": repair.get(
                        "full_validation_wall_seconds"
                    )
                    if repair
                    else None,
                    "quality_window_end_utc": quality_until,
                    "quality_window_elapsed": snapshot_started >= aware(quality_until)
                    if quality_until
                    else False,
                    "quality_observation_completed_and_accepted": None,
                    "corrective_pr_for_existing_module": bool(
                        repair
                        and repair.get("quality_correction_of_already_merged_task")
                    ),
                    "additional_feature_credit_of_this_corrective_pr": 0
                    if repair
                    and repair.get("quality_correction_of_already_merged_task")
                    else None,
                    "distinct_task_provisional_feature_credit": 1
                    if qualified and counts_feature
                    else 0,
                }
                if qualified:
                    eligible.append(row)
            except (ValueError, KeyError, OSError, TypeError) as error:
                row["binding_checks"]["collector_could_verify_candidate"] = False
                artifact_errors.append(
                    {
                        "task_id": task,
                        "error_type": type(error).__name__,
                        "qualification_blocked": True,
                    }
                )
        rows.append(row)
    diagnostics, unparsed = local_validation_receipts(run)
    measurements = operator_measurements(run)
    if (run / "recovery-queue-state.json").read_bytes() != state_raw:
        raise RuntimeError("queue_state_changed_during_collection_retry")
    now = datetime.now(UTC)
    t0 = aware(release["t0_utc"])
    elapsed = (now - t0).total_seconds()
    features = sum(r["workload_counts_as_feature_only_not_delivery"] for r in eligible)
    support = len(eligible) - features
    result = {
        "schema_version": 1,
        "measurement_kind": "offline_interim_recovery_delivery_allowlist",
        "as_of_utc": now.isoformat(),
        "collection_started_at_utc": snapshot_started.isoformat(),
        "run_id": run.name,
        "repository": REPO,
        "worker_base_sha": base,
        "controller_commit": release["controller_commit"],
        "clock": {
            "T0_utc": t0.isoformat(),
            "delivery_cutoff_utc": release["delivery_cutoff_utc"],
            "T1_utc": None,
            "full_delivery_finished": False,
            "interim_elapsed_T0_to_asof_seconds": elapsed,
            "quality_window_seconds_after_latest_actual_merge": 86400,
            "clock_reset_for_recovery_or_correction": False,
            "merge_and_observed_combined_green_must_be_within_cutoff": True,
        },
        "original_worker_outcomes": {
            "task_count": 100,
            "status_counts": dict(original_counts),
            "validated_workers": original_counts["validated"],
            "reports_rewritten": False,
        },
        "provisional": {
            "qualified_distinct_tasks": len(eligible),
            "product_module_units": features,
            "support_units": support,
            "unchanged_failed_worker_recoveries": sum(
                r["recovery"]["attribution"]
                == "trusted_local_unchanged_failed_worker_recovery"
                for r in eligible
            ),
            "coordinator_repaired_task_units": sum(
                r["recovery"]["attribution"] == "coordinator_code_or_test_repair"
                for r in eligible
            ),
            "known_corrective_prs_no_extra_feature_credit": sum(
                r["recovery"]["corrective_pr_for_existing_module"] for r in eligible
            ),
            "counts_remain_assisted_and_provisional": True,
            "not_final_24h_accepted_delivery": True,
            "INTERIM_provisional_product_modules_per_hour": features * 3600 / elapsed
            if elapsed > 0
            else None,
            "INTERIM_provisional_task_units_per_hour": len(eligible) * 3600 / elapsed
            if elapsed > 0
            else None,
        },
        "final_metrics": {
            "accepted_feature_items": None,
            "accepted_green_prs_per_hour": None,
            "accepted_green_prs_per_dollar": None,
            "actual_billed_total_usd": None,
            "eligible_cost_usd": None,
            "billing_reconciled": False,
            "AFK_efficiency_win_proven": False,
        },
        "queue": {
            "paused": state.get("paused") is True,
            "status_counts": dict(Counter(row["queue_status"] for row in rows)),
            "all_100_terminal_and_combined_checks_complete": (
                len(state["tasks"]) == 100
                and not state.get("paused")
                and not any(
                    row["queue_status"]
                    in {
                        "integrating",
                        "waiting_head_ci",
                        "merged_pending_combined_ci",
                        "merge_outcome_requires_reconciliation",
                        "merge_tree_requires_reconciliation",
                        "post_merge_quality_defect_requires_repair",
                    }
                    for row in rows
                )
                and all(
                    post.get("status") in {"passed", "failed"}
                    for post in state.get("post_merge_checks", {}).values()
                )
            ),
            "collector_qualification_errors": artifact_errors,
        },
        "source_evidence": {
            "collector_source_sha256": sha(Path(__file__).read_bytes()),
            "queue_state_sha256": sha(state_raw),
            "queue_journal_sha256": sha(journal_raw),
            "workload_release_sha256": sha(release_raw),
            "journal_complete_event_count": len(events),
            "journal_trailing_partial_line_ignored": trailing,
            "journal_event_kind_counts": dict(event_kinds),
            "source_and_artifact_hashes_are_not_credential_hashes": True,
        },
        "operator_phase_operations": operations,
        "operator_measurements": measurements,
        "recovery_cost_scope": {
            "new_paid_workers": measurements["coverage"]["declared_new_paid_workers"],
            "additional_paid_compatibility_probes": 0,
            "scope": "Additional workers/probes after the original authorized100-worker cohort; original cohort and setup remain separate recorded stages.",
            "basis": "Root completion record and reviewed local-only recovery operators; no provider balance or invoice inference.",
            "zero_economic_cost_inferred": False,
            "local_coordinator_codex_ci_and_export_cost_usd": None,
            "gross_attributable_recovery_cost_usd": None,
            "eligible_recovery_cost_usd": None,
            "all_recovery_validation_and_integration_time_remains_on_original_T0_clock": True,
        },
        "local_validation_attempts": diagnostics,
        "archived_failed_candidate_source_bindings": failed_candidate_bindings(
            run, target
        ),
        "local_validation_summary": {
            "attempt_count": len(diagnostics),
            "failed_attempts": sum(r["outcome"] == "failed" for r in diagnostics),
            "passed_attempts": sum(r["outcome"] == "passed" for r in diagnostics),
            "unparsed_operator_metadata_receipts": unparsed,
            "all_failed_and_superseded_receipts_retained": True,
            "wrapper_and_contained_check_durations_are_not_additive": True,
        },
        "rows": rows,
        "limits": [
            "Offline evidence binds the recorded integrator and independent reviews; it does not independently requery GitHub or reevaluate semantic feature acceptance.",
            "Only exact provisional queue+CI+tree+review/hash conjunction is counted; missing or inconsistent evidence is excluded.",
            "Corrective PRs repair an existing module and never add a second feature unit. Quality clock begins again at the latest corrective merge.",
            "The full clock is T0 through this as-of snapshot; interim rates are not final T1 rates. Costs and final accepted metrics remain unknown.",
            "Qualification requires recorded merge and combined-green observation inside the frozen delivery window. A later observation is conservatively excluded unless separately reconciled with actual check completion evidence.",
            "Local repair metadata excludes copied application trees, node_modules and raw outputs. Missing/in-progress metadata is not proof no work occurred.",
            "No raw reports, logs, commands, source patches, private paths, credentials, token hashes or account financial records are exported.",
        ],
        "external_operations": 0,
        "provider_operations": 0,
        "runtime_or_accounting_mutations": 0,
    }
    if (
        (run / "recovery-queue-state.json").read_bytes() != state_raw
        or (run / "recovery-journal.jsonl").read_bytes() != journal_raw
        or (run / "workload-release.json").read_bytes() != release_raw
    ):
        raise RuntimeError("source_changed_during_collection_retry")
    return result


def finalize_delivery_clock(result, run, now=None):
    """Close only the observed delivery clock; quality/cost acceptance stays unknown."""
    now = now or datetime.now(UTC)
    state_raw, state = read(run / "recovery-queue-state.json")
    journal_raw = (run / "recovery-journal.jsonl").read_bytes()
    release_raw, release = read(run / "workload-release.json")
    expected = result["source_evidence"]
    if (
        sha(state_raw) != expected["queue_state_sha256"]
        or sha(journal_raw) != expected["queue_journal_sha256"]
    ):
        raise ValueError("snapshot changed before finalization; collect again")
    if sha(release_raw) != expected["workload_release_sha256"]:
        raise ValueError("frozen workload release changed before finalization")
    if not journal_raw.endswith(b"\n"):
        raise ValueError("incomplete journal cannot establish queue closure")
    events = [json.loads(line) for line in journal_raw.splitlines()]
    if not events or events[-1].get("kind") != "integration_queue_stopped":
        raise ValueError("last journal event must establish actual queue stop")
    stopped = events[-1]
    if stopped.get("paused") is not False or state.get("paused") is not False:
        raise ValueError("paused queue requires reconciliation before finalization")
    stop_at = aware(stopped["at_utc"])
    t0 = aware(result["clock"]["T0_utc"])
    cutoff = aware(result["clock"]["delivery_cutoff_utc"])
    if t0 != aware(release["t0_utc"]) or cutoff != aware(
        release["delivery_cutoff_utc"]
    ):
        raise ValueError("result clock differs from frozen workload release")
    if not t0 <= stop_at <= aware(result["as_of_utc"]) <= now:
        raise ValueError("future or invalid queue closure timestamp")
    terminals = {
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
    if set(state.get("tasks", {})) != {f"B{i:03}" for i in range(1, 101)}:
        raise ValueError("all100 task outcomes must be recorded before finalization")
    if any(value.get("status") not in terminals for value in state["tasks"].values()):
        raise ValueError("active or unreconciled task cannot close delivery clock")
    actual_counts = dict(Counter(value["status"] for value in state["tasks"].values()))
    if stopped.get("task_status_counts") != actual_counts:
        raise ValueError("stop event does not match the current terminal task outcomes")
    flag_names = (
        "recovery-ui-review-complete.json",
        "recovery-domain-review-complete.json",
        "recovery-coordinator-repairs-complete.json",
    )
    flag_raw = {}
    for name in flag_names:
        raw, flag = read(run / name)
        flag_raw[name] = raw
        completed = aware(flag["completed_at_utc"])
        if not t0 <= completed <= stop_at:
            raise ValueError("completion flag falls outside the actual queue clock")
        if name == "recovery-coordinator-repairs-complete.json" and (
            flag.get("actor") != "root"
            or flag.get("completed") is not True
            or type(flag.get("new_paid_workers")) is not int
            or flag["new_paid_workers"] != 0
        ):
            raise ValueError("explicit root completion flag is missing or invalid")
    rows = {row["task_id"]: row for row in result["rows"]}
    late = []
    observed_ends = []
    for task, value in state["tasks"].items():
        if value["status"] != "merged_green_provisional":
            continue
        checks = rows[task]["binding_checks"]
        if not checks or not all(
            valid
            for name, valid in checks.items()
            if name != "inside_frozen_delivery_window"
        ):
            raise ValueError("merged task has unverified artifact/review bindings")
        if checks.get("inside_frozen_delivery_window") is not True:
            late.append(task)
        if task not in state.get("post_merge_checks", {}):
            raise ValueError("merged task lacks required post-merge CI evidence")
    for task, value in state.get("post_merge_checks", {}).items():
        if (
            task not in state["tasks"]
            or value.get("status") != "passed"
            or value.get("merged_tree_verified") is not True
            or value.get("requires_coordinator_reconciliation") is not False
        ):
            raise ValueError(
                "pending, failed or unreconciled combined CI cannot close clock"
            )
        observed = aware(value["observed_at_utc"])
        if observed > stop_at:
            raise ValueError("queue closure precedes required combined CI observation")
        observed_ends.append(observed)
    for operation in result.get("operator_phase_operations", []):
        if operation.get("ended_at_utc"):
            observed_ends.append(aware(operation["ended_at_utc"]))
    for validation in result.get("local_validation_attempts", []):
        if validation.get("ended_at_utc"):
            observed_ends.append(aware(validation["ended_at_utc"]))
    for row in result["rows"]:
        recovery = row.get("recovery")
        if recovery:
            for field in (
                "review_finished_at_utc",
                "merged_at_utc",
                "combined_green_observed_at_utc",
            ):
                if recovery.get(field):
                    observed_ends.append(aware(recovery[field]))
    if observed_ends and max(observed_ends) > stop_at:
        raise ValueError(
            "recorded delivery work continued after the purported queue close"
        )
    if (
        (run / "recovery-queue-state.json").read_bytes() != state_raw
        or (run / "recovery-journal.jsonl").read_bytes() != journal_raw
        or (run / "workload-release.json").read_bytes() != release_raw
        or any((run / name).read_bytes() != raw for name, raw in flag_raw.items())
    ):
        raise ValueError("snapshot or owner flags changed during finalization")
    t1 = min(stop_at, cutoff)
    duration = (t1 - t0).total_seconds()
    if duration <= 0:
        raise ValueError("nonpositive completed delivery clock")
    result["measurement_kind"] = (
        "offline_completed_clock_provisional_recovery_delivery_allowlist"
    )
    result["clock"].update(
        T1_utc=t1.isoformat(),
        full_delivery_finished=True,
        completed_delivery_clock_seconds=duration,
        actual_queue_stopped_at_utc=stop_at.isoformat(),
        completed_clock_clipped_to_frozen_cutoff=stop_at >= cutoff,
        completion_basis="Actual final nonpaused queue stop with100 terminal outcomes and completed verified combined CI; clipped to frozen cutoff when reached.",
        quality_and_billing_acceptance_not_established_by_clock_closure=True,
    )
    result["provisional"].update(
        INTERIM_provisional_product_modules_per_hour=None,
        INTERIM_provisional_task_units_per_hour=None,
        PROVISIONAL_product_modules_per_completed_clock_hour=result["provisional"][
            "product_module_units"
        ]
        * 3600
        / duration,
        PROVISIONAL_task_units_per_completed_clock_hour=result["provisional"][
            "qualified_distinct_tasks"
        ]
        * 3600
        / duration,
    )
    result["source_evidence"]["completion_flag_sha256"] = {
        name: sha(raw) for name, raw in flag_raw.items()
    }
    result["source_evidence"]["final_stop_event_sha256"] = sha(
        journal_raw.splitlines()[-1]
    )
    result["completion"] = {
        "delivery_clock_closed": True,
        "final_quality_accepted": None,
        "late_merged_tasks_excluded_from_provisional_credit": late,
        "actual_billed_cost_usd": None,
        "AFK_efficiency_win_proven": False,
        "no_source_or_accounting_state_was_changed": True,
    }
    return result


def validate_public_snapshot(result):
    banned = re.compile(
        r"^(?:token_hash|api_key|account_id|workspace_id|organization_id|thread_id|sandbox_id|command|argv|aggregated_output|worktree|private_key|raw)$"
    )

    def walk(value, key=""):
        if isinstance(value, dict):
            for name, child in value.items():
                if banned.fullmatch(name):
                    raise ValueError("private field in public snapshot")
                walk(child, name)
        elif isinstance(value, list):
            for child in value:
                walk(child, key)
        elif isinstance(value, str):
            if SECRET.search(value.encode()) or re.search(
                r"/home/|/Users/|/tmp/|\b(?:sb|ap|ta|di)-[A-Za-z0-9]{8,}", value
            ):
                raise ValueError("private value in public snapshot")
            if key.endswith("_sha256") and not SHA256.fullmatch(value):
                raise ValueError("invalid evidence hash")
            if key.endswith("_url") and not safe_url(value):
                raise ValueError("invalid public source URL")
            if key.endswith("_at_utc") or key in {
                "as_of_utc",
                "T0_utc",
                "T1_utc",
                "delivery_cutoff_utc",
                "quality_window_end_utc",
            }:
                aware(value)
        elif isinstance(value, float) and not math.isfinite(value):
            raise ValueError("nonfinite public measurement")

    walk(result)
    rows = result["rows"]
    if len(rows) != 100 or {row["task_id"] for row in rows} != {
        f"B{i:03}" for i in range(1, 101)
    }:
        raise ValueError("incomplete original cohort")
    qualified = [row for row in rows if row["provisional_qualified"]]
    if any(
        not row["binding_checks"] or not all(row["binding_checks"].values())
        for row in qualified
    ):
        raise ValueError("unbound provisional delivery")
    if len(qualified) != result["provisional"]["qualified_distinct_tasks"]:
        raise ValueError("provisional count mismatch")
    if (
        sum(row["workload_counts_as_feature_only_not_delivery"] for row in qualified)
        != result["provisional"]["product_module_units"]
    ):
        raise ValueError("feature classification mismatch")
    if result["original_worker_outcomes"]["validated_workers"] != 0:
        raise ValueError("original failed outcomes changed")
    if any(
        result["final_metrics"][key] is not None
        for key in (
            "accepted_feature_items",
            "accepted_green_prs_per_hour",
            "accepted_green_prs_per_dollar",
            "actual_billed_total_usd",
            "eligible_cost_usd",
        )
    ):
        raise ValueError("unverified final metric")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--run", type=Path, required=True)
    parser.add_argument("--batch", type=Path, required=True)
    parser.add_argument("--target", type=Path, required=True)
    parser.add_argument(
        "--finalize",
        action="store_true",
        help="Close the observed clock only after all strict offline completion gates pass",
    )
    args = parser.parse_args()
    for attempt in range(3):
        try:
            result = collect(args.run, args.batch, args.target)
            break
        except RuntimeError:
            if attempt == 2:
                raise
    if args.finalize:
        result = finalize_delivery_clock(result, args.run)
    validate_public_snapshot(result)
    out = args.run / "delivery-allowlists"
    out.mkdir(mode=0o700, exist_ok=True)
    name = "allowlist-" + datetime.now(UTC).strftime("%Y%m%dT%H%M%S.%fZ") + ".json"
    path = out / name
    raw = (json.dumps(result, indent=2) + "\n").encode()
    with path.open("xb") as handle:
        handle.write(raw)
    path.chmod(0o600)
    pointer = {
        "private_pointer_only": True,
        "snapshot_path": str(path.resolve()),
        "snapshot_sha256": sha(raw),
        "as_of_utc": result["as_of_utc"],
    }
    temporary = out / ("latest-private-" + path.stem + ".tmp")
    temporary.write_text(json.dumps(pointer, indent=2) + "\n")
    temporary.chmod(0o600)
    temporary.replace(out / "latest-private.json")
    print(
        json.dumps(
            {
                "snapshot_name": name,
                "snapshot_sha256": sha(raw),
                "provisional": result["provisional"],
                "local_validation_summary": result["local_validation_summary"],
            }
        )
    )


if __name__ == "__main__":
    main()
