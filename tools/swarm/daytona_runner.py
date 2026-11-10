#!/usr/bin/env python3
"""Daytona execution adapter for the Afterimage swarm pilot.

This program deliberately does not contain an LLM credential or perform GitHub
writes. It proves the provider boundary: create an isolated worker computer,
prepare an exact copy of the repository, execute a bounded command, capture
the evidence, then destroy the sandbox.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import uuid
from dataclasses import asdict, dataclass
from pathlib import Path

from daytona import Daytona


REPOSITORY = "https://github.com/slgarza/Afterimage.git"
ROOT = Path(__file__).resolve().parents[2]
RUNS = ROOT / ".swarm" / "daytona-runs"


@dataclass
class RunReport:
    run_id: str
    mode: str
    sandbox_id: str | None
    started_at: int
    finished_at: int | None = None
    exit_code: int | None = None
    output: str | None = None
    error: str | None = None


def write_report(report: RunReport) -> Path:
    RUNS.mkdir(parents=True, exist_ok=True)
    path = RUNS / f"{report.run_id}.json"
    path.write_text(json.dumps(asdict(report), indent=2) + "\n", encoding="utf-8")
    return path


def result_value(result: object, field: str, fallback: object = None) -> object:
    return getattr(result, field, fallback)


def execute_smoke(daytona: Daytona, report: RunReport) -> None:
    sandbox = daytona.create(timeout=90)
    report.sandbox_id = result_value(sandbox, "id")
    write_report(report)
    try:
        result = sandbox.process.exec(
            "set -eu; printf 'pwd='; pwd; printf 'home='; printf '%s\\n' \"$HOME\"; printf 'node='; node --version; printf 'npm='; npm --version; printf 'git='; git --version",
            timeout=60,
        )
        report.exit_code = int(result_value(result, "exit_code", 1))
        report.output = str(result_value(result, "result", result_value(result, "output", "")))
    finally:
        sandbox.delete()


def execute_prepare(daytona: Daytona, report: RunReport, task_id: str) -> None:
    task_path = ROOT / "tools" / "swarm" / "tasks" / f"{task_id}.json"
    if not task_path.exists():
        raise ValueError(f"unknown task: {task_id}")
    task = json.loads(task_path.read_text(encoding="utf-8"))
    sandbox = daytona.create(timeout=90)
    report.sandbox_id = result_value(sandbox, "id")
    write_report(report)
    try:
        command = " && ".join(
            [
                "set -eu",
                "mkdir -p \"$HOME/work\"",
                f"git clone --depth 1 --branch main {REPOSITORY} \"$HOME/work/afterimage\"",
                "cd \"$HOME/work/afterimage\"",
                f"git switch -c swarm/{task['id'].lower()}",
                "node --version",
                "npm --version",
                "git status --short --branch",
            ]
        )
        result = sandbox.process.exec(command, timeout=180)
        report.exit_code = int(result_value(result, "exit_code", 1))
        report.output = str(result_value(result, "result", result_value(result, "output", "")))
    finally:
        sandbox.delete()


def main() -> int:
    parser = argparse.ArgumentParser(description="Afterimage Daytona swarm adapter")
    parser.add_argument("mode", choices=["smoke", "prepare"])
    parser.add_argument("task_id", nargs="?", help="required for prepare")
    args = parser.parse_args()

    if not os.environ.get("DAYTONA_API_KEY"):
        parser.error("DAYTONA_API_KEY is required; use tools/swarm/run_daytona.sh on this Mac")
    if args.mode == "prepare" and not args.task_id:
        parser.error("prepare requires a task id")

    report = RunReport(
        run_id=f"daytona-{args.mode}-{uuid.uuid4().hex[:12]}",
        mode=args.mode if not args.task_id else f"{args.mode}:{args.task_id}",
        sandbox_id=None,
        started_at=int(time.time()),
    )
    try:
        # The currently installed stable SDK is v0.x and does not implement a
        # context manager. Keep this adapter compatible with that release;
        # sandbox lifecycle is still explicitly handled in the run functions.
        daytona = Daytona()
        if args.mode == "smoke":
            execute_smoke(daytona, report)
        else:
            execute_prepare(daytona, report, args.task_id)
    except Exception as error:  # report the provider error without ever printing credentials
        report.error = f"{type(error).__name__}: {error}"
        print(report.error, file=sys.stderr)
    finally:
        report.finished_at = int(time.time())
        path = write_report(report)
        print(path)
    return 0 if report.error is None and report.exit_code == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
