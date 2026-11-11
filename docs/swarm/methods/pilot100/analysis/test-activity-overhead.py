import importlib.util
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).with_name("analyze-activity-overhead.py")
spec = importlib.util.spec_from_file_location("activity_overhead", SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class EvidenceAnalysisTests(unittest.TestCase):
    def test_overlapping_commands_in_one_task_do_not_inflate_distinct_agents(self):
        values = {f"B{i:03}": [(0, 10)] for i in range(1, 100)}
        values["B100"] = [(0, 8), (3, 10)]
        observed = module.overlap(values)
        self.assertEqual(observed["peak_distinct_tasks"], 100)
        self.assertEqual(observed["seconds_at_or_above_100"], 10)

    def test_touching_end_and_start_do_not_create_false_100_overlap(self):
        values = {f"B{i:03}": [(0, 10) if i <= 50 else (10, 20)] for i in range(1, 101)}
        observed = module.overlap(values)
        self.assertEqual(observed["peak_distinct_tasks"], 50)
        self.assertEqual(observed["seconds_at_or_above_100"], 0)

    def test_process_envelopes_do_not_prove_continuous_command_execution(self):
        envelopes = {str(i): [(0, 100)] for i in range(100)}
        commands = {str(i): [(i, i + 0.5)] for i in range(100)}
        self.assertEqual(module.overlap(envelopes)["seconds_at_or_above_100"], 100)
        self.assertEqual(module.overlap(commands)["peak_distinct_tasks"], 1)
        self.assertEqual(module.overlap(commands)["seconds_at_or_above_100"], 0)

    def test_timestamp_requires_aware_clock_and_normalizes_offsets(self):
        self.assertEqual(
            module.timestamp("2026-11-11T10:00:00-06:00"),
            module.timestamp("2026-11-11T16:00:00Z"),
        )
        with self.assertRaises(ValueError):
            module.timestamp("2026-11-11T16:00:00")

    def test_classification_never_executes_command_substitution(self):
        with tempfile.TemporaryDirectory() as temp:
            marker = Path(temp) / "must-not-exist"
            module.classify(f"/bin/bash -lc 'echo $(touch {marker})'", ["README.md"])
            self.assertFalse(marker.exists())

    def test_categories_are_nonexclusive_and_doc_path_is_only_a_mention(self):
        labels, documents = module.classify(
            "sed -n '1,5p' README.md > note.txt", ["README.md"]
        )
        self.assertEqual(documents, ["README.md"])
        self.assertTrue(
            {"read_like", "write_like", "canonical_document_read_like"} <= labels
        )
        self.assertNotIn("full_file_read", labels)


if __name__ == "__main__":
    unittest.main()
