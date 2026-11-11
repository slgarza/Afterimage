"""Explicit local recovery of independently reviewed, unchanged FAILED worker output.

Original reports remain byte-identical and are never relabeled validated. This
private lane reuses the normal integrator's ownership/tree/base/CI safeguards,
with separate recovery attribution and no original worker-ledger transition.
"""

import argparse
import hashlib
import json
import os
import re
import sqlite3
import time
from datetime import datetime
from pathlib import Path
from urllib.parse import quote

from swarm_control import pilot_integrate as pi
from swarm_control.pilot_state import common_state
from swarm_control.project import load_project

RUN = Path(os.environ["SWARM_RECOVERY_RUN"]).resolve()
CONTROLLER = Path(os.environ["SWARM_RECOVERY_CONTROLLER_ROOT"]).resolve()
PROFILE = Path(os.environ["SWARM_RECOVERY_PROFILE"]).resolve()
BASE = "79404fe6d4ed5cf1b59b5610a3aebbe9d1f8021f"
CONTROLLER_SHA = "979026cbb0d405623c30cdbf4bcf0c9e937bcf01"
NAMES = ("manifest.json", "report.json", "changes.patch")


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def read(path):
    pi.require(
        path.is_file() and not path.is_symlink() and path.resolve() == path.absolute(),
        "unsafe or missing recovery input",
    )
    return path.read_bytes()


def aware(value):
    parsed = datetime.fromisoformat(value)
    pi.require(parsed.utcoffset() is not None, "timezone-aware timestamp required")
    return parsed


def gate():
    cutoff = aware(
        json.loads(read(RUN / "workload-release.json"))["delivery_cutoff_utc"]
    ).timestamp()
    pi.require(
        time.time() + 30 < cutoff and not (RUN / "integration-control.stop").exists(),
        "delivery deadline or stop",
    )


def frozen(project, path, ref=BASE):
    pi.require(pi.valid_path(path), "unsafe source reference")
    return pi.command(["git", "show", f"{ref}:{path}"], project.root)


def policy_check(project):
    path = common_state(project.root) / "control.sqlite3"
    pi.require(
        path.is_file() and not path.is_symlink(), "original durable ledger missing"
    )
    with sqlite3.connect("file:" + quote(str(path)) + "?mode=ro", uri=True) as db:
        db.execute("PRAGMA query_only=ON")
        row = db.execute(
            "SELECT model_limit_cents,infra_limit_cents FROM budget_policy WHERE singleton=1"
        ).fetchone()
    pi.require(
        row == (project.model_limit_cents, project.infra_limit_cents),
        "profile differs from stored cumulative policy",
    )
    pi.require(
        project.live_enabled is False, "local recovery requires disabled live execution"
    )


def admit(task_id, original, review_path, project):
    pi.require(re.fullmatch(r"B(?:00[1-9]|0[1-9][0-9]|100)", task_id), "invalid B task")
    raw = {name: read(original / name) for name in NAMES}
    manifest, report = json.loads(raw["manifest.json"]), json.loads(raw["report.json"])
    review_raw = read(review_path)
    review = json.loads(review_raw)
    task = manifest["task"]
    pi.require(
        manifest.get("repository") == project.clone_url
        and manifest.get("base_sha") == report.get("base_sha") == BASE,
        "wrong repository or frozen base",
    )
    pi.require(
        task.get("id") == report.get("task_id") == task_id, "task identity mismatch"
    )
    pi.require(
        task == json.loads(frozen(project, f"swarm/tasks/{task_id}.json")),
        "frozen task bytes/contract differ",
    )
    pi.require(
        manifest.get("allow_overlap") is False, "unchanged recovery is direct-only"
    )
    pi.require(
        report.get("status") == "needs_repair"
        and type(report.get("agent_exit")) is int
        and report["agent_exit"] in (-1, 137),
        "original failed worker outcome required",
    )
    pi.require(
        type(report.get("check_exit")) is int and report["check_exit"] == 0,
        "original helper checks must pass; code repair is a separate lane",
    )
    pi.require(
        report.get("sandbox_terminated") is True
        and report.get("recovery_errors") == []
        and not report.get("patch_redacted"),
        "worker recovery or termination unsafe",
    )
    finished = aware(report["finished_at"])
    changes = report.get("changes", {})
    pi.require(
        changes.get("head_unchanged") is True
        and changes.get("ownership_violations") == []
        and changes.get("prohibited_files") == [],
        "unsafe original changes",
    )
    pi.require(
        raw["changes.patch"]
        and changes.get("patch_bytes") == len(raw["changes.patch"]),
        "empty or inconsistent patch",
    )
    paths = changes.get("changed_files")
    pi.require(
        isinstance(paths, list)
        and paths
        and all(
            pi.valid_path(path) and pi.owned(path, task["ownership"]) for path in paths
        ),
        "original ownership mismatch",
    )
    patch_sha, report_sha = sha(raw["changes.patch"]), sha(raw["report.json"])
    pi.require(
        patch_sha == report.get("checked_patch_sha256") == report.get("patch_sha256"),
        "original checked patch digest mismatch",
    )
    expected_reviewer = (
        "launch_packet" if int(task_id[1:]) <= 50 else "preflight_engine"
    )
    pi.require(
        review.get("task_id") == task_id
        and review.get("reviewer") == expected_reviewer
        and review.get("independence") is True
        and review.get("recovered_patch_review") is True
        and review.get("verdict") == "approve_recovered",
        "independent recovered review absent",
    )
    pi.require(
        review.get("original_report_sha256") == report_sha
        and review.get("original_patch_sha256")
        == review.get("reviewed_patch_sha256")
        == patch_sha,
        "recovery review digest mismatch",
    )
    pi.require(
        review.get("original_worker_status") == "needs_repair"
        and review.get("original_worker_exit") == report["agent_exit"]
        and review.get("worker_check_exit") == 0,
        "review outcome binding mismatch",
    )
    pi.require(
        aware(review["reviewed_at_utc"]) >= finished, "review predates completed worker"
    )
    for value in (*raw.values(), review_raw):
        pi.require(not pi.SECRET.search(value), "credential content prohibited")
    source_hashes = {}
    for reference in task["sourceRefs"]:
        path = reference.split("#")[0]
        canonical = frozen(project, path)
        pi.require(
            read(project.root / path) == canonical,
            "local frozen source contract changed",
        )
        source_hashes[path] = sha(canonical)
    binding = {
        "version": 1,
        "kind": "explicit_unchanged_failed_worker_recovery",
        "task_id": task_id,
        "original_batch_id": original.parent.name,
        "original_status": report["status"],
        "original_agent_exit": report["agent_exit"],
        "original_check_exit": report["check_exit"],
        "original_file_sha256": {name: sha(value) for name, value in raw.items()},
        "review_sha256": sha(review_raw),
        "source_sha256": source_hashes,
        "worker_base_sha": BASE,
        "controller_commit": CONTROLLER_SHA,
        "recovery_batch_id": "local-recovery-" + RUN.name,
        "original_reports_rewritten": False,
        "original_worker_success_claimed": False,
    }
    return {
        "task": task,
        "report": report,
        "patch_sha": patch_sha,
        "raw": raw,
        "review_raw": review_raw,
        "binding": binding,
    }


def verify_copy(attempt, admission):
    pi.require(
        json.loads(read(attempt / "recovery-admission.json")) == admission["binding"],
        "recovery attempt binding changed",
    )
    for name in NAMES:
        pi.require(
            read(attempt / name) == admission["raw"][name],
            "original attempt copy changed",
        )
    pi.require(
        read(attempt / "recovery-review.json") == admission["review_raw"],
        "copied review changed",
    )


def verify_candidate(attempt, admission, project, committed=False):
    state = pi.load_review(attempt, admission["patch_sha"], admission["patch_sha"])
    pi.require(
        state.get("application_method") == "direct"
        and state.get("batch_id") == admission["binding"]["recovery_batch_id"],
        "recovery state must remain direct and separately attributed",
    )
    root = pi.candidate(state, admission["task"], committed=committed)
    exact = pi.command(
        [
            "git",
            "-c",
            "core.abbrev=7",
            "diff",
            "--cached",
            "--no-ext-diff",
            "--no-textconv",
            "--no-renames",
            "--binary",
            state["tested_base_sha"],
            "--",
        ],
        root,
    )
    pi.require(
        exact == admission["raw"]["changes.patch"],
        "candidate is not the unchanged original patch",
    )
    for path, expected in admission["binding"]["source_sha256"].items():
        pi.require(
            sha(read(root / path)) == expected,
            "combined candidate source contract changed",
        )
    return state


def write_once(path, raw):
    with os.fdopen(
        os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o400), "wb"
    ) as stream:
        stream.write(raw)


def context(task_id, attempt):
    pi.require(
        attempt.absolute() == RUN / "recovery-attempts" / f"{task_id}-original"
        and attempt.resolve() == attempt.absolute(),
        "unexpected or symlink recovery attempt directory",
    )
    location = json.loads(read(RUN / "batch-location.json"))
    original = Path(location["batch_dir"]) / task_id
    release = json.loads(read(RUN / "workload-release.json"))
    owner_raw = read(RUN / "owner-release.json")
    pi.require(
        json.loads(owner_raw).get("owner_worker_release") is True
        and sha(owner_raw) == release["owner_release_sha256"]
        and release["worker_base_sha"] == BASE
        and release["controller_commit"] == CONTROLLER_SHA,
        "release/pin binding changed",
    )
    pi.require(
        pi.command(["git", "rev-parse", "HEAD"], CONTROLLER).decode().strip()
        == CONTROLLER_SHA,
        "controller revision changed",
    )
    pi.command(["git", "diff", "--quiet", "HEAD", "--", "swarm_control"], CONTROLLER)
    project = load_project(PROFILE)
    project.verify_origin()
    policy_check(project)
    pi.configure(project)
    return project, original, RUN / "reviews/recovery" / f"{task_id}.json"


def execute(phase, task_id, attempt):
    gate()
    project, original, review_path = context(task_id, attempt)
    os.environ["PATH"] = (
        str(RUN / "local-toolchain/node_modules/.bin") + os.pathsep + os.environ["PATH"]
    )

    def current():
        gate()
        policy_check(project)
        value = admit(task_id, original, review_path, project)
        if attempt.exists():
            verify_copy(attempt, value)
        return value

    admission = current()
    if phase == "plan":
        return {
            "task_id": task_id,
            "patch_sha256": admission["patch_sha"],
            "attribution": "unchanged local recovery of failed worker",
            "creates_attempt": False,
            "original_worker_status": "needs_repair",
        }
    real_command, real_github = pi.command, pi.github

    def guarded_command(argv, cwd, **kwargs):
        if argv[:2] == ["git", "push"]:
            current()
            verify_candidate(attempt, admission, project, committed=True)
        return real_command(argv, cwd, **kwargs)

    def guarded_github(path, *, method="GET", body=None):
        if method != "GET":
            current()
            verify_candidate(attempt, admission, project, committed=True)
        if path == "pulls" and method == "POST":
            body = dict(body)
            body["body"] = "\n".join(
                [
                    "Explicit trusted local recovery of unchanged FAILED-worker output.",
                    "",
                    f"Original worker status: needs_repair; agent_exit {admission['report']['agent_exit']}; helper_check_exit 0. The original failed report is unchanged.",
                    "This is assisted recovery with a new independent semantic review and full local validation on the current base; it is not an autonomous worker success.",
                    f"Original batch: {original.parent.name}; original report SHA256: {admission['binding']['original_file_sha256']['report.json']}",
                    f"Original/reviewed patch SHA256: {admission['patch_sha']}; independent review receipt SHA256: {admission['binding']['review_sha256']}",
                    "Original abbreviated-index and applied full-index diff hashes can differ; candidate file changes are verified byte-equivalent with the original diff format.",
                    "Quality-window acceptance and complete cost attribution remain pending.",
                    "",
                    body["body"],
                ]
            )
        return real_github(path, method=method, body=body)

    pi.command, pi.github = guarded_command, guarded_github
    try:
        with pi.integration_lock(common_state(project.root)):
            admission = current()
            if phase == "prepare":
                pi.require(
                    not attempt.exists(),
                    "prepare is single-use; preserve failed attempts and request explicit recovery",
                )
                attempt.mkdir(parents=True, mode=0o700, exist_ok=False)
                for name, raw in admission["raw"].items():
                    write_once(attempt / name, raw)
                write_once(attempt / "recovery-review.json", admission["review_raw"])
                write_once(
                    attempt / "recovery-admission.json",
                    (
                        json.dumps(admission["binding"], sort_keys=True, indent=2)
                        + "\n"
                    ).encode(),
                )
                state = pi.prepare(
                    attempt,
                    admission["task"],
                    admission["report"],
                    admission["patch_sha"],
                )
                state.update(
                    batch_id=admission["binding"]["recovery_batch_id"],
                    delivery_attribution="trusted_local_recovery_of_failed_worker_patch_unchanged",
                    original_worker_status="needs_repair",
                )
                pi.save(attempt / "integration.json", state)
                current()
                verify_candidate(attempt, admission, project)
                return state
            pi.require(attempt.is_dir(), "prepared recovery attempt required")
            state = verify_candidate(
                attempt,
                admission,
                project,
                committed=phase == "merge"
                or json.loads(read(attempt / "integration.json")).get("status")
                == "committed",
            )
            if phase == "publish":
                return pi.publish(
                    attempt, admission["task"], admission["report"], state
                )
            return pi.merge(attempt, admission["task"], state)
    finally:
        pi.command, pi.github = real_command, real_github


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("phase", choices=["plan", "prepare", "publish", "merge"])
    parser.add_argument("task", help="Exact B001-B100 task")
    parser.add_argument("--attempt-dir", type=Path, required=True)
    args = parser.parse_args()
    result = execute(args.phase, args.task, args.attempt_dir)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
