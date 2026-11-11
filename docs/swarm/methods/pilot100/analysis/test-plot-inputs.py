"""Optional Matplotlib tests; synthetic inputs only, no real run state."""

import copy
import importlib.util
import io
import json
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from unittest.mock import patch

SCRIPT = Path(__file__).with_name("plot-pilot-evidence.py")
spec = importlib.util.spec_from_file_location("plot_under_test", SCRIPT)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class PlotClockTests(unittest.TestCase):
    def setUp(self):
        self.delivery = {
            "clock": {
                "T0_utc": "2026-11-11T16:00:00Z",
                "T1_utc": None,
                "full_delivery_finished": False,
            },
            "as_of_utc": "2026-11-11T18:00:00Z",
            "original_worker_outcomes": {
                "status_counts": {"needs_repair": 100},
                "validated_workers": 0,
            },
            "provisional": {"product_module_units": 1, "support_units": 1},
            "rows": [],
        }
        for task, feature, at in [
            ("B003", True, "16:55:00"),
            ("B077", False, "16:57:00"),
        ]:
            self.delivery["rows"].append(
                {
                    "task_id": task,
                    "provisional_qualified": True,
                    "binding_checks": {"verified": True},
                    "workload_counts_as_feature_only_not_delivery": feature,
                    "historical_pr_chain": [
                        {"pr_url": "https://github.com/slgarza/Afterimage/pull/239"}
                    ]
                    if task == "B003"
                    else [],
                    "recovery": {
                        "merged_at_utc": "2026-11-11T" + at + "Z",
                        "combined_green_observed_at_utc": "2026-11-11T" + at + "Z",
                        "attribution": "coordinator_code_or_test_repair",
                        "corrective_pr_for_existing_module": task == "B003",
                    },
                }
            )
        self.activity = {
            "rows": [
                {
                    "task_id": f"B{i:03}",
                    "process_span": {
                        "started_at_utc": "2026-11-11T16:01:00Z",
                        "ended_at_utc": "2026-11-11T16:31:00Z",
                    },
                }
                for i in range(1, 101)
            ]
        }

    def test_interim_uses_asof_without_inventing_final_clock_or_acceptance(self):
        result = m.prepare_inputs(self.delivery, self.activity, 1800)
        self.assertEqual(result["plot_minutes_from_T0"], 120)
        self.assertAlmostEqual(
            result["provisional_modules_per_plotted_clock_hour"], 0.5
        )
        self.assertIsNone(result["final_T1_utc"])
        self.assertIsNone(result["final_accepted_count"])

    def test_closed_T1_controls_axis_and_denominator_even_when_publication_is_later(
        self,
    ):
        self.delivery["clock"].update(
            T1_utc="2026-11-11T17:00:00Z", full_delivery_finished=True
        )
        result = m.prepare_inputs(self.delivery, self.activity, 1800)
        self.assertEqual(result["plot_minutes_from_T0"], 60)
        self.assertEqual(result["asof_minutes_from_T0"], 120)
        self.assertEqual(result["plot_clock_kind"], "T1")
        self.assertAlmostEqual(result["provisional_modules_per_plotted_clock_hour"], 1)

    def test_corrective_history_never_adds_a_second_feature_and_original_failures_visible(
        self,
    ):
        result = m.prepare_inputs(self.delivery, self.activity, 1800)
        self.assertEqual(len(result["events"]), 2)
        self.assertEqual(sum(e["task_id"] == "B003" for e in result["events"]), 1)
        self.assertEqual(sum(e["category"] != "support" for e in result["events"]), 1)
        self.assertEqual(result["original_workers_needs_repair"], 100)
        self.assertEqual(result["original_workers_validated"], 0)

    def test_qualification_after_closed_clock_or_future_clock_is_rejected(self):
        before = copy.deepcopy(self.delivery)
        self.delivery["clock"].update(
            T1_utc="2026-11-11T16:50:00Z", full_delivery_finished=True
        )
        with self.assertRaises(ValueError):
            m.prepare_inputs(self.delivery, self.activity, 1800)
        self.delivery = before
        self.delivery["clock"].update(
            T1_utc="2026-11-11T18:01:00Z", full_delivery_finished=True
        )
        with self.assertRaises(ValueError):
            m.prepare_inputs(self.delivery, self.activity, 1800)

    def test_final_cli_artifacts_preserve_closed_clock_and_provisional_receipt(self):
        self.delivery["clock"].update(
            T1_utc="2026-11-11T17:00:00Z", full_delivery_finished=True
        )
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            delivery = root / "delivery.json"
            activity = root / "activity.json"
            output = root / "output"
            delivery.write_text(json.dumps(self.delivery))
            activity.write_text(json.dumps(self.activity))
            argv = [
                str(SCRIPT),
                "--delivery",
                str(delivery),
                "--activity",
                str(activity),
                "--output-dir",
                str(output),
            ]
            with patch("sys.argv", argv), redirect_stdout(io.StringIO()):
                m.main()
            receipt = json.loads(
                (output / "plot-artifacts-public-receipt.json").read_text()
            )
            inputs = json.loads(
                (output / "plot-inputs-public-allowlist.json").read_text()
            )
            self.assertEqual(
                receipt["kind"],
                "standalone_completed_clock_provisional_pilot_figure",
            )
            self.assertEqual(receipt["source"]["plot_clock_kind"], "T1")
            self.assertEqual(inputs["plot_minutes_from_T0"], 60)
            self.assertEqual(inputs["asof_minutes_from_T0"], 120)
            self.assertTrue(receipt["source"]["final_acceptance_unknown"])
            png = next(output.glob("*.png"))
            self.assertTrue(png.read_bytes().startswith(b"\x89PNG\r\n\x1a\n"))
            self.assertIn("<svg", next(output.glob("*.svg")).read_text())


if __name__ == "__main__":
    unittest.main()
