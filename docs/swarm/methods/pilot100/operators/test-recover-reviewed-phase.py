import importlib.util
import json
import os
import sqlite3
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

SCRIPT = Path(__file__).with_name("recover-reviewed-phase.py")
spec = importlib.util.spec_from_file_location("recovery_phase", SCRIPT)
m = importlib.util.module_from_spec(spec)
with patch.dict(
    os.environ,
    {
        name: str(SCRIPT.parent.resolve())
        for name in (
            "SWARM_RECOVERY_RUN",
            "SWARM_RECOVERY_CONTROLLER_ROOT",
            "SWARM_RECOVERY_PROFILE",
        )
    },
):
    spec.loader.exec_module(m)


def encoded(value):
    return (json.dumps(value) + "\n").encode()


def write(path, value):
    path.write_bytes(encoded(value))


class AdmissionTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.original = self.root / "original"
        self.original.mkdir()
        self.review = self.root / "review.json"
        self.task = {
            "id": "B008",
            "ownership": ["src/component.ts"],
            "sourceRefs": ["contract.md"],
        }
        self.contract = b"Synthetic exact frozen contract.\n"
        (self.root / "contract.md").write_bytes(self.contract)
        self.project = SimpleNamespace(
            root=self.root,
            clone_url="https://github.com/slgarza/Afterimage.git",
            live_enabled=False,
            model_limit_cents=16800,
            infra_limit_cents=5670,
        )
        self.patch = b"Synthetic nonempty unchanged patch bytes.\n"
        h = m.sha(self.patch)
        self.manifest = {
            "repository": self.project.clone_url,
            "base_sha": m.BASE,
            "task": self.task,
            "allow_overlap": False,
        }
        self.report = {
            "task_id": "B008",
            "base_sha": m.BASE,
            "status": "needs_repair",
            "agent_exit": -1,
            "check_exit": 0,
            "sandbox_terminated": True,
            "recovery_errors": [],
            "finished_at": "2026-11-11T16:49:00+00:00",
            "checked_patch_sha256": h,
            "patch_sha256": h,
            "changes": {
                "head_unchanged": True,
                "ownership_violations": [],
                "prohibited_files": [],
                "changed_files": ["src/component.ts"],
                "patch_bytes": len(self.patch),
            },
        }
        self.review_data = {
            "task_id": "B008",
            "reviewer": "launch_packet",
            "independence": True,
            "recovered_patch_review": True,
            "verdict": "approve_recovered",
            "original_report_sha256": m.sha(encoded(self.report)),
            "original_patch_sha256": h,
            "reviewed_patch_sha256": h,
            "original_worker_status": "needs_repair",
            "original_worker_exit": -1,
            "worker_check_exit": 0,
            "reviewed_at_utc": "2026-11-11T17:00:00+00:00",
        }
        self.persist()
        self.mock = patch.object(
            m,
            "frozen",
            side_effect=lambda project, path, ref=m.BASE: (
                encoded(self.task) if path.startswith("swarm/tasks/") else self.contract
            ),
        )
        self.mock.start()
        self.addCleanup(self.mock.stop)

    def persist(self):
        write(self.original / "manifest.json", self.manifest)
        write(self.original / "report.json", self.report)
        (self.original / "changes.patch").write_bytes(self.patch)
        write(self.review, self.review_data)

    def admit(self):
        return m.admit("B008", self.original, self.review, self.project)

    def test_valid_failed_worker_preserved_and_frozen_bindings(self):
        before = {p.name: p.read_bytes() for p in self.original.iterdir()}
        a = self.admit()
        self.assertEqual(a["report"]["status"], "needs_repair")
        self.assertEqual(a["binding"]["original_worker_success_claimed"], False)
        self.assertEqual(
            before, {p.name: p.read_bytes() for p in self.original.iterdir()}
        )

    def test_report_failures_rejected(self):
        for key, value in [
            ("status", "validated"),
            ("agent_exit", 0),
            ("agent_exit", True),
            ("check_exit", 1),
            ("check_exit", False),
            ("sandbox_terminated", False),
            ("recovery_errors", ["missing"]),
            ("patch_redacted", True),
            ("finished_at", "2026-11-11T16:49:00"),
        ]:
            with self.subTest(key=key, value=value):
                saved = dict(self.report)
                self.report[key] = value
                self.persist()
                with self.assertRaises((ValueError, KeyError)):
                    self.admit()
                self.report = saved
                self.persist()

    def test_review_failures_rejected(self):
        for key, value in [
            ("reviewer", "root"),
            ("independence", False),
            ("recovered_patch_review", False),
            ("verdict", "approve"),
            ("task_id", "B009"),
            ("original_report_sha256", "0" * 64),
            ("original_patch_sha256", "0" * 64),
            ("reviewed_patch_sha256", "0" * 64),
            ("original_worker_status", "validated"),
            ("reviewed_at_utc", "2026-11-11T17:00:00"),
            ("reviewed_at_utc", "2026-11-11T16:00:00Z"),
        ]:
            with self.subTest(key=key, value=value):
                saved = dict(self.review_data)
                self.review_data[key] = value
                self.persist()
                with self.assertRaises((ValueError, KeyError)):
                    self.admit()
                self.review_data = saved
                self.persist()

    def test_empty_wronghash_wrongrepo_and_changedcontract_rejected(self):
        (self.original / "changes.patch").write_bytes(b"")
        with self.assertRaises(ValueError):
            self.admit()
        self.persist()
        self.report["checked_patch_sha256"] = "0" * 64
        self.persist()
        with self.assertRaises(ValueError):
            self.admit()
        self.report["checked_patch_sha256"] = m.sha(self.patch)
        self.manifest["repository"] = "https://github.com/other/repo.git"
        self.persist()
        with self.assertRaises(ValueError):
            self.admit()
        self.manifest["repository"] = self.project.clone_url
        self.persist()
        (self.root / "contract.md").write_bytes(b"changed")
        with self.assertRaises(ValueError):
            self.admit()

    def test_ownership_and_original_head_gates(self):
        for key, value in [
            ("head_unchanged", False),
            ("ownership_violations", ["other"]),
            ("prohibited_files", [".env"]),
            ("changed_files", ["outside.ts"]),
        ]:
            saved = dict(self.report["changes"])
            self.report["changes"][key] = value
            self.persist()
            with self.assertRaises(ValueError):
                self.admit()
            self.report["changes"] = saved

    def test_attempt_copy_is_byte_identical_and_never_validated(self):
        a = self.admit()
        attempt = self.root / "attempt"
        attempt.mkdir()
        for name, raw in a["raw"].items():
            m.write_once(attempt / name, raw)
        m.write_once(attempt / "recovery-review.json", a["review_raw"])
        m.write_once(attempt / "recovery-admission.json", encoded(a["binding"]))
        m.verify_copy(attempt, a)
        self.assertEqual(
            json.loads((attempt / "report.json").read_text())["status"], "needs_repair"
        )
        (attempt / "report.json").chmod(0o600)
        (attempt / "report.json").write_bytes(b"{}")
        with self.assertRaises(ValueError):
            m.verify_copy(attempt, a)

    def test_plan_creates_no_attempt_or_mutation(self):
        attempt = self.root / "new-attempt"
        with (
            patch.object(m, "gate"),
            patch.object(
                m, "context", return_value=(self.project, self.original, self.review)
            ),
            patch.object(m, "policy_check"),
            patch.object(
                m.pi, "prepare", side_effect=AssertionError("prepare forbidden")
            ),
            patch.object(
                m.pi, "publish", side_effect=AssertionError("publish forbidden")
            ),
            patch.object(m.pi, "merge", side_effect=AssertionError("merge forbidden")),
        ):
            result = m.execute("plan", "B008", attempt)
        self.assertFalse(result["creates_attempt"])
        self.assertFalse(attempt.exists())

    def test_stopped_expired_and_small_window_gate(self):
        with patch.object(m, "RUN", self.root):
            for remaining in (-1, 10):
                write(
                    self.root / "workload-release.json",
                    {"delivery_cutoff_utc": "2026-11-11T00:00:00Z"},
                )
                with (
                    patch.object(
                        m.time,
                        "time",
                        return_value=m.aware("2026-11-11T00:00:00Z").timestamp()
                        - remaining,
                    ),
                    self.assertRaises(ValueError),
                ):
                    m.gate()
            write(
                self.root / "workload-release.json",
                {"delivery_cutoff_utc": "2099-11-11T00:00:00Z"},
            )
            (self.root / "integration-control.stop").write_text("stop")
            with self.assertRaises(ValueError):
                m.gate()

    def test_cumulative_policy_read_only_and_mismatch_before_remote_write(self):
        path = self.root / "control.sqlite3"
        with sqlite3.connect(path) as db:
            db.execute(
                "CREATE TABLE budget_policy(singleton INTEGER,model_limit_cents INTEGER,infra_limit_cents INTEGER)"
            )
            db.execute("INSERT INTO budget_policy VALUES(1,16800,5670)")
        before = path.read_bytes()
        with patch.object(m, "common_state", return_value=self.root):
            m.policy_check(self.project)
            self.project.model_limit_cents = 1800
            with self.assertRaises(ValueError):
                m.policy_check(self.project)
        self.assertEqual(before, path.read_bytes())


if __name__ == "__main__":
    unittest.main()
