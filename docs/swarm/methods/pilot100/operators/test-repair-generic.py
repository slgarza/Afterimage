import ast
import hashlib
import json
import tempfile
import time
import uuid
from datetime import UTC, datetime
from pathlib import Path

script = Path(__file__).with_name("repair-reviewed-phase.py")
tree = ast.parse(script.read_text())
module = ast.Module(
    body=[
        x
        for x in tree.body
        if isinstance(x, (ast.Import, ast.ImportFrom, ast.FunctionDef))
    ],
    type_ignores=[],
)
scope = {}
exec(compile(module, str(script), "exec"), scope)  # noqa: S102  # Execute the selected local operator AST only in synthetic offline tests.
passed = []
with tempfile.TemporaryDirectory() as tmp:
    root = Path(tmp)
    batch = root / "batch"
    original = batch / "B003"
    original.mkdir(parents=True)
    directory = root / "candidate"
    directory.mkdir()
    reviews = root / "reviews/repairs"
    reviews.mkdir(parents=True)
    scope.update(RUN=root, BATCH=batch, DIRECTORY=directory, TASK="B003")
    patch = b"Synthetic original patch, not a real task approval"
    new = b"Synthetic repaired patch"
    delta = b"Synthetic test-only delta"
    sha = lambda data: hashlib.sha256(data).hexdigest()
    report = {
        "task_id": "B003",
        "status": "needs_repair",
        "agent_exit": -1,
        "check_exit": 1,
        "sandbox_terminated": True,
        "recovery_errors": [],
        "changes": {
            "head_unchanged": True,
            "ownership_violations": [],
            "prohibited_files": [],
        },
        "checked_patch_sha256": sha(patch),
        "patch_sha256": sha(patch),
        "base_sha": "79404fe6d4ed5cf1b59b5610a3aebbe9d1f8021f",
    }
    task = {"id": "B003", "ownership": ["apps/client/src/pilot100/avatar-picker"]}
    manifest = {
        "repository": "https://github.com/slgarza/Afterimage.git",
        "base_sha": report["base_sha"],
        "task": task,
    }
    reportbytes = json.dumps(report).encode()
    for name, data in [
        ("report.json", reportbytes),
        ("manifest.json", json.dumps(manifest).encode()),
        ("changes.patch", patch),
    ]:
        (original / name).write_bytes(data)
    for source, target in [
        ("report.json", "original-report.json"),
        ("manifest.json", "manifest.json"),
        ("changes.patch", "original-worker.patch"),
    ]:
        (directory / target).write_bytes((original / source).read_bytes())
    (directory / "changes.patch").write_bytes(new)
    (directory / "coordinator-delta.patch").write_bytes(delta)
    repair = {
        "original_patch_sha256": sha(patch),
        "original_report_sha256": sha(reportbytes),
        "repaired_patch_sha256": sha(new),
        "coordinator_delta_sha256": sha(delta),
        "actor": "root",
        "production_code_changed_by_coordinator": False,
        "full_validation_passed": True,
        "changed_by_coordinator": [
            "apps/client/src/pilot100/avatar-picker/AvatarPicker.test.tsx"
        ],
    }
    (directory / "repair.json").write_text(json.dumps(repair))
    review = {
        "task_id": "B003",
        "reviewer": "launch_packet",
        "verdict": "approve_repaired",
        "independence": True,
        "reviewed_at_utc": "2026-11-11T00:00:00Z",
        "original_patch_sha256": sha(patch),
        "original_report_sha256": sha(reportbytes),
        "reviewed_patch_sha256": sha(new),
        "coordinator_delta_sha256": sha(delta),
    }
    rp = reviews / "B003.json"
    rp.write_text(json.dumps(review))
    pi = scope["pi"]
    realgit = pi.git
    pi.git = lambda *args: json.dumps(task)
    try:
        assert scope["admit"]()[2] == sha(new)
        passed.append("bound_explicit_repair")
        for key, value in [
            ("reviewer", "root"),
            ("independence", False),
            ("verdict", "approve_recovered"),
            ("task_id", "B004"),
            ("original_patch_sha256", "0" * 64),
            ("original_report_sha256", "0" * 64),
            ("reviewed_patch_sha256", "0" * 64),
            ("coordinator_delta_sha256", "0" * 64),
            ("reviewed_at_utc", "2026-11-11T00:00:00"),
        ]:
            rp.write_text(json.dumps({**review, key: value}))
            try:
                scope["admit"]()
            except (ValueError, KeyError):
                passed.append("reject_" + key)
            else:
                raise AssertionError(key)
        rp.write_text(json.dumps(review))
        (directory / "original-report.json").write_bytes(b"changed")
        try:
            scope["admit"]()
        except ValueError:
            passed.append("reject_changed_original_copy")
        else:
            raise AssertionError("copy")
        (directory / "original-report.json").write_bytes(reportbytes)
        pi.git = lambda *args: json.dumps({"id": "B004"})
        try:
            scope["admit"]()
        except ValueError:
            passed.append("reject_changed_frozen_task")
        else:
            raise AssertionError("frozen")
        (root / "workload-release.json").write_text(
            json.dumps(
                {
                    "delivery_cutoff_utc": datetime.fromtimestamp(
                        time.time() - 1, UTC
                    ).isoformat()
                }
            )
        )
        try:
            scope["gate"]()
        except ValueError:
            passed.append("cutoff_before_mutation")
        else:
            raise AssertionError("cutoff")
        (root / "workload-release.json").write_text(
            json.dumps(
                {
                    "delivery_cutoff_utc": datetime.fromtimestamp(
                        time.time() + 3600, UTC
                    ).isoformat()
                }
            )
        )
        (root / "integration-control.stop").touch()
        try:
            scope["gate"]()
        except ValueError:
            passed.append("stop_before_mutation")
        else:
            raise AssertionError("stop")
    finally:
        pi.git = realgit
with tempfile.TemporaryDirectory() as tmp:
    import sqlite3
    from types import SimpleNamespace

    base = Path(tmp)
    dbpath = base / "control.sqlite3"
    with sqlite3.connect(dbpath) as db:
        db.execute(
            "CREATE TABLE budget_policy(singleton INTEGER PRIMARY KEY,model_limit_cents INTEGER,infra_limit_cents INTEGER)"
        )
        db.execute("INSERT INTO budget_policy VALUES(1,16800,5670)")
    before = hashlib.sha256(dbpath.read_bytes()).hexdigest()
    oldcommon = scope["common_state"]
    scope["common_state"] = lambda _: base
    try:
        scope["validate_policy"](
            SimpleNamespace(
                root=base,
                live_enabled=False,
                model_limit_cents=16800,
                infra_limit_cents=5670,
            )
        )
        passed.append("matching_cumulative_policy_read_only")
        for name, model, infra, live in [
            ("historical_policy", 1800, 700, False),
            ("live_profile", 16800, 5670, True),
        ]:
            try:
                scope["validate_policy"](
                    SimpleNamespace(
                        root=base,
                        live_enabled=live,
                        model_limit_cents=model,
                        infra_limit_cents=infra,
                    )
                )
            except ValueError:
                passed.append("reject_" + name)
            else:
                raise AssertionError(name)
        assert before == hashlib.sha256(dbpath.read_bytes()).hexdigest()
        passed.append("durable_policy_bytes_unchanged")
    finally:
        scope["common_state"] = oldcommon
v = {
    "kind": "coordinator_repair_phase_guard_validation",
    "at_utc": datetime.now(UTC).isoformat(),
    "checks_passed": passed,
    "count": len(passed),
    "source_sha256": hashlib.sha256(script.read_bytes()).hexdigest(),
    "actual_external_operations": 0,
    "real_approvals_created": 0,
}
p = script.parent / (
    "repair-generic-guard-validation-" + uuid.uuid4().hex[:8] + ".json"
)
p.write_text(json.dumps(v, indent=2) + "\n")
p.chmod(0o600)
print(json.dumps(v))
