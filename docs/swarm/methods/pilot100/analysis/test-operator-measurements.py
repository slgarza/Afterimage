import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).with_name("collect-delivery-allowlist.py")
spec = importlib.util.spec_from_file_location(
    "operator_measurements_under_test", SCRIPT
)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class OperatorMeasurementTests(unittest.TestCase):
    def test_domain_duration_fallback_preserves_origin_and_null_is_unknown(self):
        self.assertEqual(
            m.measured_seconds(
                {"monotonic_elapsed_seconds": 0.615882},
                ("review_duration_seconds", "monotonic_elapsed_seconds"),
            ),
            (0.615882, "monotonic_elapsed_seconds"),
        )
        self.assertEqual(
            m.measured_seconds({}, ("monotonic_elapsed_seconds",)), (None, None)
        )
        self.assertEqual(
            m.measured_seconds(
                {"review_duration_seconds": 0}, ("review_duration_seconds",)
            ),
            (0, "review_duration_seconds"),
        )

    def test_duration_rejects_bool_string_negative_and_nonfinite_values(self):
        for value in [False, "1", -1, float("nan"), float("inf")]:
            with self.assertRaises(ValueError):
                m.measured_seconds({"seconds": value}, ("seconds",))

    def test_shared_invocation_is_counted_once_without_nested_case_multiplication(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            path = root / "repair-diagnostics/domain-six-originals-01/completed.json"
            path.parent.mkdir(parents=True)
            path.write_text(
                json.dumps(
                    {
                        "started_at_utc": "2026-11-11T17:00:00Z",
                        "finished_at_utc": "2026-11-11T17:01:00Z",
                        "monotonic_elapsed_seconds": 59.681105,
                        "phase_checks": [{"seconds": 40}, {"seconds": 40}],
                    }
                )
            )
            result = m.operator_measurements(root)
            rows = [
                x
                for x in result["shared_invocations"]
                if x["measurement_id"] == "domain_six_originals"
            ]
            self.assertEqual(len(rows), 1)
            self.assertEqual(rows[0]["measured_segment_seconds"], 59.681105)
            self.assertFalse(rows[0]["case_multiplier_applied"])
            self.assertTrue(
                rows[0]["nested_subphase_durations_are_subsets_not_additive"]
            )
            missing = [
                x for x in result["shared_invocations"] if not x["source_available"]
            ]
            self.assertTrue(all(x["measured_segment_seconds"] is None for x in missing))

    def test_authoring_envelopes_cover_distinct_tasks_and_do_not_sum_overlap(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            for attempt, start, end in [
                ("B003-01", "17:00:00", "17:05:00"),
                ("B003-02", "17:06:00", "17:08:00"),
                ("B055-01", "17:02:00", "17:07:00"),
            ]:
                task = attempt.split("-")[0]
                a = root / "repair-diagnostics" / attempt / "integration.json"
                a.parent.mkdir(parents=True)
                a.write_text(
                    json.dumps({"started_at_utc": "2026-11-11T" + start + "Z"})
                )
                b = root / "coordinator-repairs" / attempt / "repair.json"
                b.parent.mkdir(parents=True)
                b.write_text(
                    json.dumps(
                        {"task_id": task, "recorded_at_utc": "2026-11-11T" + end + "Z"}
                    )
                )
            (root / "recovery-coordinator-repairs-complete.json").write_text(
                json.dumps({"coordinator_repaired_candidates": 2})
            )
            result = m.operator_measurements(root)
            self.assertEqual(len(result["coordinator_authoring_attempt_envelopes"]), 3)
            self.assertEqual(len(result["coordinator_authoring_task_envelopes"]), 2)
            b003 = next(
                x
                for x in result["coordinator_authoring_task_envelopes"]
                if x["task_id"] == "B003"
            )
            self.assertEqual(b003["outer_envelope_seconds"], 480)
            self.assertTrue(result["coverage"]["all_declared_task_envelopes_present"])
            self.assertTrue(
                result["coverage"][
                    "durations_are_not_summed_or_multiplied_by_test_cases"
                ]
            )
            self.assertNotIn("total_person_seconds", result)

    def test_missing_authoring_start_is_null_and_coverage_not_claimed(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            path = root / "coordinator-repairs/B055-01/repair.json"
            path.parent.mkdir(parents=True)
            path.write_text(
                json.dumps(
                    {"task_id": "B055", "recorded_at_utc": "2026-11-11T17:10:00Z"}
                )
            )
            result = m.operator_measurements(root)
            self.assertIsNone(
                result["coordinator_authoring_attempt_envelopes"][0]["envelope_seconds"]
            )
            self.assertFalse(result["coverage"]["all_declared_task_envelopes_present"])
            self.assertFalse(
                result["coverage"][
                    "all_historical_time_or_exclusive_attention_measured"
                ]
            )


if __name__ == "__main__":
    unittest.main()
