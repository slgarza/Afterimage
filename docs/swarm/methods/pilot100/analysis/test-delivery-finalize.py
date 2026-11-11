"""Synthetic temporary fixtures; never finalize the real pilot or forge real evidence."""

import copy
import importlib.util
import json
import tempfile
import unittest
from collections import Counter
from datetime import datetime
from pathlib import Path
from unittest.mock import patch

SCRIPT = Path(__file__).with_name("collect-delivery-allowlist.py")
spec = importlib.util.spec_from_file_location("finalize_under_test", SCRIPT)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class FinalClockTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name)
        self.now = datetime.fromisoformat("2026-11-11T20:02:00+00:00")
        self.release = {
            "t0_utc": "2026-11-11T16:00:00Z",
            "delivery_cutoff_utc": "2026-11-11T22:00:00Z",
        }
        self.state = {
            "paused": False,
            "tasks": {
                f"B{i:03}": {"status": "original_empty_patch"} for i in range(1, 101)
            },
            "post_merge_checks": {
                "B003": {
                    "status": "passed",
                    "merged_tree_verified": True,
                    "requires_coordinator_reconciliation": False,
                    "observed_at_utc": "2026-11-11T19:59:00Z",
                }
            },
        }
        self.state["tasks"]["B003"]["status"] = "merged_green_provisional"
        self.stop = {
            "kind": "integration_queue_stopped",
            "at_utc": "2026-11-11T20:00:00Z",
            "paused": False,
            "cutoff_reached": False,
        }
        self.flags = {
            name: {"completed_at_utc": "2026-11-11T18:00:00Z"}
            for name in [
                "recovery-ui-review-complete.json",
                "recovery-domain-review-complete.json",
                "recovery-coordinator-repairs-complete.json",
            ]
        }
        self.flags["recovery-coordinator-repairs-complete.json"].update(
            actor="root", completed=True, new_paid_workers=0
        )
        self.result = {
            "as_of_utc": "2026-11-11T20:01:00Z",
            "clock": {
                "T0_utc": self.release["t0_utc"],
                "delivery_cutoff_utc": self.release["delivery_cutoff_utc"],
                "T1_utc": None,
            },
            "source_evidence": {},
            "rows": [
                {
                    "task_id": f"B{i:03}",
                    "provisional_qualified": i == 3,
                    "binding_checks": {
                        "original_and_review_bindings": True,
                        "inside_frozen_delivery_window": True,
                    }
                    if i == 3
                    else {},
                    "workload_counts_as_feature_only_not_delivery": True,
                    "recovery": {
                        "review_finished_at_utc": "2026-11-11T19:00:00Z",
                        "merged_at_utc": "2026-11-11T19:58:00Z",
                        "combined_green_observed_at_utc": "2026-11-11T19:59:00Z",
                    }
                    if i == 3
                    else None,
                }
                for i in range(1, 101)
            ],
            "provisional": {"qualified_distinct_tasks": 1, "product_module_units": 1},
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
            "operator_phase_operations": [],
            "local_validation_attempts": [],
        }
        self.persist()

    def persist(self, sync_counts=True):
        if sync_counts:
            self.stop["task_status_counts"] = dict(
                Counter(v["status"] for v in self.state["tasks"].values())
            )
        values = {
            "recovery-queue-state.json": self.state,
            "workload-release.json": self.release,
            **self.flags,
        }
        for name, value in values.items():
            (self.root / name).write_text(json.dumps(value) + "\n")
        (self.root / "recovery-journal.jsonl").write_text(json.dumps(self.stop) + "\n")
        self.result["source_evidence"].update(
            queue_state_sha256=m.sha(
                (self.root / "recovery-queue-state.json").read_bytes()
            ),
            queue_journal_sha256=m.sha(
                (self.root / "recovery-journal.jsonl").read_bytes()
            ),
            workload_release_sha256=m.sha(
                (self.root / "workload-release.json").read_bytes()
            ),
        )

    def finalize(self):
        return m.finalize_delivery_clock(
            copy.deepcopy(self.result), self.root, self.now
        )

    def test_valid_complete_fixture_closes_clock_without_inventing_quality_or_cost(
        self,
    ):
        before = {p.name: p.read_bytes() for p in self.root.iterdir()}
        result = self.finalize()
        m.validate_public_snapshot(result)
        self.assertEqual(result["clock"]["T1_utc"], "2026-11-11T20:00:00+00:00")
        self.assertEqual(result["clock"]["completed_delivery_clock_seconds"], 14400)
        self.assertAlmostEqual(
            result["provisional"][
                "PROVISIONAL_product_modules_per_completed_clock_hour"
            ],
            0.25,
        )
        self.assertTrue(all(v is None for v in result["final_metrics"].values()))
        self.assertEqual(before, {p.name: p.read_bytes() for p in self.root.iterdir()})

    def test_active_unknown_missing_or_paused_queue_is_rejected(self):
        for status in [
            "integrating",
            "waiting_head_ci",
            "merged_pending_combined_ci",
            "merge_outcome_requires_reconciliation",
            "merge_tree_requires_reconciliation",
            "unknown",
        ]:
            self.state["tasks"]["B001"]["status"] = status
            self.persist()
            with self.assertRaises(ValueError):
                self.finalize()
        self.state["tasks"]["B001"]["status"] = "original_empty_patch"
        del self.state["tasks"]["B100"]
        self.persist()
        with self.assertRaises(ValueError):
            self.finalize()

    def test_missing_last_stop_or_partial_journal_is_rejected(self):
        self.stop["kind"] = "operation_finished"
        self.persist()
        with self.assertRaises(ValueError):
            self.finalize()
        self.stop["kind"] = "integration_queue_stopped"
        self.persist()
        p = self.root / "recovery-journal.jsonl"
        p.write_bytes(p.read_bytes().rstrip(b"\n"))
        self.result["source_evidence"]["queue_journal_sha256"] = m.sha(p.read_bytes())
        with self.assertRaises(ValueError):
            self.finalize()

    def test_changed_state_or_release_and_forged_result_clock_are_rejected(self):
        for name in ["recovery-queue-state.json", "workload-release.json"]:
            self.persist()
            p = self.root / name
            p.write_bytes(p.read_bytes() + b" ")
            with self.assertRaises(ValueError):
                self.finalize()
        self.persist()
        self.result["clock"]["T0_utc"] = "2026-11-11T17:00:00Z"
        with self.assertRaises(ValueError):
            self.finalize()

    def test_future_stop_and_stop_after_snapshot_asof_are_rejected(self):
        for stop in ["2026-11-11T20:03:00Z", "2026-11-11T20:01:30Z"]:
            self.stop["at_utc"] = stop
            self.persist()
            with self.assertRaises(ValueError):
                self.finalize()

    def test_post_ci_pending_failed_tree_or_reconciliation_blocks_closure(self):
        source = copy.deepcopy(self.state["post_merge_checks"]["B003"])
        for key, value in [
            ("status", "pending"),
            ("status", "failed"),
            ("merged_tree_verified", False),
            ("requires_coordinator_reconciliation", True),
        ]:
            self.state["post_merge_checks"]["B003"] = {**source, key: value}
            self.persist()
            with self.assertRaises(ValueError):
                self.finalize()

    def test_root_flag_must_exist_have_completed_and_integer_zero_new_paid_workers(
        self,
    ):
        name = "recovery-coordinator-repairs-complete.json"
        original = copy.deepcopy(self.flags[name])
        (self.root / name).unlink()
        with self.assertRaises(ValueError):
            self.finalize()
        for key, value in [
            ("completed", False),
            ("actor", "other"),
            ("new_paid_workers", False),
            ("new_paid_workers", 0.0),
            ("new_paid_workers", "0"),
            ("new_paid_workers", 1),
        ]:
            self.flags[name] = {**original, key: value}
            self.persist()
            with self.assertRaises(ValueError):
                self.finalize()

    def test_actual_stop_must_follow_recorded_review_operations_and_validation(self):
        for field in [
            "review_finished_at_utc",
            "merged_at_utc",
            "combined_green_observed_at_utc",
        ]:
            fixture = copy.deepcopy(self.result)
            self.result["rows"][2]["recovery"][field] = "2026-11-11T20:01:00Z"
            with self.assertRaises(ValueError):
                self.finalize()
            self.result = fixture
        self.result["local_validation_attempts"] = [
            {"ended_at_utc": "2026-11-11T20:01:00Z"}
        ]
        with self.assertRaises(ValueError):
            self.finalize()

    def test_owner_flag_or_workload_release_mutation_during_check_is_rejected(self):
        actual = m.read
        for mutate in [
            "recovery-coordinator-repairs-complete.json",
            "workload-release.json",
        ]:
            self.persist()
            seen = []

            def read_then_mutate(path, mutate=mutate, seen=seen):
                raw, value = actual(path)
                if path.name == mutate and not seen:
                    path.write_bytes(raw + b" ")
                    seen.append(True)
                return raw, value

            with (
                patch.object(m, "read", side_effect=read_then_mutate),
                self.assertRaises(ValueError),
            ):
                self.finalize()

    def test_cutoff_clips_clock_and_excludes_late_module_credit(self):
        self.stop["at_utc"] = "2026-11-11T23:00:00Z"
        self.stop["cutoff_reached"] = True
        self.result["as_of_utc"] = "2026-11-11T23:01:00Z"
        self.now = datetime.fromisoformat("2026-11-11T23:02:00+00:00")
        self.result["rows"][2]["binding_checks"]["inside_frozen_delivery_window"] = (
            False
        )
        self.result["rows"][2]["provisional_qualified"] = False
        self.result["provisional"].update(
            qualified_distinct_tasks=0, product_module_units=0
        )
        self.persist()
        result = self.finalize()
        self.assertEqual(result["clock"]["T1_utc"], "2026-11-11T22:00:00+00:00")
        self.assertEqual(result["clock"]["completed_delivery_clock_seconds"], 21600)
        self.assertEqual(
            result["completion"]["late_merged_tasks_excluded_from_provisional_credit"],
            ["B003"],
        )
        m.validate_public_snapshot(result)

    def test_stop_event_terminal_counts_must_match_state(self):
        self.stop["task_status_counts"] = {"original_empty_patch": 100}
        self.persist(sync_counts=False)
        with self.assertRaises(ValueError):
            self.finalize()


if __name__ == "__main__":
    unittest.main()
