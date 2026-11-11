"""Offline allowlist analysis; parse original JSON, never execute log commands."""

import argparse
import hashlib
import json
import re
import shlex
import subprocess
import tomllib
from collections import Counter, defaultdict
from datetime import UTC, datetime
from pathlib import Path


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def timestamp(value):
    if value is None:
        return None
    parsed = datetime.fromisoformat(value)
    if parsed.utcoffset() is None:
        raise ValueError("naive evidence timestamp")
    return parsed.timestamp()


def utc(value):
    return None if value is None else datetime.fromtimestamp(value, UTC).isoformat()


def merge_intervals(intervals):
    result = []
    for start, end in sorted(intervals):
        if start is None or end is None or end <= start:
            continue
        if result and start <= result[-1][1]:
            result[-1] = (result[-1][0], max(result[-1][1], end))
        else:
            result.append((start, end))
    return result


def overlap(intervals_by_task, threshold=100):
    changes = defaultdict(int)
    for values in intervals_by_task.values():
        for start, end in merge_intervals(values):
            changes[start] += 1
            changes[end] -= 1
    current = peak = 0
    previous = None
    seconds = 0.0
    spans = []
    for point, delta in sorted(changes.items()):
        if previous is not None and current >= threshold:
            seconds += point - previous
            if spans and spans[-1][1] == previous:
                spans[-1] = (spans[-1][0], point)
            else:
                spans.append((previous, point))
        current += delta
        peak = max(peak, current)
        previous = point
    return {
        "peak_distinct_tasks": peak,
        "seconds_at_or_above_100": seconds,
        "intervals_at_or_above_100": [
            {"started_at_utc": utc(a), "ended_at_utc": utc(b), "seconds": b - a}
            for a, b in spans
        ],
    }


def payload(command):
    try:
        words = shlex.split(command)
        for flag in ("-lc", "-c"):
            if len(words) > 2 and words[1] == flag:
                return words[2]
    except ValueError:
        pass
    return command


def classify(command, documents):
    text = payload(command)
    read_like = bool(
        re.search(
            r"\b(cat|sed|head|tail|less|more|rg|grep|awk|wc)\b|read_text\s*\(|read_bytes\s*\(",
            text,
        )
    )
    refs = [path for path in documents if path in text] if read_like else []
    labels = set()
    if read_like:
        labels.add("read_like")
    if refs:
        labels.add("canonical_document_read_like")
    if re.search(r"\b(npm|pnpm|yarn|npx)\b", text) and re.search(
        r"\b(test|vitest|lint|typecheck|check|build)\b", text
    ):
        labels.add("check_like")
    if "tools/benchmark-pilot.mjs" in text:
        labels.add("configured_full_benchmark_like")
    if re.search(
        r"\b(apply_patch|patch|touch|mkdir|cp|mv|rm|tee)\b|(?<![<])>{1,2}(?!=)|write_(text|bytes)\s*\(|writeFile(?:Sync)?\s*\(|\bsed\b[^\n]*\s-i\b|\bgit\s+(add|commit)\b",
        text,
    ):
        labels.add("write_like")
    if not labels:
        labels.add("other")
    return labels, refs


def positive_span(first, last):
    return (
        None
        if first is None or last is None
        else {
            "started_at_utc": utc(first),
            "ended_at_utc": utc(last),
            "seconds": last - first,
        }
    )


def analyze(args):
    run, batch, target = args.run, args.batch, args.target
    release_raw = (run / "workload-release.json").read_bytes()
    release = json.loads(release_raw)
    base = release["worker_base_sha"]
    manifests = {
        f"B{i:03}": json.loads((batch / f"B{i:03}" / "manifest.json").read_bytes())
        for i in range(1, 101)
    }
    documents = {"README.md", "AGENTS.md"}
    for manifest in manifests.values():
        documents.update(ref.split("#")[0] for ref in manifest["task"]["sourceRefs"])
    # Also include actual configured instruction documents, without executing a log.
    profile_raw = subprocess.run(
        ["git", "show", f"{base}:swarm.toml"],
        cwd=target,
        capture_output=True,
        check=True,
    ).stdout
    profile = tomllib.loads(profile_raw.decode())
    documents.update(profile.get("project", {}).get("instructions", []))
    documents = sorted(documents)
    document_sizes = []
    for path in documents:
        if path.startswith("/") or ".." in Path(path).parts:
            raise ValueError("unsafe canonical document path")
        result = subprocess.run(
            ["git", "show", f"{base}:{path}"],
            cwd=target,
            capture_output=True,
            check=True,
        )
        raw = result.stdout
        document_sizes.append(
            {
                "path": path,
                "frozen_bytes": len(raw),
                "frozen_lines": len(raw.splitlines()),
                "source_sha256": digest(raw),
            }
        )
    private_gateway_file = (
        run / "gateway-final-dict-private-bec6e55ab8b8493f9c59440dc49184fc.json"
    )
    private_gateway_raw = private_gateway_file.read_bytes()
    gateway = json.loads(private_gateway_raw)["report"]
    gateway_allowlist_raw = (
        run / "gateway-final-dict-allowlist-bec6e55ab8b8493f9c59440dc49184fc.json"
    ).read_bytes()
    gateway_allowlist = json.loads(gateway_allowlist_raw)
    gateway_samples = []
    for path in (run / "gateway-samples").glob("status-public-allowlist-*.json"):
        raw = path.read_bytes()
        sample = json.loads(raw)
        if "observed_at_utc" in sample and "tasks" in sample:
            gateway_samples.append(
                (timestamp(sample["observed_at_utc"]), sample, digest(raw))
            )
    gateway_samples.sort(key=lambda entry: entry[0])
    counter_observations = defaultdict(list)
    queue_observations = defaultdict(list)
    for at, sample, source_hash in gateway_samples:
        task_values = sample["tasks"]
        iterator = (
            task_values.items()
            if isinstance(task_values, dict)
            else ((row["task_id"], row) for row in task_values)
        )
        for task, row in iterator:
            counter_observations[task].append(
                (at, int(row.get("requests", 0)), int(row.get("completed", 0)))
            )
            if row.get("last_error") == "gateway_rate_wait_expired":
                queue_observations[task].append(
                    {"observed_at_utc": utc(at), "source_sha256": source_hash}
                )
    rows = []
    threads = set()
    global_commands = Counter()
    command_tasks = defaultdict(set)
    intervals = {
        "process": {},
        "command_event_envelope": {},
        "matched_command_execution": {},
        "thread_to_last_event": {},
        "sampled_gateway_counter_envelope": {},
    }
    aggregate_types = Counter()
    aggregate_item_types = Counter()
    aggregate_categories = Counter()
    doc_counts = Counter()
    for task, manifest in manifests.items():
        directory = batch / task
        raw_report = (directory / "report.json").read_bytes()
        report = json.loads(raw_report)
        raw_events = (directory / "agent.jsonl").read_bytes()
        raw_patch = (directory / "changes.patch").read_bytes()
        assert (
            report["task_id"] == task
            and manifest["task"]["id"] == task
            and report["base_sha"] == base
        )
        assert digest(raw_patch) == report["patch_sha256"]
        commands = []
        starts = {}
        finished = set()
        command_intervals = []
        command_points = []
        event_points = []
        thread_points = []
        types = Counter()
        item_types = Counter()
        categories = Counter()
        mentioned = Counter()
        malformed = 0
        unaware = 0
        repeated_events = 0
        native_changes = 0
        error_events = []
        for line in raw_events.splitlines():
            try:
                event = json.loads(line)
            except json.JSONDecodeError:
                malformed += 1
                continue
            kind = event.get("type", "<missing>")
            types[kind] += 1
            try:
                at = timestamp(event.get("swarm_received_at"))
            except (ValueError, TypeError):
                unaware += 1
                at = None
            if at is not None:
                event_points.append(at)
            if kind == "thread.started":
                if isinstance(event.get("thread_id"), str):
                    threads.add(event["thread_id"])
                if at is not None:
                    thread_points.append(at)
            if kind == "error":
                error_events.append(
                    {
                        "observed_at_utc": utc(at),
                        "http_429_token_present": bool(
                            re.search(r"\b429\b", str(event.get("message", "")))
                        ),
                    }
                )
            item = event.get("item", {})
            if not isinstance(item, dict):
                continue
            item_kind = item.get("type")
            item_id = item.get("id")
            if item_kind:
                item_types[item_kind] += 1
            if item_kind == "file_change" and kind == "item.completed":
                native_changes += 1
            if item_kind != "command_execution":
                continue
            if at is not None:
                command_points.append(at)
            if kind == "item.started" and item_id is not None:
                starts[item_id] = at
            if kind != "item.completed":
                continue
            if item_id in finished:
                repeated_events += 1
                continue
            finished.add(item_id)
            command = item.get("command", "")
            if not isinstance(command, str):
                continue
            labels, refs = classify(command, documents)
            categories.update(labels)
            mentioned.update(refs)
            doc_counts.update(refs)
            exact = digest(command.encode())
            normalized = digest(" ".join(payload(command).split()).encode())
            global_commands[normalized] += 1
            command_tasks[normalized].add(task)
            output = item.get("aggregated_output", "")
            output_bytes = len(output.encode()) if isinstance(output, str) else 0
            commands.append(
                {
                    "exact": exact,
                    "normalized": normalized,
                    "at": at,
                    "started": starts.get(item_id),
                    "labels": labels,
                    "refs": refs,
                    "captured_output_bytes": output_bytes,
                    "exit_code": item.get("exit_code"),
                }
            )
            if (
                starts.get(item_id) is not None
                and at is not None
                and starts[item_id] <= at
            ):
                command_intervals.append((starts[item_id], at))
        first = min(command_points) if command_points else None
        last = max(command_points) if command_points else None
        merged = merge_intervals(command_intervals)
        shell_union = sum(b - a for a, b in merged)
        process = (
            timestamp(report.get("agent_started_at")),
            timestamp(report.get("agent_finished_at")),
        )
        intervals["process"][task] = (
            [process] if all(x is not None for x in process) else []
        )
        intervals["command_event_envelope"][task] = (
            [(first, last)] if first is not None and last is not None else []
        )
        intervals["matched_command_execution"][task] = merged
        thread_first = min(thread_points) if thread_points else None
        event_last = max(event_points) if event_points else None
        intervals["thread_to_last_event"][task] = (
            [(thread_first, event_last)]
            if thread_first is not None and event_last is not None
            else []
        )
        progress = counter_observations.get(task, [])
        positive = [entry for entry in progress if entry[1] > 0 or entry[2] > 0]
        changes = []
        prior = None
        for entry in progress:
            if prior is None or entry[1:] > prior[1:]:
                changes.append(entry[0])
            prior = entry
        model_first = positive[0][0] if positive else None
        model_last = changes[-1] if changes else None
        intervals["sampled_gateway_counter_envelope"][task] = (
            [(model_first, model_last)]
            if model_first is not None
            and model_last is not None
            and model_last >= model_first
            else []
        )
        exact_counts = Counter(x["exact"] for x in commands)
        normal_counts = Counter(x["normalized"] for x in commands)
        for label, count in categories.items():
            aggregate_categories[label] += count
        aggregate_types.update(types)
        aggregate_item_types.update(item_types)
        numeric = gateway["tasks"][task]
        row = {
            "task_id": task,
            "original_status": report["status"],
            "agent_exit": report["agent_exit"],
            "helper_check_exit": report["check_exit"],
            "patch_bytes": len(raw_patch),
            "nonempty_patch": bool(raw_patch),
            "source_sha256": {
                "manifest": digest((directory / "manifest.json").read_bytes()),
                "report": digest(raw_report),
                "agent_jsonl": digest(raw_events),
                "patch": digest(raw_patch),
            },
            "distinct_thread_start_ids": len(
                {
                    json.loads(line).get("thread_id")
                    for line in raw_events.splitlines()
                    if json.loads(line).get("type") == "thread.started"
                }
            ),
            "typed_events_by_type": dict(types),
            "typed_item_events_by_type": dict(item_types),
            "malformed_json_lines": malformed,
            "unaware_or_invalid_event_timestamps": unaware,
            "duplicate_completed_command_events": repeated_events,
            "completed_command_items": len(commands),
            "matched_command_intervals": len(command_intervals),
            "started_command_items_without_completed_event": sum(
                item_id not in finished for item_id in starts
            ),
            "native_completed_file_change_items": native_changes,
            "command_categories_nonexclusive": dict(categories),
            "exact_repeated_command_instances": sum(
                n - 1 for n in exact_counts.values()
            ),
            "whitespace_normalized_repeated_command_instances": sum(
                n - 1 for n in normal_counts.values()
            ),
            "explicit_canonical_document_mentions_in_read_like_commands": dict(
                mentioned
            ),
            "captured_command_output_utf8_bytes": sum(
                c["captured_output_bytes"] for c in commands
            ),
            "captured_output_bytes_of_canonical_document_read_like_commands": sum(
                c["captured_output_bytes"] for c in commands if c["refs"]
            ),
            "process_span": positive_span(*process),
            "command_event_envelope": positive_span(first, last),
            "matched_command_execution_interval_union_seconds": shell_union,
            "command_envelope_residual_seconds": None
            if first is None or last is None
            else max(0, last - first - shell_union),
            "first_write_like_command_completed_at_utc": utc(
                min(
                    (
                        c["at"]
                        for c in commands
                        if "write_like" in c["labels"] and c["at"] is not None
                    ),
                    default=None,
                )
            ),
            "first_canonical_doc_read_completed_at_utc": utc(
                min(
                    (c["at"] for c in commands if c["refs"] and c["at"] is not None),
                    default=None,
                )
            ),
            "last_canonical_doc_read_completed_at_utc": utc(
                max(
                    (c["at"] for c in commands if c["refs"] and c["at"] is not None),
                    default=None,
                )
            ),
            "sampled_gateway_counter_envelope": positive_span(model_first, model_last),
            "actual_model_request_intervals": None,
            "actual_model_request_latency_seconds": None,
            "actual_pacing_wait_seconds": None,
            "gateway_admission_attempts": numeric["requests"],
            "gateway_count_admission_counter": numeric["count_requests"],
            "gateway_verified_completed_responses": numeric["completed"],
            "gateway_failed_or_uncertain_outcomes": numeric["errors"],
            "gateway_count_errors_recorded": numeric["count_errors"],
            "verified_completed_response_input_tokens": numeric["input_tokens"],
            "verified_completed_response_output_tokens": numeric["output_tokens"],
            "actual_upstream_inference_http_send_count": None,
            "error_events": error_events,
        }
        rows.append(row)
        # Do not derive any public command text, command hashes, output text or IDs.
        assert (directory / "report.json").read_bytes() == raw_report and (
            directory / "agent.jsonl"
        ).read_bytes() == raw_events
    resource_file = (
        run
        / "provider-resource-series-final-allowlist-46ba1ac447d8430f986d2c1881ca2b64.json"
    )
    resource_raw = resource_file.read_bytes()
    resource = json.loads(resource_raw)
    first100 = timestamp(resource["first_100_observed_at_utc"])
    last100 = timestamp(resource["last_100_observed_at_utc"])
    findings = [
        {
            "task_id": task,
            "minimum_distinct_local_queue_expiries_observed": 1,
            "first_observed_at_utc": values[0]["observed_at_utc"],
            "last_sticky_error_observed_at_utc": values[-1]["observed_at_utc"],
            "repeated_sticky_status_observations_are_not_distinct_expiries": True,
            "source_sha256": values[0]["source_sha256"],
        }
        for task, values in sorted(queue_observations.items())
    ]
    result = {
        "schema_version": 1,
        "kind": "offline_original_cohort_activity_and_overhead_allowlist",
        "created_at_utc": datetime.now(UTC).isoformat(),
        "run_id": run.name,
        "worker_base_sha": base,
        "controller_commit": release["controller_commit"],
        "method": {
            "analyzer_source_sha256": digest(Path(__file__).read_bytes()),
            "frozen_profile_source_sha256": digest(profile_raw),
            "log_evaluation_or_command_execution": False,
            "external_or_paid_operations": 0,
            "event_time_source": "controller swarm_received_at and aware report timestamps; remote buffering/clock latency unmeasured",
            "command_matching": "Pair item.started/item.completed by local item ID; merge same-task intervals before counting distinct simultaneous tasks.",
            "categories": "Nonexclusive read/check/write-like string heuristics, not semantic intent or completed feature proof. Explicit canonical doc filename mentions only; wildcard/indirect reads can be missed.",
            "repeated_commands": "Compare exact and whitespace-normalized shell payload internally; only aggregate repetition counts are exported.",
            "model_counting": "Gateway requests/count_requests increment at reservation before pacing/count HTTP/inference. Actual upstream inference sends and per-request timing are unrecorded; completed responses establish a lower bound.",
            "input_hashes_only_no_raw_logs_ids_commands_outputs_or_account_financials": True,
        },
        "counts": {
            "tasks": len(rows),
            "distinct_thread_ids": len(threads),
            "tasks_with_typed_thread_start": sum(
                r["distinct_thread_start_ids"] > 0 for r in rows
            ),
            "tasks_with_completed_command_items": sum(
                r["completed_command_items"] > 0 for r in rows
            ),
            "completed_command_items": sum(r["completed_command_items"] for r in rows),
            "started_command_items_without_completed_event": sum(
                r["started_command_items_without_completed_event"] for r in rows
            ),
            "nonempty_original_patches": sum(r["nonempty_patch"] for r in rows),
            "empty_original_patches": sum(not r["nonempty_patch"] for r in rows),
            "original_validated_workers": sum(
                r["original_status"] == "validated" for r in rows
            ),
            "gateway_admission_attempts": sum(
                r["gateway_admission_attempts"] for r in rows
            ),
            "gateway_verified_completed_responses": sum(
                r["gateway_verified_completed_responses"] for r in rows
            ),
            "gateway_failed_or_uncertain_outcomes": sum(
                r["gateway_failed_or_uncertain_outcomes"] for r in rows
            ),
            "tasks_with_verified_provider_completions": sum(
                r["gateway_verified_completed_responses"] > 0 for r in rows
            ),
            "actual_upstream_inference_send_count": None,
            "typed_event_counts": dict(aggregate_types),
            "typed_item_event_counts": dict(aggregate_item_types),
            "command_categories_nonexclusive": dict(aggregate_categories),
            "same_normalized_command_groups_across_multiple_tasks": sum(
                len(v) > 1 for v in command_tasks.values()
            ),
            "max_distinct_tasks_issuing_same_normalized_command": max(
                map(len, command_tasks.values()), default=0
            ),
            "same_normalized_command_extra_instances_within_task": sum(
                r["whitespace_normalized_repeated_command_instances"] for r in rows
            ),
        },
        "overlap": {key: overlap(values) for key, values in intervals.items()},
        "provider_inventory": {
            "source_allowlist_sha256": digest(resource_raw),
            "sample_count": resource["sample_count"],
            "observations_at_100": resource["observations_at_100"],
            "first_100_observed_at_utc": resource["first_100_observed_at_utc"],
            "last_100_observed_at_utc": resource["last_100_observed_at_utc"],
            "first_to_last_100_observation_seconds": last100 - first100,
            "continuous_100_vm_duration_established": False,
            "proves_100_useful_coding_agents": False,
        },
        "gateway_source": {
            "final_allowlist_sha256": digest(gateway_allowlist_raw),
            "final_private_receipt_sha256": digest(private_gateway_raw),
            "snapshot_at_utc": gateway_allowlist["observed_at_utc"],
            "sampled_counter_receipt_count": len(gateway_samples),
            "sampled_counter_receipt_sha256": [entry[2] for entry in gateway_samples],
        },
        "pacing": {
            "configured_shared_admission_deadline_seconds": 300,
            "actual_per_request_queue_wait_seconds": None,
            "deadline_includes_intervening_provider_count_http_elapsed_time": True,
            "local_queue_expiry_observations": findings,
            "upstream_429_count": None,
            "note": "Sticky last_error snapshots prove at least one local queue expiry, not one expiry per repeated snapshot. A Codex429 event alone does not identify upstream versus local gateway rejection.",
        },
        "canonical_documents": document_sizes,
        "canonical_document_read_like_command_mentions": dict(doc_counts),
        "focused_tasks": [r for r in rows if r["task_id"] in ("B001", "B051", "B063")],
        "hypotheses": [
            {
                "claim": "Repeated large instruction/contract reads may contribute context and tool-output overhead.",
                "status": "hypothesis_not_causal_proof",
                "actual_provider_context_tokens_attributable_to_document_reads": None,
                "repeated_document_mentions_are_not_proof_of_repeated_full_file_reads": True,
                "controlled_comparison_available": False,
            },
            {
                "claim": "Pacing/model waits may explain parts of the non-command event gaps.",
                "status": "hypothesis_not_causal_proof",
                "per_request_latencies_and_model_spans_unrecorded": True,
            },
        ],
        "limits": [
            "Process and first-to-last-event envelopes contain gaps; neither establishes continuous useful activity or accepted contribution.",
            "Matched shell intervals can include waiting and transport buffering; they are not CPU work or model inference intervals.",
            "Command-envelope residual includes model/reasoning/queue/transport and unobserved work; it is not measured idle time.",
            "Provider100VM first-to-last envelope consists of discrete observations; no continuous22.75minute claim.",
            "Captured output bytes are not input/context tokens, bytes actually read from files, or billed token usage.",
            "63 nonempty patches and command/write-like events are not accepted feature delivery.",
            "Two started command items lacked completed events and are excluded from matched complete intervals; the observed peak is not an upper bound on actual concurrent commands.",
            "Explicit repeated document references can be reads of distinct sections, searches or truncated output; no full-file reread is inferred from a path mention.",
            "Source hashes are evidence hashes, not credential hashes; account finance, thread/sandbox/auth identities and raw logs remain private.",
        ],
        "rows": rows,
    }
    for key, field in [
        ("gateway_admission_attempts", "requests"),
        ("gateway_verified_completed_responses", "completed"),
        ("gateway_failed_or_uncertain_outcomes", "errors"),
    ]:
        assert result["counts"][key] == gateway_allowlist[field]
    assert len(rows) == 100 and len(threads) == 100
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--run", type=Path, required=True)
    parser.add_argument("--batch", type=Path, required=True)
    parser.add_argument("--target", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    result = analyze(args)
    encoded = (json.dumps(result, indent=2) + "\n").encode()
    args.output.write_bytes(encoded)
    args.output.chmod(0o600)
    print(
        json.dumps(
            {
                "output_name": args.output.name,
                "sha256": digest(encoded),
                "counts": result["counts"],
                "overlap": result["overlap"],
                "provider_inventory": result["provider_inventory"],
            }
        )
    )


if __name__ == "__main__":
    main()
