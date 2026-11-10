#!/usr/bin/env python3
"""Bounded Modal workers with recoverable patches; GitHub writes stay with the integrator."""

import argparse
import fcntl
import hashlib
import json
import re
import subprocess
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager
from datetime import UTC, datetime
from pathlib import Path

from modal_worker import valid_path

ROOT = Path(__file__).resolve().parents[2]
REPOSITORY = "https://github.com/slgarza/Afterimage.git"
APP = "afterimage-swarm-pilot"
SECRET = "afterimage-openai"
ARTIFACTS = (
    "changes.patch",
    "changes.json",
    "checks.log",
    "install.log",
    "versions.json",
    "last-message.txt",
)


def now():
    return datetime.now(UTC).isoformat()


def write_json(path, data):
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps(data, indent=2) + "\n")
    temporary.replace(path)


def load_task(task_id):
    if not re.fullmatch(r"[A-Z][A-Z0-9_-]{1,39}", task_id):
        raise ValueError("invalid task ID")
    task = json.loads((ROOT / "tools/swarm/tasks" / f"{task_id}.json").read_text())
    if task.get("id") != task_id:
        raise ValueError("task ID differs from its filename")
    for key in ("title", "prompt"):
        if not isinstance(task.get(key), str) or not task[key].strip():
            raise ValueError(f"{task_id}: missing {key}")
    if (
        not isinstance(task.get("ownership"), list)
        or not task["ownership"]
        or not all(valid_path(path) for path in task["ownership"])
    ):
        raise ValueError(f"{task_id}: ownership must contain repository-relative paths")
    if (
        not isinstance(task.get("acceptance"), list)
        or not task["acceptance"]
        or not all(
            isinstance(value, str) and value.strip() for value in task["acceptance"]
        )
    ):
        raise ValueError(f"{task_id}: missing acceptance criteria")
    if task.get("dependsOn", []):
        raise ValueError(
            f"{task_id}: dependent tasks need a verified integration ledger; not supported yet"
        )
    return task


def overlaps(left, right):
    return any(
        a == b or a.startswith(b + "/") or b.startswith(a + "/")
        for a in left
        for b in right
    )


def validate_batch(tasks, workers):
    if not 1 <= workers <= 100:
        raise ValueError("workers must be between 1 and 100")
    for index, task in enumerate(tasks):
        for previous in tasks[:index]:
            if task["id"] == previous["id"] or overlaps(
                task["ownership"], previous["ownership"]
            ):
                raise ValueError(f"overlapping tasks: {previous['id']} / {task['id']}")


def redact(text):
    return re.sub(r"\bsk-[A-Za-z0-9_-]{16,}", "[REDACTED_OPENAI_KEY]", text)


def eligible_result(agent_exit, check_exit, changes):
    return (
        agent_exit == 0
        and check_exit == 0
        and changes.get("patch_bytes", 0) > 0
        and changes.get("head_unchanged") is True
        and changes.get("ownership_violations") == []
        and changes.get("prohibited_files") == []
    )


def prompt_for(task):
    return (
        "Read README.md, AGENTS.md and docs/SWARM_PILOT.md before editing.\n"
        "Read the relevant architecture/product docs. You own ONE ticket.\n"
        "Implement the acceptance criteria and run relevant checks.\n"
        "Do not commit, push, open PRs, change branches, read credentials, or spawn other agents.\n"
        "Do not edit outside the listed ownership. If a dependency or specification is missing, "
        "report it rather than inventing requirements. Preserve original IP.\n"
        "Return a concise handoff: changes, validation, unresolved limitations.\n\n"
        + json.dumps(task, indent=2)
    )


def codex_command(model):
    return [
        "codex",
        "exec",
        "--json",
        "--ephemeral",
        "--ignore-user-config",
        "--model",
        model,
        "--sandbox",
        "danger-full-access",
        "-c",
        'approval_policy="never"',
        "-c",
        'shell_environment_policy.exclude=["CODEX_API_KEY","OPENAI_API_KEY"]',
        "--cd",
        "/workspace/repo",
        "--output-last-message",
        "/artifacts/last-message.txt",
        "-",
    ]


@contextmanager
def controller_lock(state):
    """A single dispatcher per checkout; prevents concurrent duplicate batches locally."""
    state.mkdir(parents=True, exist_ok=True)
    with (state / "modal-controller.lock").open("a") as handle:
        try:
            fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise ValueError(
                "another Modal dispatcher is active for this checkout"
            ) from None
        try:
            yield
        finally:
            fcntl.flock(handle, fcntl.LOCK_UN)


def consume(process, directory, name):
    """Drain both streams to avoid pipe stalls. Persist events without printing agent text."""

    def drain(stream, path):
        with path.open("w") as output:
            for line in stream:
                output.write(redact(line))
                output.flush()

    with ThreadPoolExecutor(max_workers=2) as pool:
        stdout = pool.submit(drain, process.stdout, directory / f"{name}.jsonl")
        stderr = pool.submit(drain, process.stderr, directory / f"{name}.stderr.log")
        process.wait()
        stdout.result()
        stderr.result()
    return process.returncode


def execute_task(task, args, base_sha, batch, image, app, secret):
    import modal

    started = time.monotonic()
    directory = batch / task["id"]
    directory.mkdir()
    manifest = {
        "repository": REPOSITORY,
        "base_sha": base_sha,
        "task": task,
        "branch": f"swarm/{task['id'].lower()}-{batch.name[-12:]}",
    }
    report = {
        "task_id": task["id"],
        "base_sha": base_sha,
        "branch": manifest["branch"],
        "model": args.model if args.command == "run" else None,
        "started_at": now(),
        "status": "starting",
        "sandbox_id": None,
        "agent_exit": None,
        "check_exit": None,
        "merged": False,
        "infra_cost_usd": None,
        "model_cost_usd": None,
    }
    write_json(directory / "manifest.json", manifest)
    write_json(directory / "report.json", report)
    sandbox = None
    try:
        sandbox = modal.Sandbox.create(
            app=app,
            image=image,
            timeout=args.timeout + 600,
            runtime="vm",
            cpu=(0.5, 2.0),
            memory=(512, 2048),
            tags={"batch": batch.name, "ticket": task["id"], "mode": args.command},
        )
        report.update(sandbox_id=sandbox.object_id, status="preparing")
        write_json(directory / "report.json", report)
        sandbox.filesystem.write_text(json.dumps(manifest), "/tmp/task.json")
        helper = ["python3", "/opt/swarm/modal_worker.py"]
        process = sandbox.exec(*helper, "prepare", "/tmp/task.json", timeout=240)
        if consume(process, directory, "prepare") != 0:
            raise RuntimeError("repository setup failed; see install/prepare logs")
        if args.command == "run":
            report.update(status="working", agent_started_at=now())
            write_json(directory / "report.json", report)
            process = sandbox.exec(
                *codex_command(args.model), secrets=[secret], timeout=args.timeout
            )
            process.stdin.write(prompt_for(task) + "\n")
            process.stdin.write_eof()
            process.stdin.drain()
            report["agent_exit"] = consume(process, directory, "agent")
            report["agent_finished_at"] = now()
        process = sandbox.exec(*helper, "collect", "/tmp/task.json", timeout=30)
        if consume(process, directory, "collect") != 0:
            raise RuntimeError("could not capture changes")
        changes = json.loads(sandbox.filesystem.read_text("/artifacts/changes.json"))
        report["changes"] = changes
        report["checked_patch_sha256"] = hashlib.sha256(
            sandbox.filesystem.read_bytes("/artifacts/changes.patch")
        ).hexdigest()
        if (
            changes["ownership_violations"]
            or changes["prohibited_files"]
            or not changes["head_unchanged"]
        ):
            report["status"] = "rejected"
        else:
            report["status"] = "checking"
            write_json(directory / "report.json", report)
            process = sandbox.exec(*helper, "check", "/tmp/task.json", timeout=240)
            report["check_exit"] = consume(process, directory, "check")
            if args.command == "smoke":
                report["status"] = (
                    "smoke_passed" if report["check_exit"] == 0 else "failed"
                )
            else:
                report["status"] = (
                    "validated"
                    if eligible_result(
                        report["agent_exit"], report["check_exit"], changes
                    )
                    else "needs_repair"
                )
    except Exception as error:  # noqa: BLE001 - provider failures must still recover and terminate
        report.update(status="failed", error=redact(f"{type(error).__name__}: {error}"))
    finally:
        if sandbox is not None:
            # Also recover partially completed work after errors/timeouts, before termination.
            recovery_errors = []
            try:
                process = sandbox.exec(
                    "python3",
                    "/opt/swarm/modal_worker.py",
                    "collect",
                    "/tmp/task.json",
                    timeout=30,
                )
                if consume(process, directory, "recovery") != 0:
                    recovery_errors.append("collection_failed")
            except Exception as error:  # noqa: BLE001 - best-effort recovery before termination
                recovery_errors.append(type(error).__name__)
            for name in ARTIFACTS:
                try:
                    content = sandbox.filesystem.read_bytes(f"/artifacts/{name}")
                    sanitized = redact(content.decode("utf-8", errors="replace"))
                    (directory / name).write_text(sanitized)
                    if name == "changes.patch" and sanitized.encode() != content:
                        report["status"] = "rejected"
                        report["patch_redacted"] = True
                except (
                    FileNotFoundError,
                    modal.exception.SandboxFilesystemNotFoundError,
                ):
                    continue
                except Exception as error:  # noqa: BLE001 - record provider retrieval failures
                    recovery_errors.append(f"{name}: {type(error).__name__}")
            patch = directory / "changes.patch"
            if patch.exists():
                report["patch_sha256"] = hashlib.sha256(patch.read_bytes()).hexdigest()
                if report["status"] in {"validated", "smoke_passed"} and (
                    report["patch_sha256"] != report.get("checked_patch_sha256")
                ):
                    report["status"] = "needs_repair"
                    report["error"] = (
                        "checks modified the candidate patch; review and rerun"
                    )
            else:
                report["status"] = "failed"
                recovery_errors.append("patch_missing")
            if report["status"] in {"validated", "smoke_passed"}:
                for required in (
                    "changes.json",
                    "checks.log",
                    "install.log",
                    "versions.json",
                ):
                    if not (directory / required).is_file():
                        recovery_errors.append(f"{required}: missing")
            report["recovery_errors"] = recovery_errors
            if recovery_errors and report["status"] in {"validated", "smoke_passed"}:
                report["status"] = "needs_recovery"
            try:
                sandbox.terminate()
                report["sandbox_terminated"] = True
            except Exception as error:  # noqa: BLE001 - preserve evidence of failed cleanup
                report["sandbox_terminated"] = False
                report["termination_error"] = type(error).__name__
        report.update(
            finished_at=now(), wall_seconds=round(time.monotonic() - started, 3)
        )
        usage = []
        events = directory / "agent.jsonl"
        if events.exists():
            for line in events.read_text().splitlines():
                try:
                    event = json.loads(line)
                    if event.get("type") == "turn.completed":
                        usage.append(event.get("usage", {}))
                except json.JSONDecodeError:
                    continue
        report["token_usage"] = usage
        write_json(directory / "report.json", report)
        print(
            json.dumps(
                {
                    "task": task["id"],
                    "status": report["status"],
                    "report": str(directory / "report.json"),
                }
            ),
            flush=True,
        )
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["plan", "smoke", "run"])
    parser.add_argument("tasks", nargs="+")
    parser.add_argument("--workers", type=int, default=1)
    parser.add_argument(
        "--timeout", type=int, default=600, help="agent time limit in seconds"
    )
    parser.add_argument("--model", help="explicit OpenAI model ID for a real agent run")
    parser.add_argument("--environment", default="main")
    parser.add_argument(
        "--base", default="origin/main", help="reviewed commit or local Git ref"
    )
    args = parser.parse_args()
    if not 30 <= args.timeout <= 1800:
        parser.error("timeout must be between 30 and 1800 seconds")
    if args.command == "run" and not args.model:
        parser.error("run requires --model")
    tasks = [load_task(task) for task in args.tasks]
    validate_batch(tasks, args.workers)
    base_sha = subprocess.check_output(
        ["git", "rev-parse", "--verify", f"{args.base}^{{commit}}"], cwd=ROOT, text=True
    ).strip()
    plan = {
        "base_sha": base_sha,
        "tasks": [task["id"] for task in tasks],
        "requested_workers": args.workers,
        "maximum_active_agents": min(args.workers, len(tasks)),
        "enough_tasks_for_100": len(tasks) >= 100 and args.workers >= 100,
        "agent_timeout_seconds": args.timeout,
        "mode": args.command,
    }
    if args.command == "plan":
        print(json.dumps(plan, indent=2))
        return 0
    import modal

    with controller_lock(ROOT / ".swarm"):
        app = modal.App.lookup(
            APP, environment_name=args.environment, create_if_missing=False
        )
        secret = None
        if args.command == "run":
            secret = modal.Secret.from_name(
                SECRET,
                environment_name=args.environment,
                required_keys=["CODEX_API_KEY"],
            )
            try:
                # Fail before building an image or provisioning any worker.
                secret.hydrate()
            except modal.exception.NotFoundError:
                raise ValueError(
                    f"Modal secret {SECRET!r} is missing; run tools/swarm/setup_openai.py first"
                ) from None
        image = (
            modal.Image.from_registry("node:24.6.0-bookworm-slim", add_python="3.12")
            .apt_install("git", "ripgrep", "ca-certificates")
            .run_commands("npm install --global npm@11.16.0 @openai/codex@0.166.0")
            .add_local_file(
                Path(__file__).with_name("modal_worker.py"),
                "/opt/swarm/modal_worker.py",
            )
        )
        batch = ROOT / ".swarm/modal-runs" / ("batch-" + uuid.uuid4().hex[:12])
        batch.mkdir(parents=True)
        write_json(batch / "plan.json", plan)
        print(f"Evidence: {batch}", flush=True)
        with ThreadPoolExecutor(max_workers=min(args.workers, len(tasks))) as pool:
            futures = [
                pool.submit(
                    execute_task, task, args, base_sha, batch, image, app, secret
                )
                for task in tasks
            ]
            reports = [future.result() for future in futures]
        return (
            0
            if all(
                report["status"] in {"validated", "smoke_passed"} for report in reports
            )
            else 1
        )


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (ValueError, FileNotFoundError) as error:
        raise SystemExit(str(error)) from None
