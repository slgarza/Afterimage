import copy
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).with_name("collect-delivery-allowlist.py")
spec = importlib.util.spec_from_file_location("delivery_collector", SCRIPT)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class DeliveryBindingTests(unittest.TestCase):
    def setUp(self):
        self.patch = b"Synthetic original patch; not a real approval."
        self.report = {
            "status": "needs_repair",
            "finished_at": "2026-11-11T16:50:00Z",
            "check_exit": 0,
            "checked_patch_sha256": m.sha(self.patch),
            "patch_sha256": m.sha(self.patch),
        }
        self.report_raw = json.dumps(self.report).encode()
        self.state = {
            "status": "merged_green_provisional",
            "patch_sha256": m.sha(self.patch),
            "merged_tree_verified": True,
            "head_sha": "b" * 40,
            "merge_commit_sha": "c" * 40,
            "pr_number": 1,
            "pr_url": "https://github.com/slgarza/Afterimage/pull/1",
            "merged_at": "2026-11-11T17:00:00Z",
            "delivery_attribution": "trusted_local_recovery_of_failed_worker_patch_unchanged",
        }
        self.post = {
            "status": "passed",
            "merged_tree_verified": True,
            "merge_commit_sha": "c" * 40,
            "pr_url": self.state["pr_url"],
            "requires_coordinator_reconciliation": False,
        }
        self.artifact = {
            **self.state,
            "status": "merged",
            "application_method": "direct",
            "green_head_sha": "b" * 40,
            "tested_base_sha": "d" * 40,
            "tested_tree": "e" * 40,
        }
        self.review = {
            "task_id": "B010",
            "reviewer": "launch_packet",
            "independence": True,
            "verdict": "approve_recovered",
            "recovered_patch_review": True,
            "original_report_sha256": m.sha(self.report_raw),
            "original_patch_sha256": m.sha(self.patch),
            "reviewed_patch_sha256": m.sha(self.patch),
            "reviewed_at_utc": "2026-11-11T16:55:00Z",
        }

    def checked(self):
        raw = json.dumps(self.review).encode()
        self.state["review_receipt_sha256"] = m.sha(raw)
        return m.validate_bindings(
            "B010",
            self.report,
            self.report_raw,
            self.patch,
            self.state,
            self.post,
            self.artifact,
            raw,
            self.review,
        )

    def test_positive_binding_and_false_ci_tree_reconciliation_are_not_accepted(self):
        self.assertTrue(all(self.checked().values()))
        for where, key, value in [
            (self.state, "status", "waiting_head_ci"),
            (self.state, "merged_tree_verified", False),
            (self.post, "status", "pending"),
            (self.post, "merged_tree_verified", False),
            (self.post, "requires_coordinator_reconciliation", True),
            (self.artifact, "merge_commit_sha", "f" * 40),
            (self.artifact, "green_head_sha", "f" * 40),
        ]:
            prior = where.get(key)
            where[key] = value
            self.assertFalse(all(self.checked().values()), key)
            where[key] = prior

    def test_wrong_independent_review_report_or_patch_binding_excludes_delivery(self):
        for key, value in [
            ("reviewer", "root"),
            ("independence", False),
            ("original_report_sha256", "0" * 64),
            ("original_patch_sha256", "0" * 64),
            ("reviewed_patch_sha256", "0" * 64),
            ("verdict", "reject"),
            ("reviewed_at_utc", "2026-11-11T16:55:00"),
        ]:
            before = self.review[key]
            self.review[key] = value
            self.assertFalse(all(self.checked().values()), key)
            self.review[key] = before

    def test_repair_delta_must_match_both_independent_review_and_metadata(self):
        self.state["delivery_attribution"] = "coordinator_code_or_test_repair"
        self.review["verdict"] = "approve_repaired"
        delta = b"Explicit synthetic coordinator delta"
        self.review["coordinator_delta_sha256"] = m.sha(delta)
        raw = json.dumps(self.review).encode()
        self.state["review_receipt_sha256"] = m.sha(raw)
        repair = {
            "actor": "root",
            "full_validation_passed": True,
            "original_report_sha256": m.sha(self.report_raw),
            "original_patch_sha256": m.sha(self.patch),
            "repaired_patch_sha256": m.sha(self.patch),
            "coordinator_delta_sha256": m.sha(delta),
        }
        args = [
            "B010",
            self.report,
            self.report_raw,
            self.patch,
            self.state,
            self.post,
            self.artifact,
            raw,
            self.review,
            repair,
        ]
        self.assertTrue(all(m.validate_bindings(*args, delta=delta).values()))
        self.assertFalse(all(m.validate_bindings(*args, delta=b"changed").values()))

    def test_delivery_window_rejects_late_merge_or_green_and_unaware_timestamps(self):
        start = "2026-11-11T16:00:00Z"
        cutoff = "2026-11-11T22:00:00Z"
        self.assertTrue(
            m.inside_delivery_window(
                start, cutoff, "2026-11-11T17:00:00Z", "2026-11-11T18:00:00Z"
            )
        )
        for merge, green in [
            ("2026-11-11T22:00:01Z", "2026-11-11T22:01:00Z"),
            ("2026-11-11T21:59:00Z", "2026-11-11T22:00:01Z"),
            ("2026-11-11T15:59:00Z", "2026-11-11T17:00:00Z"),
            ("2026-11-11T17:00:00", "2026-11-11T18:00:00Z"),
        ]:
            self.assertFalse(m.inside_delivery_window(start, cutoff, merge, green))


class PublicSchemaTests(unittest.TestCase):
    def setUp(self):
        self.snapshot = {
            "rows": [
                {
                    "task_id": f"B{i:03}",
                    "provisional_qualified": False,
                    "binding_checks": {},
                    "workload_counts_as_feature_only_not_delivery": True,
                }
                for i in range(1, 101)
            ],
            "provisional": {"qualified_distinct_tasks": 0, "product_module_units": 0},
            "original_worker_outcomes": {"validated_workers": 0},
            "final_metrics": {
                key: None
                for key in [
                    "accepted_feature_items",
                    "accepted_green_prs_per_hour",
                    "accepted_green_prs_per_dollar",
                    "actual_billed_total_usd",
                    "eligible_cost_usd",
                ]
            },
        }

    def test_unverified_provisional_count_cannot_be_asserted(self):
        m.validate_public_snapshot(self.snapshot)
        row = self.snapshot["rows"][0]
        row["provisional_qualified"] = True
        row["binding_checks"] = {"review": False}
        self.snapshot["provisional"].update(
            qualified_distinct_tasks=1, product_module_units=1
        )
        with self.assertRaises(ValueError):
            m.validate_public_snapshot(self.snapshot)

    def test_raw_private_fields_and_values_are_rejected(self):
        for field, value in [
            ("argv", ["private command"]),
            ("thread_id", "identity"),
            ("source", "/home/example/private/file"),
        ]:
            fixture = copy.deepcopy(self.snapshot)
            fixture[field] = value
            with self.assertRaises(ValueError):
                m.validate_public_snapshot(fixture)

    def test_final_dollar_or_accepted_rate_without_quality_is_rejected(self):
        for key in self.snapshot["final_metrics"]:
            fixture = copy.deepcopy(self.snapshot)
            fixture["final_metrics"][key] = 1
            with self.assertRaises(ValueError):
                m.validate_public_snapshot(fixture)

    def test_original_cohort_requires_all100_distinct_rows(self):
        self.snapshot["rows"][-1]["task_id"] = "B001"
        with self.assertRaises(ValueError):
            m.validate_public_snapshot(self.snapshot)

    def test_failed_type_and_full_attempts_preserved_alongside_pass_without_raw_argv(
        self,
    ):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            parent = root / "repair-diagnostics/B059-01"
            parent.mkdir(parents=True)
            for name, code, elapsed in [
                ("full-benchmark-failed", 1, 30.570),
                ("typecheck-failed", 2, 4.467),
                ("full-benchmark-passed", 0, 46.488),
            ]:
                data = {
                    "kind": "coordinator_local_repair_validation",
                    "task_id": "B059",
                    "wall_seconds": elapsed,
                    "return_code": code,
                    "argv": ["private command never exported"],
                    "original_worker_outcome_preserved": True,
                }
                (parent / (name + ".json")).write_text(json.dumps(data))
            tree = parent / "tree"
            tree.mkdir()
            (tree / "fake-app.json").write_text(json.dumps(data))
            records, errors = m.local_validation_receipts(root)
            self.assertEqual((len(records), errors), (3, 0))
            self.assertEqual(sum(r["outcome"] == "failed" for r in records), 2)
            self.assertEqual(
                {r["wall_seconds"] for r in records}, {30.570, 4.467, 46.488}
            )
            self.assertNotIn("private command", json.dumps(records))
            self.assertNotIn("argv", json.dumps(records))

    def test_failed_candidate_source_hashes_verified_without_copying_raw_receipt(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            archived = root / "repair-diagnostics/B046-01/failed-root-repair-attempt1"
            archived.mkdir(parents=True)
            benchmarks = root / ".swarm/benchmarks"
            benchmarks.mkdir(parents=True)
            benchmark = json.dumps(
                {"status": "failed", "token_hash": "private marker excluded"}
            ).encode()
            (benchmarks / "failed.json").write_bytes(benchmark)
            patch = b"Synthetic archived failed candidate"
            candidate = archived / "full-candidate.patch"
            candidate.write_bytes(patch)
            (archived / "source-binding.json").write_text(
                json.dumps(
                    {
                        "failed_benchmark_receipt_sha256": m.sha(benchmark),
                        "candidate_sha256": m.sha(patch),
                        "source_matches_failed_benchmark": True,
                    }
                )
            )
            records = m.failed_candidate_bindings(root, root)
            self.assertEqual(len(records), 1)
            self.assertTrue(records[0]["failed_benchmark_receipt_hash_verified"])
            self.assertTrue(records[0]["archived_candidate_hash_verified"])
            self.assertNotIn("private marker", json.dumps(records))
            self.assertNotIn("token_hash", json.dumps(records))
            candidate.write_bytes(b"changed")
            self.assertFalse(
                m.failed_candidate_bindings(root, root)[0][
                    "archived_candidate_hash_verified"
                ]
            )


if __name__ == "__main__":
    unittest.main()
