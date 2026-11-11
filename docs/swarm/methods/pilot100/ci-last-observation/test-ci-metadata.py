"""Only synthetic API payloads and temporary local state; no GitHub calls."""

import importlib.util
import json
import tempfile
import unittest
from datetime import UTC, datetime, timedelta
from pathlib import Path

spec = importlib.util.spec_from_file_location(
    "ci_metadata", Path(__file__).with_name("collect-ci-metadata.py")
)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
REPO = "slgarza/Afterimage"
SHA = "a" * 40
MERGE = "b" * 40
AT = "2026-11-11T16:17:25+00:00"


def check(i=1, sha=SHA):
    return {
        "id": i,
        "name": "quality",
        "app": {"slug": "github-actions"},
        "head_sha": sha,
        "status": "completed",
        "conclusion": "success",
        "started_at": AT,
        "completed_at": "2026-11-11T16:18:25Z",
        "html_url": f"https://github.com/{REPO}/actions/runs/1/job/{i}",
        "private_unused": "deliberately_not_exported",
    }


def workflow(i=1, sha=SHA):
    return {
        "id": i,
        "name": "quality",
        "head_sha": sha,
        "status": "completed",
        "conclusion": "success",
        "created_at": AT,
        "run_started_at": AT,
        "updated_at": "2026-11-11T16:18:25Z",
        "repository": {"full_name": REPO},
        "html_url": f"https://github.com/{REPO}/actions/runs/{i}",
        "runner_name": "PRIVATE_UNUSED",
    }


def state():
    return {
        "paused": False,
        "tasks": {
            "B001": {
                "status": "merged_green_provisional",
                "head_sha": SHA,
                "merge_commit_sha": MERGE,
                "merged_tree_verified": True,
            }
        },
        "post_merge_checks": {
            "B001": {
                "status": "passed",
                "merged_tree_verified": True,
                "requires_coordinator_reconciliation": False,
            }
        },
        "task_history": {},
    }


def seed(run):
    (run / "recovery-queue-state.json").write_text(json.dumps(state()))
    (run / "recovery-journal.jsonl").write_text(
        json.dumps({"kind": "head_ci_wait_finished", "wall_seconds": 112}) + "\n"
    )
    (run / "workload-release.json").write_text(json.dumps({"t0_utc": AT}))


class Parsing(unittest.TestCase):
    def test_check_allowlist_and_duration(self):
        p = m.parse_check_page({"total_count": 1, "check_runs": [check()]}, SHA, REPO)
        self.assertTrue(p["read_complete"])
        self.assertEqual(
            p["github_actions_check_runs"][0]["reported_start_to_complete_seconds"], 60
        )
        self.assertNotIn("private_unused", json.dumps(p))

    def test_non_actions_excluded_and_incomplete_pagination(self):
        other = check(2)
        other["app"]["slug"] = "some-app"
        p = m.parse_check_page(
            {"total_count": 101, "check_runs": [check(), other]}, SHA, REPO
        )
        self.assertFalse(p["read_complete"])
        self.assertTrue(p["pagination_truncated"])
        self.assertEqual(p["non_actions_runs_excluded"], 1)

    def test_malformed_and_duplicate_payloads(self):
        for payload in [
            {"total_count": True, "check_runs": []},
            {"total_count": 1, "check_runs": [None]},
            {"total_count": 2, "check_runs": [check(), check()]},
        ]:
            with (
                self.subTest(payload=payload),
                self.assertRaises((ValueError, TypeError)),
            ):
                m.parse_check_page(payload, SHA, REPO)
        for key, value in [
            ("app", None),
            ("head_sha", MERGE),
            ("name", "/home/private"),
            ("started_at", 4),
            ("html_url", "https://github.com/evil/other/actions/runs/1"),
        ]:
            row = check()
            row[key] = value
            with self.subTest(key=key), self.assertRaises((ValueError, TypeError)):
                m.parse_check_page({"total_count": 1, "check_runs": [row]}, SHA, REPO)

    def test_scope_urls_and_names(self):
        for u in [
            "https://github.com/slgarza/Afterimage/actions/runs/1",
            "https://github.com/slgarza/Afterimage/runs/1",
            "https://github.com/slgarza/Afterimage/commit/" + SHA + "/checks",
        ]:
            self.assertEqual(m.url(u, REPO), u)
        for u in [
            "https://github.com/slgarza/Afterimage.evil/actions/runs/1",
            "http://github.com/slgarza/Afterimage/actions/runs/1",
            "https://github.com@evil.example/slgarza/Afterimage/actions/runs/1",
            "https://github.com/slgarza/Afterimage/actions/runs/1?token=hidden",
            "https://github.com/slgarza/Afterimage/actions/runs/1#token",
            "https://github.com/slgarza/Afterimage/../../actions/runs/1",
        ]:
            with self.subTest(url=u), self.assertRaises((ValueError, TypeError)):
                m.url(u, REPO)
        for n in ["bad\nname", "github_pat_fake", "sk-" + "A" * 20, "/tmp/private"]:
            with self.subTest(name=n), self.assertRaises((ValueError, TypeError)):
                m.text(n)

    def test_workflow_scope_unknown_durations(self):
        p = m.parse_workflow(workflow(), REPO)
        self.assertIsNone(p["runner_queue_seconds"])
        self.assertIsNone(p["api_queue_seconds"])
        self.assertNotIn("completed_at_utc", p)
        self.assertNotIn("runner_name", p)
        for key, value in [
            ("repository", None),
            ("repository", {"full_name": "other/repo"}),
            ("head_sha", None),
            ("status", "invented"),
        ]:
            row = workflow()
            row[key] = value
            with self.subTest(key=key), self.assertRaises((ValueError, TypeError)):
                m.parse_workflow(row, REPO)


class Requests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def test_budget_persists_and_counts_failures(self):
        budget = m.ReadBudget(self.root, limit=2)
        calls = []

        def fail(endpoint):
            calls.append(endpoint)
            raise ValueError("fixed error")

        reader = m.Reader(REPO, budget, fail)
        self.assertFalse(reader.checks(SHA)[0]["check_observation"]["read_complete"])
        self.assertEqual(m.ReadBudget(self.root, 2).used(), 1)
        reader.checks(MERGE)
        self.assertEqual(m.ReadBudget(self.root, 2).used(), 2)
        reader.checks("c" * 40)
        self.assertEqual(len(calls), 2)
        self.assertEqual(budget.used(), 2)
        with self.assertRaises((ValueError, TypeError)):
            m.ReadBudget(self.root, limit=3)

    def test_partial_budget_journal_fails_closed(self):
        b = m.ReadBudget(self.root, 2)
        b.reserve("first")
        b.path.write_bytes(b.path.read_bytes() + b"{")
        with self.assertRaises((ValueError, TypeError)):
            b.reserve("second")

    def test_completed_immutable_cache_avoids_next_get(self):
        calls = []

        def client(endpoint):
            calls.append(endpoint)
            return {"total_count": 1, "check_runs": [check()]}

        r = m.Reader(REPO, m.ReadBudget(self.root), client)
        first, hit = r.checks(SHA)
        self.assertFalse(hit)
        before = {p: p.read_bytes() for p in self.root.rglob("*.json")}
        second, hit = r.checks(SHA)
        self.assertTrue(hit)
        self.assertEqual(first, second)
        self.assertEqual(len(calls), 1)
        self.assertEqual(before, {p: p.read_bytes() for p in self.root.rglob("*.json")})

    def test_pagination_cap_three(self):
        calls = []

        def client(endpoint):
            calls.append(endpoint)
            page = len(calls)
            return {
                "total_count": 301,
                "workflow_runs": [
                    workflow(i) for i in range((page - 1) * 100 + 1, page * 100 + 1)
                ],
            }

        r = m.Reader(REPO, m.ReadBudget(self.root), client)
        p = r.workflows(AT)
        self.assertFalse(p["read_complete"])
        self.assertEqual(p["pages_read"], 3)
        self.assertEqual(len(p["workflow_runs"]), 300)
        self.assertEqual(len(calls), 3)

    def test_pagination_complete_and_changing_total(self):
        calls = []

        def client(endpoint):
            calls.append(endpoint)
            return (
                {
                    "total_count": 101,
                    "workflow_runs": [workflow(i) for i in range(1, 101)],
                }
                if len(calls) == 1
                else {"total_count": 101, "workflow_runs": [workflow(101)]}
            )

        r = m.Reader(REPO, m.ReadBudget(self.root), client)
        p = r.workflows(AT)
        self.assertTrue(p["read_complete"])
        self.assertEqual(len(calls), 2)
        calls.clear()

        def changed(endpoint):
            calls.append(endpoint)
            return (
                {
                    "total_count": 101,
                    "workflow_runs": [workflow(i) for i in range(1, 101)],
                }
                if len(calls) == 1
                else {"total_count": 102, "workflow_runs": [workflow(101)]}
            )

        p = m.Reader(REPO, m.ReadBudget(self.root), changed).workflows(AT)
        self.assertFalse(p["read_complete"])
        self.assertEqual(p["error_code"], "workflow_metadata_incomplete")

    def test_check_and_workflow_failures_stay_unknown(self):
        def malformed(endpoint):
            return {
                "total_count": 1,
                "check_runs": [{"id": 1, "app": None}],
                "workflow_runs": [None],
            }

        r = m.Reader(REPO, m.ReadBudget(self.root), malformed)
        self.assertFalse(r.checks(SHA)[0]["check_observation"]["read_complete"])
        self.assertFalse(r.workflows(AT)["read_complete"])
        self.assertEqual(r.budget.used(), 2)


class Snapshot(unittest.TestCase):
    def test_selection_excludes_unverified_includes_historical_credit_zero(self):
        s = state()
        s["tasks"]["B002"] = {"status": "integrating", "head_sha": "c" * 40}
        s["task_history"] = {
            "B003": [
                {
                    "head_sha": "d" * 40,
                    "merge_commit_sha": "e" * 40,
                    "merged_at": AT,
                    "merged_tree_verified": True,
                }
            ]
        }
        p = m.select_commits(s)
        self.assertEqual(len(p), 4)
        self.assertTrue(p["d" * 40][0]["historical_corrective_credit0"])
        self.assertEqual(p["d" * 40][0]["additional_feature_credit"], 0)
        s["post_merge_checks"]["B001"]["requires_coordinator_reconciliation"] = True
        self.assertNotIn(SHA, m.select_commits(s))

    def test_current_is_explicit_nonatomic_and_preserves_inputs(self):
        with tempfile.TemporaryDirectory() as tmp:
            run = Path(tmp)
            seed(run)
            before = {
                n: (run / n).read_bytes()
                for n in ["recovery-queue-state.json", "workload-release.json"]
            }
            calls = []

            def client(endpoint):
                calls.append(endpoint)
                if "actions/runs?" in endpoint:
                    with (run / "recovery-journal.jsonl").open("a") as f:
                        f.write(json.dumps({"kind": "queue_advanced"}) + "\n")
                    return {"total_count": 1, "workflow_runs": [workflow()]}
                sha = endpoint.split("/commits/")[1].split("/")[0]
                return {"total_count": 1, "check_runs": [check(sha=sha)]}

            path, r = m.collect(run, REPO, "current", client)
            self.assertEqual(r["request_budget"]["used_total"], 3)
            self.assertTrue(r["source_snapshot"]["journal_changed_during_gets"])
            self.assertFalse(r["source_snapshot"]["atomic_snapshot_claimed"])
            self.assertEqual(
                r["operator_head_ci_wait_observations"]["median_raw_event_seconds"], 112
            )
            self.assertTrue(
                r["source_snapshot"]["original_run_input_bytes_retained_private"]
            )
            for original in before.values():
                retained = (
                    run
                    / "ci-metadata"
                    / "private-inputs"
                    / (m.digest(original) + ".run-input")
                )
                self.assertEqual(retained.read_bytes(), original)
                self.assertEqual(retained.stat().st_mode & 0o777, 0o600)
            self.assertTrue(path.is_file())
            self.assertNotIn(tmp, path.read_text())
            self.assertEqual(before, {n: (run / n).read_bytes() for n in before})
            with self.assertRaises((ValueError, TypeError)):
                m.collect(run, REPO, "current", client)
            self.assertEqual(len(calls), 3)

    def test_final_refuses_active_or_incomplete_without_get(self):
        with tempfile.TemporaryDirectory() as tmp:
            run = Path(tmp)
            seed(run)
            calls = []
            with self.assertRaises((ValueError, TypeError)):
                m.collect(run, REPO, "final", lambda e, calls=calls: calls.append(e))
            self.assertEqual(calls, [])
            self.assertFalse(
                (run / "ci-metadata-cache" / "final-invocation.json").exists()
            )

    def test_final_uses_same_global_budget_and_historical_cache(self):
        with tempfile.TemporaryDirectory() as tmp:
            run = Path(tmp)
            seed(run)
            calls = []

            def client(endpoint):
                calls.append(endpoint)
                if "actions/runs?" in endpoint:
                    return m.RawResponse(
                        json.dumps({"total_count": 0, "workflow_runs": []}).encode()
                    )
                sha = endpoint.split("/commits/")[1].split("/")[0]
                return m.RawResponse(
                    json.dumps(
                        {"total_count": 1, "check_runs": [check(sha=sha)]}
                    ).encode()
                )

            m.collect(run, REPO, "current", client)
            s = state()
            s["tasks"].update(
                {f"B{i:03}": {"status": "original_empty_patch"} for i in range(2, 101)}
            )
            (run / "recovery-queue-state.json").write_text(json.dumps(s))
            counts = {"merged_green_provisional": 1, "original_empty_patch": 99}
            (run / "recovery-journal.jsonl").write_text(
                json.dumps(
                    {
                        "kind": "integration_queue_stopped",
                        "paused": False,
                        "task_status_counts": counts,
                    }
                )
                + "\n"
            )
            _path, r = m.collect(run, REPO, "final", client)
            self.assertEqual(r["historical_check_cache_hits"], 2)
            self.assertEqual(r["request_budget"]["used_before_this_snapshot"], 3)
            self.assertEqual(r["request_budget"]["used_this_snapshot"], 1)
            self.assertEqual(r["request_budget"]["used_total"], 4)
            self.assertEqual(len(calls), 4)


class RetainedSources(unittest.TestCase):
    def test_exact_bytes_retained_before_json_derivation(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            raw = (
                b'  {"total_count":1, "check_runs":'
                + json.dumps([check()]).encode()
                + b"}\n"
            )
            reader = m.Reader(
                REPO,
                m.ReadBudget(root),
                lambda e: m.RawResponse(raw),
                require_retained_sources=True,
            )
            row, hit = reader.checks(SHA)
            sha = m.digest(raw)
            body = root / "private-inputs" / (sha + ".json-body")
            self.assertFalse(hit)
            self.assertEqual(body.read_bytes(), raw)
            self.assertEqual(body.stat().st_mode & 0o777, 0o600)
            self.assertEqual(row["response_source"]["response_body_sha256"], sha)
            self.assertTrue(reader.source_bound_check_cache(row, SHA))
            self.assertTrue(reader.checks(SHA)[1])
            self.assertEqual(reader.budget.used(), 1)

    def test_error_and_invalid_json_bodies_retained_not_exported(self):
        for raw, success in [(b'{"message":"Not Found"}', False), (b"not JSON", True)]:
            with self.subTest(success=success), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                reader = m.Reader(
                    REPO,
                    m.ReadBudget(root),
                    lambda e, raw=raw, success=success: m.RawResponse(raw, success),
                    require_retained_sources=True,
                )
                row, _hit = reader.checks(SHA)
                self.assertFalse(row["check_observation"]["read_complete"])
                self.assertEqual(
                    (
                        root / "private-inputs" / (m.digest(raw) + ".json-body")
                    ).read_bytes(),
                    raw,
                )
                self.assertNotIn(raw.decode(), json.dumps(row))
                self.assertTrue(
                    row["response_source"]["original_body_retained_private"]
                )
                self.assertEqual(reader.budget.used(), 1)

    def test_unbound_current_cache_is_not_final_source(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            budget = m.ReadBudget(root)
            m.Reader(
                REPO, budget, lambda e: {"total_count": 1, "check_runs": [check()]}
            ).checks(SHA)
            calls = []

            def capture(endpoint):
                calls.append(endpoint)
                return m.RawResponse(
                    json.dumps({"total_count": 1, "check_runs": [check()]}).encode()
                )

            reader = m.Reader(REPO, budget, capture, require_retained_sources=True)
            row, hit = reader.checks(SHA)
            self.assertFalse(hit)
            self.assertEqual(len(calls), 1)
            self.assertTrue(row["response_source"]["original_body_retained_private"])
            self.assertEqual(budget.used(), 2)

    def test_missing_or_tampered_body_cannot_reuse_cache(self):
        for tamper in [False, True]:
            with self.subTest(tamper=tamper), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                raw = json.dumps({"total_count": 1, "check_runs": [check()]}).encode()
                reader = m.Reader(
                    REPO,
                    m.ReadBudget(root),
                    lambda e, raw=raw: m.RawResponse(raw),
                    require_retained_sources=True,
                )
                row, _ = reader.checks(SHA)
                body = root / "private-inputs" / (m.digest(raw) + ".json-body")
                if tamper:
                    body.write_bytes(b"changed")
                else:
                    body.unlink()
                self.assertFalse(reader.source_bound_check_cache(row, SHA))

    def test_workflow_pages_have_body_bindings_and_no_headers(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            raw = json.dumps({"total_count": 1, "workflow_runs": [workflow()]}).encode()
            reader = m.Reader(REPO, m.ReadBudget(root), lambda e: m.RawResponse(raw))
            p = reader.workflows(AT)
            self.assertTrue(p["read_complete"])
            self.assertEqual(
                p["response_sources"][0]["response_body_sha256"], m.digest(raw)
            )
            self.assertFalse(p["response_sources"][0]["response_headers_recorded"])
            self.assertNotIn("runner_name", json.dumps(p))


class WaitEventMeasurement(unittest.TestCase):
    def test_pending_and_overlapping_reconciliation_are_events_not_additive_task_waits(
        self,
    ):
        events = [
            {
                "kind": "head_ci_wait_finished",
                "task_id": "B001",
                "status": "passed",
                "wall_seconds": 100,
            },
            {
                "kind": "head_ci_wait_finished",
                "task_id": "B096",
                "status": "pending",
                "wall_seconds": 1800,
            },
            {
                "kind": "head_ci_wait_finished",
                "task_id": "B096",
                "status": "passed",
                "wall_seconds": 2000,
                "coordinator_ci_reconciliation": True,
                "prior_pending_segment_overlaps_this_total": True,
            },
            {
                "kind": "head_ci_wait_finished",
                "task_id": "B002",
                "status": "failed",
                "wall_seconds": float("nan"),
            },
        ]
        result = m.head_wait_event_observations(
            b"\n".join(json.dumps(v).encode() for v in events) + b"\n"
        )
        self.assertEqual(result["event_count"], 4)
        self.assertEqual(result["duration_observation_count"], 3)
        self.assertEqual(result["distinct_tasks_with_events"], 3)
        self.assertEqual(
            result["outcome_counts"], {"passed": 2, "pending": 1, "failed": 1}
        )
        self.assertEqual(result["median_raw_event_seconds"], 1800)
        self.assertEqual(result["explicit_overlap_event_count"], 1)
        self.assertEqual(result["coordinator_reconciliation_event_count"], 1)
        self.assertTrue(result["durations_are_not_additive"])
        self.assertIsNone(result["summed_duration_seconds"])
        self.assertIsNone(result["runner_queue_seconds"])
        self.assertIsNone(result["api_queue_seconds"])


class CensoredLastObservation(unittest.TestCase):
    def test_censored_requires_present_actual_cutoff_without_get_or_last_marker(self):
        for cutoff in (None, (datetime.now(UTC) + timedelta(hours=1)).isoformat()):
            with self.subTest(cutoff=cutoff), tempfile.TemporaryDirectory() as tmp:
                run = Path(tmp)
                seed(run)
                (run / "workload-release.json").write_text(
                    json.dumps({"t0_utc": AT, "delivery_cutoff_utc": cutoff})
                )
                calls = []
                with self.assertRaises((ValueError, TypeError)):
                    m.collect(
                        run, REPO, "censored", lambda e, calls=calls: calls.append(e)
                    )
                self.assertEqual(calls, [])
                self.assertFalse(
                    (
                        run / "ci-metadata-cache" / "last-observation-invocation.json"
                    ).exists()
                )

    def test_cutoff_partial_cohort_observation_is_explicitly_censored_and_source_bound(
        self,
    ):
        with tempfile.TemporaryDirectory() as tmp:
            run = Path(tmp)
            seed(run)
            value = state()
            value["tasks"]["B002"] = {"status": "waiting_head_ci", "head_sha": "c" * 40}
            (run / "recovery-queue-state.json").write_text(json.dumps(value))
            (run / "workload-release.json").write_text(
                json.dumps(
                    {
                        "t0_utc": AT,
                        "delivery_cutoff_utc": (
                            datetime.now(UTC) - timedelta(minutes=1)
                        ).isoformat(),
                    }
                )
            )

            def client(endpoint):
                if "actions/runs?" in endpoint:
                    return m.RawResponse(
                        json.dumps({"total_count": 0, "workflow_runs": []}).encode()
                    )
                sha = endpoint.split("/commits/")[1].split("/")[0]
                return m.RawResponse(
                    json.dumps(
                        {"total_count": 1, "check_runs": [check(sha=sha)]}
                    ).encode()
                )

            _path, result = m.collect(run, REPO, "censored", client)
            self.assertEqual(
                result["observation_classification"],
                "supporting_censored_last_observation",
            )
            self.assertEqual(result["source_task_entry_count"], 2)
            self.assertEqual(result["unique_commit_count"], 2)
            self.assertFalse(result["full_delivery_completion_claimed"])
            self.assertIsNone(result["completed_workload_T1_utc"])
            self.assertIsNone(result["quality_window_acceptance"])
            self.assertTrue(
                all(
                    row["response_source"]["original_body_retained_private"]
                    for row in result["commits"]
                )
            )
            before = result["request_budget"]["used_total"]
            with self.assertRaises((ValueError, TypeError)):
                m.collect(run, REPO, "final", client)
            with self.assertRaises((ValueError, TypeError)):
                m.collect(run, REPO, "censored", client)
            self.assertEqual(m.ReadBudget(run / "ci-metadata-cache").used(), before)

    def test_old_normal_final_marker_blocks_any_later_censored_observation(self):
        with tempfile.TemporaryDirectory() as tmp:
            run = Path(tmp)
            seed(run)
            cache = run / "ci-metadata-cache"
            cache.mkdir()
            (cache / "final-invocation.json").write_text("{}")
            calls = []
            with self.assertRaises((ValueError, TypeError)):
                m.collect(run, REPO, "censored", lambda e, calls=calls: calls.append(e))
            self.assertEqual(calls, [])

    def test_censored_is_an_alternative_last_observation_after_current_with_same_budget(
        self,
    ):
        with tempfile.TemporaryDirectory() as tmp:
            run = Path(tmp)
            seed(run)

            def client(endpoint):
                if "actions/runs?" in endpoint:
                    return m.RawResponse(
                        json.dumps({"total_count": 0, "workflow_runs": []}).encode()
                    )
                sha = endpoint.split("/commits/")[1].split("/")[0]
                return m.RawResponse(
                    json.dumps(
                        {"total_count": 1, "check_runs": [check(sha=sha)]}
                    ).encode()
                )

            m.collect(run, REPO, "current", client)
            (run / "workload-release.json").write_text(
                json.dumps(
                    {
                        "t0_utc": AT,
                        "delivery_cutoff_utc": (
                            datetime.now(UTC) - timedelta(minutes=1)
                        ).isoformat(),
                    }
                )
            )
            _path, result = m.collect(run, REPO, "censored", client)
            self.assertEqual(result["request_budget"]["used_before_this_snapshot"], 3)
            self.assertEqual(result["request_budget"]["used_total"], 4)
            self.assertEqual(result["historical_check_cache_hits"], 2)


if __name__ == "__main__":
    unittest.main()
