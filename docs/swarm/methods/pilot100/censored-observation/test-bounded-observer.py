"""Offline tests of the exact inert observer classifier; no main/API execution."""

import ast
import copy
import unittest
from pathlib import Path

SOURCE = Path(__file__).with_name("watch-b096-delegated-get.py.txt")
tree = ast.parse(SOURCE.read_text())
head = next(
    ast.literal_eval(node.value)
    for node in tree.body
    if isinstance(node, ast.Assign)
    and any(
        isinstance(target, ast.Name) and target.id == "HEAD" for target in node.targets
    )
)
function = next(
    node
    for node in tree.body
    if isinstance(node, ast.FunctionDef) and node.name == "classify"
)
scope = {"HEAD": head}
exec(compile(ast.Module(body=[function], type_ignores=[]), str(SOURCE), "exec"), scope)  # noqa: S102


class ObserverClassifierTests(unittest.TestCase):
    def setUp(self):
        self.payload = {
            "total_count": 2,
            "check_runs": [
                {
                    "id": number,
                    "app": {"slug": "github-actions"},
                    "name": "checks",
                    "head_sha": head,
                    "status": "completed",
                    "conclusion": "success",
                }
                for number in [1, 2]
            ],
        }

    def test_actual_complete_exact_head_set_is_green(self):
        self.assertEqual(
            scope["classify"](self.payload), ("all_exact_head_checks_green", 2)
        )

    def test_missing_required_checks_is_not_green(self):
        self.assertNotEqual(
            scope["classify"]({"total_count": 0, "check_runs": []})[0],
            "all_exact_head_checks_green",
        )

    def test_incomplete_page_is_not_green(self):
        self.payload["total_count"] = 3
        self.assertNotEqual(
            scope["classify"](self.payload)[0], "all_exact_head_checks_green"
        )

    def test_wrong_head_is_not_green(self):
        self.payload["check_runs"][0]["head_sha"] = "f" * 40
        self.assertNotEqual(
            scope["classify"](self.payload)[0], "all_exact_head_checks_green"
        )

    def test_pending_is_not_green(self):
        self.payload["check_runs"][0].update(status="in_progress", conclusion=None)
        self.assertNotEqual(
            scope["classify"](self.payload)[0], "all_exact_head_checks_green"
        )

    def test_failed_or_cancelled_is_not_green(self):
        for conclusion in ["failure", "cancelled"]:
            value = copy.deepcopy(self.payload)
            value["check_runs"][0]["conclusion"] = conclusion
            self.assertNotEqual(
                scope["classify"](value)[0], "all_exact_head_checks_green"
            )

    def test_repeated_identifiers_are_not_green(self):
        self.payload["check_runs"][0]["id"] = 2
        self.assertNotEqual(
            scope["classify"](self.payload)[0], "all_exact_head_checks_green"
        )


if __name__ == "__main__":
    unittest.main()
