"""Synthetic censored-window classification/clock/figure tests; no run reads."""

import importlib.util
import json
import tempfile
import unittest
from datetime import UTC, datetime
from pathlib import Path

SCRIPT = Path(__file__).with_name("close-censored-observation.py")
spec = importlib.util.spec_from_file_location("censor_under_test", SCRIPT)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class CensoredObservationTests(unittest.TestCase):
    def setUp(self):
        self.release = {
            "t0_utc": "2026-11-11T16:00:00Z",
            "delivery_cutoff_utc": "2026-11-11T22:00:00Z",
        }
        self.row = {
            "task_id": "B096",
            "provisional_qualified": False,
            "workload_counts_as_feature_only_not_delivery": True,
        }

    def test_clock_refuses_unelapsed_cutoff_and_keeps_actual_capture_separate(self):
        with self.assertRaises(ValueError):
            m.observed_clock(self.release, datetime(2026, 11, 11, 21, 59, tzinfo=UTC))
        result = m.observed_clock(
            self.release, datetime(2026, 11, 11, 22, 3, tzinfo=UTC)
        )
        self.assertIsNone(result["T1_utc"])
        self.assertFalse(result["full_delivery_finished"])
        self.assertEqual(result["observation_window_seconds"], 21600)
        self.assertEqual(
            result["observation_closed_at_utc"], "2026-11-11T22:03:00+00:00"
        )
        self.assertEqual(
            result["frozen_delivery_window_cutoff_utc"], "2026-11-11T22:00:00+00:00"
        )

    def test_invalid_or_shortened_window_is_rejected(self):
        self.release["delivery_cutoff_utc"] = "2026-11-11T21:00:00Z"
        with self.assertRaises(ValueError):
            m.observed_clock(self.release, datetime(2026, 11, 11, 22, tzinfo=UTC))

    def test_pending_stop_bookkeeping_is_not_relabelled_source_failure(self):
        queued = {"status": "head_ci_failed_or_cutoff"}
        events = [
            {"kind": "head_ci_wait_finished", "task_id": "B096", "status": "pending"}
        ]
        self.assertEqual(
            m.classification(self.row, queued, True, events),
            "published_head_ci_unresolved",
        )
        events[0]["status"] = "failed"
        self.assertEqual(
            m.classification(self.row, queued, True, events), "published_head_ci_failed"
        )

    def test_empty_patch_and_unattempted_recovery_are_distinct(self):
        self.assertEqual(
            m.classification(self.row, None, False, []), "original_empty_patch"
        )
        self.assertEqual(
            m.classification(self.row, None, True, []),
            "nonempty_not_attempted_in_recovery",
        )

    def test_original_artifact_hash_binding_rejects_tampering_without_writes(self):
        with tempfile.TemporaryDirectory() as temp:
            batch = Path(temp)
            task = batch / "B096"
            task.mkdir()
            row = {"task_id": "B096"}
            for name, key in [
                ("changes.patch", "original_patch_sha256"),
                ("report.json", "original_report_sha256"),
                ("manifest.json", "original_manifest_sha256"),
            ]:
                raw = b"original fixture " + name.encode()
                (task / name).write_bytes(raw)
                row[key] = m.sha(raw)
            self.assertTrue(m.checked_original_bytes(batch, row)["changes.patch"])
            (task / "changes.patch").write_bytes(b"")
            with self.assertRaises(ValueError):
                m.checked_original_bytes(batch, row)
            self.assertEqual((task / "changes.patch").read_bytes(), b"")

    def test_qualified_product_support_and_late_green_are_distinct(self):
        self.row["provisional_qualified"] = True
        self.assertEqual(
            m.classification(self.row, {}, True, []), "provisional_product"
        )
        self.row["workload_counts_as_feature_only_not_delivery"] = False
        self.assertEqual(
            m.classification(self.row, {}, True, []), "provisional_support"
        )
        self.row["provisional_qualified"] = False
        self.assertEqual(
            m.classification(
                self.row, {"status": "merged_green_provisional"}, True, []
            ),
            "recorded_green_but_not_qualified_for_frozen_window",
        )

    def test_observer_projection_rejects_future_or_unreviewed_values(self):
        record = {
            "attempt": 1,
            "return_code": 0,
            "status": "missing_required_checks",
            "github_actions_check_count": 0,
            "finished_at_utc": "2026-11-11T21:59:00Z",
        }
        now = datetime(2026, 11, 11, 22, 3, tzinfo=UTC)
        m.validate_observer_record(record, now)
        for key, value in [
            ("attempt", True),
            ("status", "unreviewed-private-value"),
            ("github_actions_check_count", False),
            ("finished_at_utc", "2026-11-11T22:04:00Z"),
        ]:
            prior = record[key]
            record[key] = value
            with self.assertRaises(ValueError):
                m.validate_observer_record(record, now)
            record[key] = prior

    def test_synthetic_figure_keeps_administrative_end_without_T1_or_invoice(self):
        result = {
            "clock": m.observed_clock(
                self.release, datetime(2026, 11, 11, 22, 3, tzinfo=UTC)
            ),
            "captured_at_utc": "2026-11-11T22:03:00Z",
            "actual_last_queue_process_stop_at_utc": "2026-11-11T20:30:00Z",
            "provisional_product_units": 1,
            "provisional_support_units": 1,
            "plot_events": [
                {
                    "task_id": "B003",
                    "category": "repaired",
                    "qualified_at_utc": "2026-11-11T18:00:00Z",
                },
                {
                    "task_id": "B077",
                    "category": "support",
                    "qualified_at_utc": "2026-11-11T19:00:00Z",
                },
            ],
        }
        activity = {
            "rows": [
                {
                    "task_id": f"B{i:03}",
                    "process_span": {"started_at_utc": "2026-11-11T16:01:00Z"},
                }
                for i in range(1, 101)
            ]
        }
        with tempfile.TemporaryDirectory() as temp:
            out = Path(temp)
            receipt = m.plot(result, activity, out)
            inputs = json.loads(
                (out / "censored-plot-inputs-public-allowlist.json").read_text()
            )
            self.assertEqual(
                inputs["administrative_window_end_utc"], "2026-11-11T22:00:00+00:00"
            )
            self.assertEqual(inputs["actual_capture_utc"], "2026-11-11T22:03:00Z")
            self.assertIsNone(inputs["completed_workload_T1_utc"])
            self.assertIsNone(receipt["metadata"]["T1_utc"])
            self.assertFalse(receipt["final_accepted_or_completed_delivery_claimed"])
            self.assertTrue(next(out.glob("*.png")).read_bytes().startswith(b"\x89PNG"))


if __name__ == "__main__":
    unittest.main()
