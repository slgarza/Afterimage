import argparse
import hashlib
import json
import os
import sqlite3
import time
from datetime import datetime
from pathlib import Path

from swarm_control import pilot_integrate as pi
from swarm_control.pilot_state import common_state
from swarm_control.project import load_project

RUN = Path(os.environ["SWARM_RECOVERY_RUN"]).resolve()
BATCH = Path(json.loads((RUN / "batch-location.json").read_text())["batch_dir"])
DIRECTORY = None
TASK = None
os.environ["PATH"] = (
    str(RUN / "local-toolchain/node_modules/.bin") + os.pathsep + os.environ["PATH"]
)


def digest(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def gate():
    cutoff = datetime.fromisoformat(
        json.loads((RUN / "workload-release.json").read_text())["delivery_cutoff_utc"]
    ).timestamp()
    pi.require(
        time.time() + 30 < cutoff and not (RUN / "integration-control.stop").exists(),
        "delivery deadline or stop",
    )


def admit():
    original = BATCH / TASK
    manifest = json.loads((original / "manifest.json").read_text())
    report = json.loads((original / "report.json").read_text())
    repair = json.loads((DIRECTORY / "repair.json").read_text())
    receipt = RUN / "reviews/repairs" / f"{TASK}.json"
    review = json.loads(receipt.read_text())
    expected_reviewer = "launch_packet" if int(TASK[1:]) <= 50 else "preflight_engine"
    pi.require(
        report["task_id"] == TASK
        and report["status"] == "needs_repair"
        and type(report["agent_exit"]) is int
        and report["agent_exit"] in [-1, 137]
        and type(report["check_exit"]) is int
        and report["check_exit"] in [0, 1]
        and report["sandbox_terminated"] is True
        and report["recovery_errors"] == [],
        "unexpected original worker outcome",
    )
    pi.require(
        report["changes"]["head_unchanged"] is True
        and report["changes"]["ownership_violations"] == []
        and report["changes"]["prohibited_files"] == []
        and not report.get("patch_redacted"),
        "unsafe original worker changes",
    )
    for orig, copy in [
        ("manifest.json", "manifest.json"),
        ("report.json", "original-report.json"),
        ("changes.patch", "original-worker.patch"),
    ]:
        pi.require(
            (original / orig).read_bytes() == (DIRECTORY / copy).read_bytes(),
            "original changed or copied incorrectly",
        )
    origsha = digest(original / "changes.patch")
    newsha = digest(DIRECTORY / "changes.patch")
    deltasha = digest(DIRECTORY / "coordinator-delta.patch")
    reportsha = digest(original / "report.json")
    pi.require(
        origsha
        == report["checked_patch_sha256"]
        == report["patch_sha256"]
        == repair["original_patch_sha256"]
        == review["original_patch_sha256"],
        "original patch binding",
    )
    pi.require(
        reportsha
        == repair["original_report_sha256"]
        == review["original_report_sha256"],
        "original report binding",
    )
    pi.require(
        newsha == repair["repaired_patch_sha256"] == review["reviewed_patch_sha256"],
        "new patch review binding",
    )
    pi.require(
        deltasha
        == repair["coordinator_delta_sha256"]
        == review["coordinator_delta_sha256"],
        "repair delta binding",
    )
    pi.require(
        review["task_id"] == TASK
        and review["reviewer"] == expected_reviewer
        and review["verdict"] == "approve_repaired"
        and review["independence"] is True,
        "independent repaired review absent",
    )
    pi.require(
        datetime.fromisoformat(review["reviewed_at_utc"]).utcoffset() is not None,
        "unaware review",
    )
    pi.require(
        manifest["repository"] == "https://github.com/slgarza/Afterimage.git"
        and manifest["base_sha"]
        == report["base_sha"]
        == "79404fe6d4ed5cf1b59b5610a3aebbe9d1f8021f",
        "source identity",
    )
    pi.require(
        manifest["task"]["id"] == TASK
        and manifest["task"]
        == json.loads(
            pi.git(pi.ROOT, "show", f"{report['base_sha']}:swarm/tasks/{TASK}.json")
        ),
        "frozen task identity",
    )
    pi.require(
        isinstance(repair["changed_by_coordinator"], list)
        and repair["changed_by_coordinator"]
        and all(
            pi.valid_path(p) and pi.owned(p, manifest["task"]["ownership"])
            for p in repair["changed_by_coordinator"]
        ),
        "unexpected coordinator ownership",
    )
    pi.require(
        repair["actor"] == "root"
        and type(repair["production_code_changed_by_coordinator"]) is bool
        and repair["full_validation_passed"] is True,
        "unexpected repair",
    )
    pi.require(
        not pi.SECRET.search((DIRECTORY / "changes.patch").read_bytes())
        and not pi.SECRET.search((DIRECTORY / "coordinator-delta.patch").read_bytes()),
        "secret prohibited",
    )
    return manifest["task"], report, newsha, review, repair


def validate_policy(project):
    path = common_state(project.root) / "control.sqlite3"
    pi.require(
        project.live_enabled is False and path.is_file(),
        "recovery requires disabled execution and existing durable ledger",
    )
    with sqlite3.connect(path.resolve().as_uri() + "?mode=ro", uri=True) as db:
        db.execute("PRAGMA query_only=ON")
        rows = db.execute(
            "SELECT model_limit_cents,infra_limit_cents FROM budget_policy WHERE singleton=1"
        ).fetchall()
    pi.require(
        rows == [(project.model_limit_cents, project.infra_limit_cents)],
        "selected recovery profile differs from durable budget policy",
    )


def main():
    global TASK, DIRECTORY
    parser = argparse.ArgumentParser()
    parser.add_argument("phase", choices=["plan", "prepare", "publish", "merge"])
    parser.add_argument("task")
    parser.add_argument("--attempt-dir", type=Path, required=True)
    args = parser.parse_args()
    TASK = args.task
    DIRECTORY = args.attempt_dir.resolve()
    phase = args.phase
    pi.require(
        TASK in [f"B{x:03}" for x in range(1, 101)]
        and DIRECTORY.is_relative_to((RUN / "coordinator-repairs").resolve()),
        "invalid explicit repair identity or directory",
    )
    gate()
    project = load_project(Path(os.environ["SWARM_RECOVERY_PROFILE"]).resolve())
    project.verify_origin()
    pi.configure(project)
    task, report, sha, review, repair = admit()
    realgithub = pi.github
    realcommand = pi.command

    def guarded_command(argv, cwd, **kwargs):
        if argv[:2] == ["git", "push"]:
            gate()
            validate_policy(project)
            admit()
        return realcommand(argv, cwd, **kwargs)

    def guarded_github(path, *, method="GET", body=None):
        if method != "GET":
            gate()
            validate_policy(project)
            admit()
        if path == "pulls" and method == "POST":
            body = dict(body)
            body["body"] = "\n".join(
                [
                    "Explicit coordinator repair of a failed worker patch.",
                    "",
                    f"The original worker remains needs_repair (agent_exit {report['agent_exit']}, final_check_exit {report['check_exit']}). Coordinator root repair: {repair['summary']} This is assisted recovery, not an autonomous worker success.",
                    f"Original worker patch SHA256: {repair['original_patch_sha256']}",
                    f"Original report SHA256: {repair['original_report_sha256']}",
                    f"Coordinator delta SHA256: {repair['coordinator_delta_sha256']}",
                    f"Independent reviewer: {review['reviewer']}; reviewed repaired patch SHA256: {sha}",
                    f"Original batch: {BATCH.name}; target/controller pins remain recorded in the pilot report.",
                    "Local scoped checks and the full validation passed; this integration reruns all configured checks on the current base.",
                    "Quality observation remains provisional for24h after actual merge. See https://github.com/slgarza/Afterimage/issues/237 for all100 original outcomes and cost unknowns.",
                    "",
                    body["body"],
                ]
            )
        return realgithub(path, method=method, body=body)

    pi.command = guarded_command
    pi.github = guarded_github
    with pi.integration_lock(common_state(project.root)):
        validate_policy(project)
        if phase == "plan":
            result = {
                "task_id": TASK,
                "repair_patch_sha256": sha,
                "source": "explicit_coordinator_code_or_test_repair",
            }
        elif phase == "prepare":
            result = pi.prepare(DIRECTORY, task, report, sha)
        else:
            state = pi.load_review(DIRECTORY, sha, sha)
            pi.require(
                state.get("application_method") == "direct",
                "threeway requires a new explicit review",
            )
            result = (
                pi.publish(DIRECTORY, task, report, state)
                if phase == "publish"
                else pi.merge(DIRECTORY, task, state)
            )
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
