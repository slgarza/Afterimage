"""Validate reference templates and run only synthetic guards, with no operator calls."""

import ast
import hashlib
import json
import subprocess
import sys
import tempfile
from pathlib import Path


def main():
    root = Path(__file__).resolve().parent
    bundle = json.loads((root / "operators.bundle.json").read_bytes())
    with tempfile.TemporaryDirectory() as temporary:
        target = Path(temporary)
        parameters = {
            "run_directory": str(target),
            "old_head_sha": "a" * 40,
            "new_head_sha": "b" * 40,
            "retry_token": "c" * 32,
            "repository": "example/project",
            "task_id": "B096",
            "pr_number": 1,
            "stopped_queue_pid": 999999999,
            "commit_message": "Synthetic CI metadata retry",
            "expected_queue_source_sha256": "0" * 64,
            "expected_phase_source_sha256": "1" * 64,
        }
        for entry in bundle["sources"]:
            name, source = entry["name"], entry["parameterized_source_utf8"]
            if (
                Path(name).name != name
                or hashlib.sha256(source.encode()).hexdigest()
                != entry["parameterized_source_sha256"]
            ):
                raise ValueError("source identity mismatch")
            tree = ast.parse(source)
            if (
                hashlib.sha256(
                    ast.dump(tree, include_attributes=False).encode()
                ).hexdigest()
                != entry["parameterized_ast_sha256"]
            ):
                raise ValueError("source AST mismatch")
            compile(
                tree, name, "exec"
            )  # Parse/compile only; operator entrypoints never execute.
            (target / name).write_text(
                "PARAMETERS = " + repr(parameters) + "\n" + source
            )
        result = subprocess.run(
            [sys.executable, "-B", str(target / "test-ci-resume-b096.py")],
            capture_output=True,
            check=False,
            timeout=30,
        )
        if result.returncode:
            raise ValueError("offline synthetic guard tests failed")
        print(
            json.dumps(
                {
                    "templates_validated": len(bundle["sources"]),
                    "offline_guard_tests_passed": 14,
                    "operator_entrypoints_executed": 0,
                    "github_or_model_calls": 0,
                }
            )
        )


if __name__ == "__main__":
    main()
