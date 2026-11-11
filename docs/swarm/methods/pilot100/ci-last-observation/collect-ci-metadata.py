"""One current and one final-or-censored read-only CI observation; no sampler."""

import argparse
import collections
import fcntl
import hashlib
import json
import math
import os
import re
import statistics
import subprocess
import time
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import urlencode, urlparse

SHA = re.compile(r"^[a-f0-9]{40}$")
REPO = re.compile(r"^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")
TASK = re.compile(r"^B(?:00[1-9]|0[1-9][0-9]|100)$")
STATUSES = {"queued", "in_progress", "completed", "waiting", "requested", "pending"}
CONCLUSIONS = {
    None,
    "success",
    "failure",
    "neutral",
    "cancelled",
    "skipped",
    "timed_out",
    "action_required",
    "stale",
    "startup_failure",
}


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def utc():
    return datetime.now(UTC).isoformat()


def write_once(path, value):
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    with os.fdopen(
        os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600), "w"
    ) as f:
        json.dump(value, f, indent=2)
        f.write("\n")


def text(value, maximum=160):
    if (
        not isinstance(value, str)
        or not 1 <= len(value) <= maximum
        or re.search(
            r"[\x00-\x1f\x7f]|/home/|/Users/|/tmp/|sk-[A-Za-z0-9_-]{16,}|github_pat_|gh[pousr]_[A-Za-z0-9]{30,}",
            value,
        )
    ):
        raise ValueError("unsafe_public_text")
    return value


def stamp(value):
    if value is None:
        return None
    if not isinstance(value, str):
        raise TypeError("invalid_timestamp")
    try:
        t = datetime.fromisoformat(value)
    except ValueError:
        raise TypeError("invalid_timestamp") from None
    if t.utcoffset() is None:
        raise ValueError("unaware_timestamp")
    return t.astimezone(UTC).isoformat()


def identifier(value):
    if type(value) is not int or not 0 < value < 2**63:
        raise ValueError("invalid_public_ci_id")
    return value


def url(value, repository):
    if value is None:
        return None
    if not isinstance(value, str):
        raise TypeError("invalid_ci_url")
    p = urlparse(value)
    if (
        p.scheme != "https"
        or p.netloc != "github.com"
        or p.fragment
        or p.params
        or p.query not in {"", "check_suite_focus=true"}
    ):
        raise ValueError("unsafe_ci_url")
    prefix = "/" + repository + "/"
    if not p.path.startswith(prefix) or not re.fullmatch(
        r"(?:runs/\d+|actions/runs/\d+(?:/job/\d+)?|commit/[a-f0-9]{40}/checks)",
        p.path[len(prefix) :],
    ):
        raise ValueError("out_of_scope_ci_url")
    return value


def parse_check(row, sha, repository):
    if not isinstance(row, dict):
        raise TypeError("malformed_check_run")
    app = row.get("app")
    if not isinstance(app, dict):
        raise TypeError("malformed_check_app")
    if app.get("slug") != "github-actions":
        return None
    if (
        row.get("head_sha") != sha
        or row.get("status") not in STATUSES
        or row.get("conclusion") not in CONCLUSIONS
    ):
        raise ValueError("check_identity_or_state")
    start, end = stamp(row.get("started_at")), stamp(row.get("completed_at"))
    if start and end and start > end:
        raise ValueError("check_timestamp_order")
    return {
        "id": identifier(row["id"]),
        "name": text(row["name"]),
        "app": "github-actions",
        "head_sha": sha,
        "status": row["status"],
        "conclusion": row["conclusion"],
        "started_at_utc": start,
        "completed_at_utc": end,
        "html_url": url(row.get("html_url"), repository),
        "reported_start_to_complete_seconds": (
            datetime.fromisoformat(end) - datetime.fromisoformat(start)
        ).total_seconds()
        if start and end
        else None,
    }


def parse_check_page(payload, sha, repository):
    if (
        not isinstance(payload, dict)
        or type(payload.get("total_count")) is not int
        or payload["total_count"] < 0
        or not isinstance(payload.get("check_runs"), list)
        or len(payload["check_runs"]) > 100
    ):
        raise ValueError("malformed_check_page")
    rows = payload["check_runs"]
    if any(not isinstance(v, dict) for v in rows):
        raise TypeError("malformed_check_run")
    ids = [identifier(v.get("id")) for v in rows]
    if len(set(ids)) != len(ids) or len(rows) > payload["total_count"]:
        raise ValueError("inconsistent_check_page")
    parsed = [x for row in rows if (x := parse_check(row, sha, repository)) is not None]
    complete = (
        payload["total_count"] == len(rows)
        and bool(parsed)
        and all(
            x["status"] == "completed" and x["conclusion"] is not None for x in parsed
        )
    )
    return {
        "read_complete": complete,
        "reported_total_count": payload["total_count"],
        "github_actions_check_runs": parsed,
        "pagination_truncated": payload["total_count"] > len(rows),
        "non_actions_runs_excluded": len(rows) - len(parsed),
    }


def parse_workflow(row, repository):
    if (
        not isinstance(row, dict)
        or not isinstance(row.get("head_sha"), str)
        or not SHA.fullmatch(row["head_sha"])
        or row.get("status") not in STATUSES
        or row.get("conclusion") not in CONCLUSIONS
    ):
        raise ValueError("malformed_workflow")
    source = row.get("repository")
    if (
        not isinstance(source, dict)
        or not isinstance(source.get("full_name"), str)
        or source["full_name"].lower() != repository.lower()
    ):
        raise ValueError("workflow_repository_mismatch")
    return {
        "id": identifier(row["id"]),
        "name": text(row["name"]) if row.get("name") is not None else None,
        "head_sha": row["head_sha"],
        "status": row["status"],
        "conclusion": row["conclusion"],
        "created_at_utc": stamp(row.get("created_at")),
        "run_started_at_utc": stamp(row.get("run_started_at")),
        "updated_at_utc": stamp(row.get("updated_at")),
        "html_url": url(row.get("html_url"), repository),
        "runner_queue_seconds": None,
        "api_queue_seconds": None,
    }


class ReadBudget:
    def __init__(self, root, limit=200):
        if type(limit) is not int or not 1 <= limit <= 200:
            raise ValueError("read_budget_out_of_bounds")
        self.root = root
        root.mkdir(parents=True, exist_ok=True, mode=0o700)
        self.path = root / "request-attempts.jsonl"
        self.limit = limit
        if (self.root / "budget.json").exists():
            if (
                json.loads((self.root / "budget.json").read_text())["global_get_limit"]
                != limit
            ):
                raise ValueError("persistent_budget_changed")
        else:
            write_once(self.root / "budget.json", {"global_get_limit": limit})

    def used(self):
        if not self.path.exists():
            return 0
        raw = self.path.read_bytes()
        if raw and not raw.endswith(b"\n"):
            raise ValueError("partial_read_budget_journal")
        rows = raw.splitlines()
        for n, line in enumerate(rows, 1):
            try:
                r = json.loads(line)
            except ValueError:
                raise ValueError("corrupt_read_budget_journal") from None
            if (
                not isinstance(r, dict)
                or r.get("sequence") != n
                or type(r.get("sequence")) is not int
                or r.get("method") != "GET"
                or not re.fullmatch(r"[a-f0-9]{64}", r.get("endpoint_sha256", ""))
            ):
                raise ValueError("corrupt_read_budget_journal")
            stamp(r.get("attempted_at_utc"))
        if len(rows) > self.limit:
            raise ValueError("read_budget_already_exceeded")
        return len(rows)

    def reserve(self, endpoint):
        used = self.used()
        if used >= self.limit:
            raise ValueError("global_get_budget_exhausted")
        with os.fdopen(
            os.open(self.path, os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o600), "a"
        ) as f:
            f.write(
                json.dumps(
                    {
                        "sequence": used + 1,
                        "attempted_at_utc": utc(),
                        "endpoint_sha256": digest(endpoint.encode()),
                        "method": "GET",
                    }
                )
                + "\n"
            )
            f.flush()
            os.fsync(f.fileno())


class RawResponse:
    def __init__(self, body, success=True):
        self.body = body
        self.success = success


def gh_get(endpoint):
    p = subprocess.run(
        ["gh", "api", "--method", "GET", endpoint],
        capture_output=True,
        timeout=45,
        check=False,
    )
    return RawResponse(p.stdout, p.returncode == 0)


class Reader:
    def __init__(
        self,
        repository,
        budget,
        client=gh_get,
        raw_root=None,
        require_retained_sources=False,
    ):
        if not REPO.fullmatch(repository):
            raise ValueError("invalid_repository")
        self.repository = repository
        self.budget = budget
        self.client = client
        self.raw_root = raw_root or budget.root / "private-inputs"
        self.require_retained_sources = require_retained_sources
        self.latest_source = None

    def get(self, path):
        endpoint = f"repos/{self.repository}/{path}"
        self.latest_source = None
        self.budget.reserve(endpoint)
        response = self.client(endpoint)
        if not isinstance(response, RawResponse):
            self.latest_source = {
                "original_body_retained_private": False,
                "response_body_sha256": None,
                "request_endpoint_sha256": digest(endpoint.encode()),
            }
            return response
        if not isinstance(response.body, bytes):
            raise TypeError("invalid_raw_response_bytes")
        body_sha = digest(response.body)
        self.raw_root.mkdir(parents=True, exist_ok=True, mode=0o700)
        target = self.raw_root / (body_sha + ".json-body")
        if target.exists():
            if target.read_bytes() != response.body:
                raise ValueError("private_response_body_hash_collision")
        else:
            with os.fdopen(
                os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600), "wb"
            ) as f:
                f.write(response.body)
                f.flush()
                os.fsync(f.fileno())
        self.latest_source = {
            "original_body_retained_private": True,
            "response_body_sha256": body_sha,
            "request_endpoint_sha256": digest(endpoint.encode()),
            "response_headers_recorded": False,
        }
        if not response.success:
            raise ValueError("github_get_failed")
        try:
            return json.loads(response.body)
        except ValueError:
            raise ValueError("github_json_invalid") from None

    def source_bound_check_cache(self, d, sha):
        source = d.get("response_source", {})
        if source.get("original_body_retained_private") is not True or source.get(
            "request_endpoint_sha256"
        ) != digest(
            f"repos/{self.repository}/commits/{sha}/check-runs?per_page=100".encode()
        ):
            return False
        body_sha = source.get("response_body_sha256")
        if not isinstance(body_sha, str) or not re.fullmatch(r"[a-f0-9]{64}", body_sha):
            return False
        p = self.raw_root / (body_sha + ".json-body")
        if not p.exists():
            return False
        raw = p.read_bytes()
        if digest(raw) != body_sha:
            return False
        try:
            return parse_check_page(json.loads(raw), sha, self.repository) == d.get(
                "check_observation"
            )
        except (ValueError, KeyError, TypeError):
            return False

    def checks(self, sha):
        if not SHA.fullmatch(sha):
            raise ValueError("invalid_commit")
        parent = self.budget.root / "commits" / sha
        for p in sorted(parent.glob("*.json"), reverse=True):
            d = json.loads(p.read_text())
            if (
                d.get("repository") == self.repository
                and d.get("sha") == sha
                and d.get("check_observation", {}).get("read_complete") is True
                and (
                    not self.require_retained_sources
                    or self.source_bound_check_cache(d, sha)
                )
            ):
                return d, True
        at = utc()
        try:
            observation = parse_check_page(
                self.get(f"commits/{sha}/check-runs?per_page=100"), sha, self.repository
            )
        except (
            ValueError,
            KeyError,
            TypeError,
            TimeoutError,
            subprocess.TimeoutExpired,
        ):
            observation = {
                "read_complete": False,
                "error_code": "github_check_read_incomplete",
                "github_actions_check_runs": [],
            }
        d = {
            "repository": self.repository,
            "sha": sha,
            "observed_at_utc": at,
            "check_observation": observation,
            "response_source": self.latest_source,
            "cache_semantics": "Historical observed IDs only; not proof of latest24h status or absence of future reruns.",
        }
        raw = json.dumps(d, sort_keys=True).encode()
        name = (
            datetime.now(UTC).strftime("%Y%m%dT%H%M%S.%fZ")
            + "-"
            + digest(raw)[:12]
            + ".json"
        )
        write_once(parent / name, d)
        return d, False

    def workflows(self, since):
        rows = []
        seen = set()
        total = None
        complete = False
        error = None
        pages = 0
        sources = []
        for page in range(1, 4):
            try:
                p = self.get(
                    "actions/runs?"
                    + urlencode(
                        {"created": ">=" + stamp(since), "per_page": 100, "page": page}
                    )
                )
                if self.latest_source:
                    sources.append({"page": page, **self.latest_source})
                if (
                    not isinstance(p, dict)
                    or type(p.get("total_count")) is not int
                    or p["total_count"] < 0
                    or not isinstance(p.get("workflow_runs"), list)
                    or len(p["workflow_runs"]) > 100
                ):
                    raise ValueError("malformed_workflow_page")
                if total is not None and total != p["total_count"]:
                    raise ValueError("workflow_pagination_changed")
                total = p["total_count"]
                pages += 1
                for v in p["workflow_runs"]:
                    row = parse_workflow(v, self.repository)
                    if row["id"] in seen:
                        raise ValueError("workflow_repeated_id")
                    seen.add(row["id"])
                    rows.append(row)
                if len(rows) > total:
                    raise ValueError("workflow_total_inconsistent")
                if len(rows) == total:
                    complete = True
                    break
                if len(p["workflow_runs"]) != 100:
                    raise ValueError("workflow_pagination_incomplete")
            except (
                ValueError,
                KeyError,
                TypeError,
                TimeoutError,
                subprocess.TimeoutExpired,
            ):
                if self.latest_source and not any(s["page"] == page for s in sources):
                    sources.append({"page": page, **self.latest_source})
                error = "workflow_metadata_incomplete"
                break
        return {
            "read_complete": complete,
            "pages_read": pages,
            "page_limit": 3,
            "error_code": error,
            "workflow_runs": rows,
            "response_sources": sources,
        }


def select_commits(state):
    selected = {}

    def add(task, value, historical=False):
        if not TASK.fullmatch(task):
            raise ValueError("invalid_source_task")
        for key, role in [("head_sha", "head"), ("merge_commit_sha", "merge")]:
            sha = value.get(key)
            if not isinstance(sha, str) or not SHA.fullmatch(sha):
                raise ValueError("source_commit_missing")
            selected.setdefault(sha, []).append(
                {
                    "task_id": task,
                    "role": role,
                    "historical_corrective_credit0": historical,
                    "additional_feature_credit": 0 if historical else None,
                }
            )

    for task, value in state.get("tasks", {}).items():
        post = state.get("post_merge_checks", {}).get(task, {})
        if (
            value.get("status") == "merged_green_provisional"
            and post.get("status") == "passed"
            and value.get("merged_tree_verified") is True
            and post.get("merged_tree_verified") is True
            and post.get("requires_coordinator_reconciliation") is False
        ):
            add(task, value)
    for value in state.get("task_history", {}).get("B003", []):
        if (
            value.get("merged_tree_verified") is True
            and value.get("merged_at")
            and value.get("merge_commit_sha")
        ):
            add("B003", value, True)
    if len(selected) > 128:
        raise ValueError("unexpected_commit_scope")
    return selected


def head_wait_event_observations(journal_raw):
    events = []
    for line in journal_raw.splitlines():
        try:
            event = json.loads(line)
        except ValueError:
            continue
        if not isinstance(event, dict) or event.get("kind") != "head_ci_wait_finished":
            continue
        status = event.get("status")
        status = (
            status
            if isinstance(status, str) and status in {"passed", "pending", "failed"}
            else "unknown"
        )
        duration = event.get("wall_seconds")
        duration = (
            duration
            if type(duration) in (int, float)
            and math.isfinite(duration)
            and duration >= 0
            else None
        )
        task = event.get("task_id")
        task = task if isinstance(task, str) and TASK.fullmatch(task) else None
        events.append(
            {
                "status": status,
                "duration": duration,
                "task": task,
                "reconciliation": event.get("coordinator_ci_reconciliation") is True,
                "overlap": event.get("prior_pending_segment_overlaps_this_total")
                is True
                or event.get("durations_are_not_additive") is True,
            }
        )
    durations = [event["duration"] for event in events if event["duration"] is not None]
    return {
        "event_count": len(events),
        "duration_observation_count": len(durations),
        "distinct_tasks_with_events": len(
            {event["task"] for event in events if event["task"]}
        ),
        "outcome_counts": dict(
            collections.Counter(event["status"] for event in events)
        ),
        "median_raw_event_seconds": statistics.median(durations) if durations else None,
        "coordinator_reconciliation_event_count": sum(
            event["reconciliation"] for event in events
        ),
        "explicit_overlap_event_count": sum(event["overlap"] for event in events),
        "durations_are_not_additive": True,
        "summed_duration_seconds": None,
        "meaning": "Recorded head_ci_wait_finished event observations, including pending/failed outcomes and possibly overlapping reconciliation totals. Raw-event median is neither a distinct-task median nor an all-green wait metric. Durations can include workflow execution, scheduling, API/transport, polling and coordinator pause; they are not isolated GitHub API queue time.",
        "runner_queue_seconds": None,
        "api_queue_seconds": None,
    }


def collect(run, repository, phase, client=gh_get):
    if phase not in {"current", "final", "censored"}:
        raise ValueError("invalid_snapshot_phase")
    cache = run / "ci-metadata-cache"
    cache.mkdir(mode=0o700, exist_ok=True)
    with os.fdopen(
        os.open(
            cache / "collector.lock", os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o600
        ),
        "a",
    ) as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        marker = cache / f"{phase}-invocation.json"
        if marker.exists():
            raise ValueError("explicit_snapshot_phase_already_invoked")
        last_marker = cache / "last-observation-invocation.json"
        if any(
            path.exists()
            for path in (
                last_marker,
                cache / "final-invocation.json",
                cache / "censored-invocation.json",
            )
        ):
            raise ValueError("last_authorized_observation_already_invoked")
        state_raw = (run / "recovery-queue-state.json").read_bytes()
        journal_raw = (run / "recovery-journal.jsonl").read_bytes()
        release_raw = (run / "workload-release.json").read_bytes()
        private_inputs = run / "ci-metadata" / "private-inputs"
        private_inputs.mkdir(parents=True, exist_ok=True, mode=0o700)
        for raw in (state_raw, journal_raw, release_raw):
            source_sha = digest(raw)
            target = private_inputs / (source_sha + ".run-input")
            if target.exists():
                if target.read_bytes() != raw:
                    raise ValueError("private_run_input_hash_collision")
            else:
                with os.fdopen(
                    os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600), "wb"
                ) as f:
                    f.write(raw)
        state = json.loads(state_raw)
        release = json.loads(release_raw)
        commits = select_commits(state)
        if phase == "censored":
            cutoff = stamp(release.get("delivery_cutoff_utc"))
            if cutoff is None or datetime.now(UTC) < datetime.fromisoformat(cutoff):
                raise ValueError("censored_observation_requires_actual_frozen_cutoff")
        if phase == "final":
            last = (
                json.loads(journal_raw.splitlines()[-1])
                if journal_raw.endswith(b"\n") and journal_raw
                else {}
            )
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
            tasks = state.get("tasks", {})
            if (
                set(tasks) != {f"B{i:03}" for i in range(1, 101)}
                or state.get("paused") is not False
                or last.get("kind") != "integration_queue_stopped"
                or last.get("paused") is not False
                or any(v.get("status") not in terminals for v in tasks.values())
                or last.get("task_status_counts")
                != dict(collections.Counter(v["status"] for v in tasks.values()))
            ):
                raise ValueError("final_snapshot_requires_stopped_cohort")
        started = utc()
        tick = time.monotonic()
        if phase != "current":
            write_once(
                last_marker,
                {
                    "phase": phase,
                    "started_at_utc": started,
                    "source_state_sha256": digest(state_raw),
                    "completed_workload_clock_authority": False,
                },
            )
        write_once(
            marker,
            {
                "phase": phase,
                "started_at_utc": started,
                "source_state_sha256": digest(state_raw),
            },
        )
        budget = ReadBudget(cache)
        reader = Reader(
            repository,
            budget,
            client,
            raw_root=run / "ci-metadata" / "private-inputs",
            require_retained_sources=phase != "current",
        )
        before = budget.used()
        workflow = (
            reader.workflows(release["t0_utc"])
            if commits
            else {
                "read_complete": True,
                "pages_read": 0,
                "page_limit": 3,
                "error_code": None,
                "workflow_runs": [],
            }
        )
        rows = []
        hits = 0
        for sha, roles in sorted(commits.items()):
            check, hit = reader.checks(sha)
            hits += hit
            matching = [x for x in workflow["workflow_runs"] if x["head_sha"] == sha]
            rows.append(
                {
                    "sha": sha,
                    "roles": roles,
                    "check_observation": check["check_observation"],
                    "response_source": check.get(
                        "response_source",
                        {
                            "original_body_retained_private": False,
                            "response_body_sha256": None,
                        },
                    ),
                    "check_observed_at_utc": check["observed_at_utc"],
                    "check_cache_hit": hit,
                    "workflow_runs": matching,
                    "workflow_metadata_read_complete": workflow["read_complete"]
                    and bool(matching),
                    "workflow_metadata_not_found": not matching,
                }
            )
        wait_observations = head_wait_event_observations(journal_raw)
        result = {
            "schema_version": 1,
            "kind": "read_only_github_ci_metadata_observations",
            "repository": repository,
            "phase": phase,
            "observation_classification": "supporting_censored_last_observation"
            if phase == "censored"
            else "supporting_terminal_cohort_observation"
            if phase == "final"
            else "supporting_intermediate_observation",
            "is_last_authorized_observation": phase != "current",
            "source_task_entry_count": len(state.get("tasks", {})),
            "full_delivery_completion_claimed": False,
            "completed_workload_T1_utc": None,
            "quality_window_acceptance": None,
            "frozen_delivery_cutoff_utc": stamp(release.get("delivery_cutoff_utc")),
            "observation_started_at_utc": started,
            "observation_finished_at_utc": utc(),
            "monotonic_elapsed_seconds": round(time.monotonic() - tick, 6),
            "source_snapshot": {
                "queue_state_sha256": digest(state_raw),
                "journal_sha256": digest(journal_raw),
                "workload_release_sha256": digest(release_raw),
                "queue_changed_during_gets": (
                    run / "recovery-queue-state.json"
                ).read_bytes()
                != state_raw,
                "journal_changed_during_gets": (
                    run / "recovery-journal.jsonl"
                ).read_bytes()
                != journal_raw,
                "workload_release_changed_during_gets": (
                    run / "workload-release.json"
                ).read_bytes()
                != release_raw,
                "atomic_snapshot_claimed": False,
                "original_run_input_bytes_retained_private": True,
            },
            "request_budget": {
                "global_get_limit": 200,
                "used_before_this_snapshot": before,
                "used_this_snapshot": budget.used() - before,
                "used_total": budget.used(),
                "remaining": 200 - budget.used(),
            },
            "unique_commit_count": len(rows),
            "historical_check_cache_hits": hits,
            "workflow_page_read": {
                k: v for k, v in workflow.items() if k != "workflow_runs"
            },
            "commits": rows,
            "operator_head_ci_wait_observations": wait_observations,
            "limits": [
                "Completed cached check runs are historical observations of IDs; not evidence of latest24h state or absence of future reruns.",
                "Check started-to-completed is a reported check interval, not isolated runner CPU execution. Workflow created/run_started/updated are source timestamps; updated is not relabeled completed.",
                "Workflow list is bounded to3 pages and can change while a queue runs; incomplete or missing metadata stays unknown.",
                "GitHub metadata is supporting CI timing evidence, not semantic delivery, billing or24h quality acceptance.",
                "Original API response bodies, when retained, remain private and are referenced only by SHA-256. They are hashed and retained before JSON derivation; headers and stderr are not retained.",
            ],
            "github_mutations": 0,
            "paid_or_model_operations": 0,
            "continuous_sampler": False,
        }
        safe = json.dumps(result)
        if re.search(
            r"/home/|/Users/|/tmp/|sk-[A-Za-z0-9_-]{16,}|github_pat_|gh[pousr]_[A-Za-z0-9]{30,}",
            safe,
        ):
            raise ValueError("unsafe_export_value")
        out = run / "ci-metadata-allowlists"
        out.mkdir(mode=0o700, exist_ok=True)
        name = (
            f"ci-{phase}-" + datetime.now(UTC).strftime("%Y%m%dT%H%M%S.%fZ") + ".json"
        )
        write_once(out / name, result)
        return out / name, result


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--run", type=Path, required=True)
    p.add_argument("--repository", required=True)
    p.add_argument("--phase", choices=["current", "final", "censored"], required=True)
    a = p.parse_args()
    path, r = collect(a.run.resolve(), a.repository, a.phase)
    print(
        json.dumps(
            {
                "snapshot_name": path.name,
                "sha256": digest(path.read_bytes()),
                "commits": r["unique_commit_count"],
                "budget": r["request_budget"],
                "source_changed_during_gets": r["source_snapshot"][
                    "queue_changed_during_gets"
                ],
            }
        )
    )
