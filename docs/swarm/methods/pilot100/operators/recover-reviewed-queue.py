import hashlib
import json
import os
import signal
import subprocess
import time
import uuid
from datetime import UTC, datetime
from pathlib import Path

RUN = Path(os.environ["SWARM_RECOVERY_RUN"]).resolve()
BATCH = Path(json.loads((RUN / "batch-location.json").read_text())["batch_dir"])
REPO = Path(os.environ["SWARM_RECOVERY_TARGET_ROOT"]).resolve()
CONTROLLER = Path(os.environ["SWARM_RECOVERY_CONTROLLER_ROOT"]).resolve()
PROFILE = Path(os.environ["SWARM_RECOVERY_PROFILE"]).resolve()
PYTHON = str(CONTROLLER / ".venv/bin/python")
PHASE_HELPER = RUN / "recover-reviewed-phase.py"
REPAIR_HELPER = RUN / "repair-reviewed-phase.py"
ATTEMPTS = RUN / "recovery-attempts"
ATTEMPTS.mkdir(mode=0o700, exist_ok=True)
os.environ["PATH"] = (
    str(RUN / "local-toolchain/node_modules/.bin") + os.pathsep + os.environ["PATH"]
)
CUTOFF = datetime.fromisoformat(
    json.loads((RUN / "workload-release.json").read_text())["delivery_cutoff_utc"]
).timestamp()
OUT = RUN / "recovery-operations"
OUT.mkdir(mode=0o700, exist_ok=True)
REVIEW = RUN / "reviews/recovery"
REVIEW.mkdir(mode=0o700, exist_ok=True)
JOURNAL = RUN / "recovery-journal.jsonl"
STATE = RUN / "recovery-queue-state.json"
state = {"tasks": {}, "post_merge_checks": {}, "paused": False}
if STATE.exists():
    state = json.loads(STATE.read_text())


def utc():
    return datetime.now(UTC).isoformat()


def save():
    tmp = STATE.with_suffix(".tmp")
    tmp.write_text(json.dumps(state, indent=2) + "\n")
    os.chmod(tmp, 0o600)
    tmp.replace(STATE)


def event(kind, **fields):
    data = {"at_utc": utc(), "kind": kind, **fields}
    fd = os.open(JOURNAL, os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o600)
    with os.fdopen(fd, "a") as f:
        f.write(json.dumps(data) + "\n")
        f.flush()
        os.fsync(f.fileno())
    print(json.dumps(data), flush=True)


def operation(task, label, argv, timeout=600):
    token = uuid.uuid4().hex[:10]
    prefix = OUT / f"{task}-{label}-{token}"
    start = time.monotonic()
    at = utc()
    child_started = False
    with prefix.with_suffix(".log").open("xb") as output:
        os.chmod(prefix.with_suffix(".log"), 0o600)
        remaining = CUTOFF - time.time()
        if (
            remaining <= 0
            or (RUN / "integration-control.stop").exists()
            or (label in ["publish", "merge"] and remaining < 30)
        ):
            code = 125
            output.write(
                b"Operation refused before process start: stop marker or insufficient delivery window.\n"
            )
        else:
            proc = subprocess.Popen(
                argv,
                cwd=CONTROLLER,
                stdout=output,
                stderr=subprocess.STDOUT,
                start_new_session=True,
            )
            child_started = True
            try:
                code = proc.wait(timeout=min(timeout, remaining))
            except subprocess.TimeoutExpired:
                os.killpg(proc.pid, signal.SIGTERM)
                try:
                    proc.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    os.killpg(proc.pid, signal.SIGKILL)
                    proc.wait()
                code = 124
    log = prefix.with_suffix(".log").read_bytes()
    receipt = {
        "task_id": task,
        "operation": label,
        "started_at_utc": at,
        "ended_at_utc": utc(),
        "wall_seconds": time.monotonic() - start,
        "return_code": code,
        "child_started": child_started,
        "command_sha256": hashlib.sha256(json.dumps(argv).encode()).hexdigest(),
        "output_sha256": hashlib.sha256(log).hexdigest(),
    }
    path = prefix.with_suffix(".json")
    path.write_text(json.dumps(receipt, indent=2) + "\n")
    os.chmod(path, 0o600)
    event("operation_finished", **receipt)
    return code, log, path


def query(path):
    r = subprocess.run(  # noqa: PLW1510  # Retain original implicit check=False; return code is inspected.
        ["gh", "api", "--method", "GET", f"repos/slgarza/Afterimage/{path}"],
        capture_output=True,
        text=True,
        timeout=40,
        cwd=REPO,
    )
    if r.returncode:
        raise RuntimeError("github_read_failed")
    return json.loads(r.stdout)


def checks(head):
    entries = []
    total = None
    ids = set()
    for page in range(1, 101):
        p = query(f"commits/{head}/check-runs?per_page=100&page={page}")
        expected = p.get("total_count")
        rows = p.get("check_runs")
        if (
            type(expected) is not int
            or not isinstance(rows, list)
            or len(rows) > 100
            or (total is not None and expected != total)
        ):
            raise RuntimeError("invalid_check_pagination")
        total = expected
        for row in rows:
            if row.get("id") in ids:
                raise RuntimeError("repeated_check_id")
            ids.add(row.get("id"))
        entries.extend(rows)
        if len(entries) == total:
            break
        if len(entries) > total or len(rows) != 100:
            raise RuntimeError("incomplete_check_pagination")
    else:
        raise RuntimeError("check_pagination_limit")
    actions = [x for x in entries if x.get("app", {}).get("slug") == "github-actions"]
    if any(
        x.get("status") == "completed" and x.get("conclusion") != "success"
        for x in actions
    ):
        return "failed", p
    if not actions or not {"checks"} <= {x.get("name") for x in actions}:
        return "pending", p
    if all(
        x.get("status") == "completed"
        and x.get("conclusion") == "success"
        and x.get("head_sha") == head
        for x in actions
    ):
        return "passed", p
    return "pending", p


def sample_post_merges():
    for task, value in list(state["post_merge_checks"].items()):
        if value.get("status") in ["passed", "failed"]:
            continue
        try:
            status, payload = checks(value["merge_commit_sha"])  # noqa: RUF059  # Retain exact original unpacking; payload is deliberately unused.
        except Exception as error:  # noqa: BLE001  # Preserve original fail-closed/read-observation exception boundary.
            event(
                "post_merge_read_error", task_id=task, error_type=type(error).__name__
            )
            continue
        value.update(status=status, observed_at_utc=utc())
        if status == "passed":
            verified = value.get("merged_tree_verified") is True and not value.get(
                "requires_coordinator_reconciliation"
            )
            if verified:
                state["tasks"][task].update(
                    status="merged_green_provisional",
                    combined_green_observed_at_utc=utc(),
                )
                event(
                    "combined_merge_checks_green",
                    task_id=task,
                    merge_commit_sha=value["merge_commit_sha"],
                    pr_url=value["pr_url"],
                )
            else:
                state["tasks"][task].update(
                    combined_ci_status="passed",
                    acceptance_blocked_by_reconciliation=True,
                )
                event(
                    "combined_ci_green_but_acceptance_blocked",
                    task_id=task,
                    merge_commit_sha=value["merge_commit_sha"],
                )
        if status == "failed":
            state["paused"] = True
            if not value.get("requires_coordinator_reconciliation"):
                state["tasks"][task].update(status="merged_combined_ci_failed")
            event(
                "stop_on_red_combined_main",
                task_id=task,
                merge_commit_sha=value["merge_commit_sha"],
            )
    save()


def approved(task):
    path = REVIEW / f"{task}.json"
    if not path.exists():
        return None
    try:
        r = json.loads(path.read_text())
    except ValueError:
        return None
    if r.get("verdict") != "approve_recovered":
        return None
    expected = "launch_packet" if int(task[1:]) <= 50 else "preflight_engine"
    if (
        r.get("reviewer") != expected
        or r.get("independence") is not True
        or r.get("task_id") != task
        or r.get("recovered_patch_review") is not True
    ):
        raise RuntimeError("invalid_recovery_reviewer_binding")
    d = BATCH / task
    raw = (d / "report.json").read_bytes()
    report = json.loads(raw)
    patch = (d / "changes.patch").read_bytes()
    sha = hashlib.sha256(patch).hexdigest()
    # Only unchanged failed-worker output with a successful helper check enters this lane.
    if report.get("check_exit") != 0:
        return None
    if (
        report.get("status") != "needs_repair"
        or report.get("agent_exit") not in [-1, 137]
        or not patch
        or not report.get("finished_at")
        or report.get("recovery_errors")
        or report.get("sandbox_terminated") is not True
    ):
        raise RuntimeError("recovered_worker_not_eligible")
    if (
        sha != r.get("original_patch_sha256")
        or sha != r.get("reviewed_patch_sha256")
        or sha != report.get("checked_patch_sha256")
        or sha != report.get("patch_sha256")
    ):
        raise RuntimeError("reviewed_recovery_patch_mismatch")
    if (
        hashlib.sha256(raw).hexdigest() != r.get("original_report_sha256")
        or r.get("original_worker_status") != report["status"]
        or r.get("original_worker_exit") != report["agent_exit"]
    ):
        raise RuntimeError("original_report_binding_failed")
    if datetime.fromisoformat(r["reviewed_at_utc"]).utcoffset() is None:
        raise RuntimeError("review_timestamp_missing_timezone")
    return sha, hashlib.sha256(path.read_bytes()).hexdigest()


def approved_repair(task):
    path = RUN / "reviews/repairs" / f"{task}.json"
    if not path.exists():
        return None
    r = json.loads(path.read_text())
    if r.get("verdict") != "approve_repaired":
        return None
    expected = "launch_packet" if int(task[1:]) <= 50 else "preflight_engine"
    if (
        r.get("task_id") != task
        or r.get("reviewer") != expected
        or r.get("independence") is not True
    ):
        raise RuntimeError("invalid_repair_reviewer")
    if datetime.fromisoformat(r["reviewed_at_utc"]).utcoffset() is None:
        raise RuntimeError("unaware_repair_review")
    original = BATCH / task
    raw = (original / "report.json").read_bytes()
    report = json.loads(raw)
    if (
        report.get("status") != "needs_repair"
        or hashlib.sha256(raw).hexdigest() != r.get("original_report_sha256")
        or hashlib.sha256((original / "changes.patch").read_bytes()).hexdigest()
        != r.get("original_patch_sha256")
    ):
        raise RuntimeError("invalid_original_repair_binding")
    matches = []
    for directory in (RUN / "coordinator-repairs").glob(f"{task}-*"):
        if (
            not (directory / "repair.json").is_file()
            or not (directory / "changes.patch").is_file()
        ):
            continue
        author = json.loads((directory / "repair.json").read_text())
        sha = hashlib.sha256((directory / "changes.patch").read_bytes()).hexdigest()
        if sha != r.get("reviewed_patch_sha256"):
            continue
        if (
            author.get("actor") != "root"
            or author.get("task_id") != task
            or author.get("full_validation_passed") is not True
        ):
            raise RuntimeError("unvalidated_coordinator_repair")
        if hashlib.sha256(
            (directory / "coordinator-delta.patch").read_bytes()
        ).hexdigest() != r.get("coordinator_delta_sha256"):
            raise RuntimeError("repair_delta_mismatch")
        matches.append((sha, hashlib.sha256(path.read_bytes()).hexdigest(), directory))
    if len(matches) > 1:
        raise RuntimeError("ambiguous_repair_attempt")
    return matches[0] if matches else None


assert (
    json.loads((RUN / "owner-release.json").read_text())["owner_worker_release"] is True
)
needs_reconciliation = {
    task: value.get("status")
    for task, value in state["tasks"].items()
    if value.get("status")
    in [
        "integrating",
        "waiting_head_ci",
        "merge_outcome_requires_reconciliation",
        "merge_tree_requires_reconciliation",
    ]
}
if needs_reconciliation:
    state["paused"] = True
    save()
    event(
        "startup_reconciliation_required",
        tasks=needs_reconciliation,
        automatic_mutation_retry=False,
    )
    raise SystemExit(2)
event(
    "explicit_local_recovery_queue_started",
    original_worker_outcomes_preserved=True,
    original_worker_validated_count=0,
    source_controller_runtime_unchanged=True,
    batch_id=BATCH.name,
    cutoff_utc=datetime.fromtimestamp(CUTOFF, UTC).isoformat(),
    new_paid_workers=False,
)
while time.time() < CUTOFF and not (RUN / "integration-control.stop").exists():
    sample_post_merges()
    if state["paused"]:
        break
    chosen = None
    if not (RUN / "publication-initial-merged.json").exists():
        time.sleep(10)
        continue
    for task in [f"B{x:03}" for x in range(1, 101)]:
        if (
            task in state["tasks"]
            and state["tasks"][task].get("status")
            != "post_merge_quality_defect_requires_repair"
        ):
            continue
        if (
            int(task[1:]) <= 50
            and not (RUN / "recovery-ui-palette-review-complete.json").exists()
        ):
            continue
        try:
            review = approved(task)
            repair_review = None if review else approved_repair(task)
        except Exception as error:  # noqa: BLE001  # Preserve original fail-closed/read-observation exception boundary.
            state["tasks"][task] = {
                "status": "review_binding_failed",
                "error_type": type(error).__name__,
                "at_utc": utc(),
            }
            event(
                "review_binding_failed", task_id=task, error_type=type(error).__name__
            )
            save()
            continue
        if review:
            chosen = (task, *review, "unchanged", ATTEMPTS / f"{task}-original")
            break
        if repair_review:
            sha, reviewsha, directory = repair_review
            if task in state["tasks"] and sha == state["tasks"][task].get(
                "patch_sha256"
            ):
                continue
            chosen = (task, sha, reviewsha, "coordinator_repair", directory)
            break
    if chosen is None:
        if all(
            (RUN / name).exists()
            for name in [
                "recovery-ui-review-complete.json",
                "recovery-domain-review-complete.json",
                "recovery-coordinator-repairs-complete.json",
            ]
        ):
            terminal = []
            for task in [f"B{x:03}" for x in range(1, 101)]:
                if task in state["tasks"]:
                    continue
                path = BATCH / task / "report.json"
                rev = REVIEW / f"{task}.json"
                if path.exists():
                    report = json.loads(path.read_text())
                    if not report.get("changes", {}).get("patch_bytes"):
                        terminal.append((task, "original_empty_patch"))
                    elif report.get("check_exit") != 0:
                        terminal.append(
                            (task, "original_check_failed_requires_code_repair")
                        )
                if rev.exists():
                    try:
                        r = json.loads(rev.read_text())
                    except ValueError:
                        continue
                    if r.get("verdict") == "reject":
                        terminal.append((task, "independent_review_rejected"))
            for task, status in terminal:
                state["tasks"][task] = {"status": status, "at_utc": utc()}
                event("task_not_integrated", task_id=task, status=status)
            save()
            if len(state["tasks"]) == 100 and all(
                x.get("status") in ["passed", "failed"]
                for x in state["post_merge_checks"].values()
            ):
                break
        time.sleep(10)
        continue
    task, sha, reviewsha, lane, d = chosen
    phase_helper = PHASE_HELPER if lane == "unchanged" else REPAIR_HELPER
    if task in state["tasks"]:
        state.setdefault("task_history", {}).setdefault(task, []).append(
            dict(state["tasks"][task])
        )
        event(
            "quality_corrective_attempt_admitted_without_additional_feature_credit",
            task_id=task,
            prior_pr_url=state["tasks"][task].get("pr_url"),
        )
    state["tasks"][task] = {
        "status": "integrating",
        "patch_sha256": sha,
        "review_receipt_sha256": reviewsha,
        "delivery_attribution": "trusted_local_recovery_of_failed_worker_patch_unchanged"
        if lane == "unchanged"
        else "coordinator_code_or_test_repair",
        "original_worker_status": "needs_repair",
        "started_at_utc": utc(),
    }
    save()
    event(
        "independent_review_admitted",
        task_id=task,
        patch_sha256=sha,
        review_receipt_sha256=reviewsha,
    )
    failure = False
    for phase in ["plan", "prepare", "publish"]:
        argv = [PYTHON, str(phase_helper), phase, task, "--attempt-dir", str(d)]
        code, log, receipt = operation(task, phase, argv)
        if code:
            state["tasks"][task].update(
                status=f"{phase}_failed", ended_at_utc=utc(), receipt=str(receipt)
            )
            save()
            failure = True
            break
    if failure:
        continue
    integ = json.loads((d / "integration.json").read_text())
    state["tasks"][task].update(
        status="waiting_head_ci",
        pr_url=integ["pr_url"],
        pr_number=integ["pr_number"],
        head_sha=integ["head_sha"],
    )
    save()
    event(
        "reviewed_pr_published",
        task_id=task,
        pr_url=integ["pr_url"],
        head_sha=integ["head_sha"],
    )
    ci_start = time.monotonic()
    polls = 0
    ci_status = "pending"
    while time.time() < CUTOFF and not (RUN / "integration-control.stop").exists():
        sample_post_merges()
        if state["paused"]:
            break
        polls += 1
        try:
            ci_status, payload = checks(integ["head_sha"])
        except Exception as error:  # noqa: BLE001  # Preserve original fail-closed/read-observation exception boundary.
            event("head_ci_read_error", task_id=task, error_type=type(error).__name__)
            time.sleep(15)
            continue
        if ci_status != "pending":
            break
        time.sleep(15)
    event(
        "head_ci_wait_finished",
        task_id=task,
        status=ci_status,
        wall_seconds=time.monotonic() - ci_start,
        polls=polls,
    )
    if ci_status != "passed" or state["paused"]:
        state["tasks"][task].update(
            status="head_ci_failed_or_cutoff", ended_at_utc=utc()
        )
        save()
        continue
    code, log, receipt = operation(
        task,
        "merge",
        [PYTHON, str(phase_helper), "merge", task, "--attempt-dir", str(d)],
    )
    if code:
        state["paused"] = True
        state["tasks"][task].update(
            status="merge_outcome_requires_reconciliation",
            ended_at_utc=utc(),
            receipt=str(receipt),
        )
        observed = None
        try:
            observed = query(f"pulls/{integ['pr_number']}")
            if observed.get("merged") is True and observed.get("merge_commit_sha"):
                state["post_merge_checks"][task] = {
                    "status": "pending",
                    "merge_commit_sha": observed["merge_commit_sha"],
                    "pr_url": integ["pr_url"],
                    "requires_coordinator_reconciliation": True,
                }
                state["tasks"][task].update(
                    merge_commit_sha=observed["merge_commit_sha"],
                    actual_merge_observed=True,
                )
        except Exception as error:  # noqa: BLE001  # Preserve original fail-closed/read-observation exception boundary.
            event(
                "merge_reconciliation_read_error",
                task_id=task,
                error_type=type(error).__name__,
            )
        event(
            "stop_on_uncertain_merge",
            task_id=task,
            return_code=code,
            actual_merge_observed=bool(observed and observed.get("merged")),
            automatic_mutation_retry=False,
        )
        save()
        break
    integ = json.loads((d / "integration.json").read_text())
    merged_tree_verified = False
    try:
        commit = query(f"git/commits/{integ['merge_commit_sha']}")
        if commit.get("tree", {}).get("sha") != integ["tested_tree"]:
            raise RuntimeError("merged_tree_differs_from_validated_tree")
        merged_tree_verified = True
    except Exception as error:  # noqa: BLE001  # Preserve original fail-closed/read-observation exception boundary.
        state["paused"] = True
        event(
            "merged_tree_verification_failed",
            task_id=task,
            error_type=type(error).__name__,
        )
    state["tasks"][task].update(
        status="merged_pending_combined_ci"
        if merged_tree_verified
        else "merge_tree_requires_reconciliation",
        ended_at_utc=utc(),
        merge_commit_sha=integ["merge_commit_sha"],
        merged_at=integ["merged_at"],
        merged_tree_verified=merged_tree_verified,
    )
    state["post_merge_checks"][task] = {
        "status": "pending",
        "merge_commit_sha": integ["merge_commit_sha"],
        "pr_url": integ["pr_url"],
        "merged_tree_verified": merged_tree_verified,
        "requires_coordinator_reconciliation": not merged_tree_verified,
    }
    save()
    event(
        "reviewed_head_merged",
        task_id=task,
        pr_url=integ["pr_url"],
        merge_commit_sha=integ["merge_commit_sha"],
    )
sample_post_merges()
save()
event(
    "integration_queue_stopped",
    paused=state["paused"],
    task_status_counts={
        x: sum(v["status"] == x for v in state["tasks"].values())
        for x in set(v["status"] for v in state["tasks"].values())  # noqa: C401  # Retain original expression for faithful operator snapshot.
    },
    cutoff_reached=time.time() >= CUTOFF,
)
