import ast
import hashlib
import json
import tempfile
import time
from datetime import UTC, datetime
from pathlib import Path

SCRIPT = Path(__file__).with_name("recover-reviewed-queue.py")
tree = ast.parse(SCRIPT.read_text())
definitions = ast.Module(
    body=[
        n
        for n in tree.body
        if isinstance(n, (ast.Import, ast.ImportFrom, ast.FunctionDef))
    ],
    type_ignores=[],
)
scope = {}
exec(compile(definitions, str(SCRIPT), "exec"), scope)  # noqa: S102  # Execute the selected local operator AST only in synthetic offline tests.
passed = []
with tempfile.TemporaryDirectory(prefix="integration-guards-") as tmp:
    base = Path(tmp)
    reviews = base / "reviews"
    batch = base / "batch"
    out = base / "ops"
    out.mkdir()
    reviews.mkdir()
    (batch / "B001").mkdir(parents=True)
    scope.update(REVIEW=reviews, BATCH=batch, RUN=base, OUT=out, CONTROLLER=base)
    patch = b"Synthetic fixture, not a real approval.\n"
    sha = hashlib.sha256(patch).hexdigest()
    (batch / "B001/changes.patch").write_bytes(patch)
    report = {
        "status": "needs_repair",
        "agent_exit": -1,
        "check_exit": 0,
        "finished_at": "2026-11-11T00:00:00Z",
        "recovery_errors": [],
        "sandbox_terminated": True,
        "checked_patch_sha256": sha,
        "patch_sha256": sha,
    }
    (batch / "B001/report.json").write_text(json.dumps(report))
    review = {
        "task_id": "B001",
        "reviewer": "launch_packet",
        "verdict": "approve_recovered",
        "recovered_patch_review": True,
        "original_worker_status": "needs_repair",
        "original_worker_exit": -1,
        "reviewed_patch_sha256": sha,
        "original_report_sha256": hashlib.sha256(
            (batch / "B001/report.json").read_bytes()
        ).hexdigest(),
        "independence": True,
        "original_patch_sha256": sha,
        "reviewed_at_utc": "2026-11-11T00:00:00Z",
    }
    path = reviews / "B001.json"

    def setr(value):
        path.write_text(json.dumps(value))

    setr(review)
    assert scope["approved"]("B001")[0] == sha
    passed.append("synthetic_bound_review")
    for key, value in [
        ("reviewer", "root"),
        ("original_report_sha256", "0" * 64),
        ("reviewed_patch_sha256", "0" * 64),
        ("original_worker_status", "validated"),
        ("original_worker_exit", 0),
        ("recovered_patch_review", False),
        ("independence", False),
        ("task_id", "B002"),
        ("original_patch_sha256", "0" * 64),
        ("reviewed_at_utc", "2026-11-11T00:00:00"),
    ]:
        setr({**review, key: value})
        try:
            scope["approved"]("B001")
        except (RuntimeError, ValueError):
            passed.append("reject_" + key)
        else:
            raise AssertionError(key)
    setr({**review, "verdict": "reject"})
    assert scope["approved"]("B001") is None
    passed.append("reject_verdict")
    setr(review)
    (batch / "B001/report.json").write_text(json.dumps({**report, "status": "working"}))
    try:
        scope["approved"]("B001")
    except RuntimeError:
        passed.append("reject_unfinished")
    else:
        raise AssertionError("unfinished")
    # Separate coordinator repair admission uses its own hash-bound review and preserves the failed worker.
    repairdir = base / "coordinator-repairs/B001-01"
    repairdir.mkdir(parents=True)
    repairreviews = base / "reviews/repairs"
    repairreviews.mkdir(parents=True)
    failed = {**report, "status": "needs_repair", "agent_exit": -1, "check_exit": 1}
    (batch / "B001/report.json").write_text(json.dumps(failed))
    newpatch = b"Synthetic new repaired patch"
    newsha = hashlib.sha256(newpatch).hexdigest()
    delta = b"Synthetic root repair delta"
    deltasha = hashlib.sha256(delta).hexdigest()
    (repairdir / "changes.patch").write_bytes(newpatch)
    (repairdir / "coordinator-delta.patch").write_bytes(delta)
    (repairdir / "repair.json").write_text(
        json.dumps({"task_id": "B001", "actor": "root", "full_validation_passed": True})
    )
    rr = {
        "task_id": "B001",
        "reviewer": "launch_packet",
        "verdict": "approve_repaired",
        "independence": True,
        "reviewed_at_utc": "2026-11-11T00:00:00Z",
        "original_report_sha256": hashlib.sha256(
            (batch / "B001/report.json").read_bytes()
        ).hexdigest(),
        "original_patch_sha256": sha,
        "reviewed_patch_sha256": newsha,
        "coordinator_delta_sha256": deltasha,
    }
    rrp = repairreviews / "B001.json"
    rrp.write_text(json.dumps(rr))
    assert scope["approved_repair"]("B001")[0] == newsha
    passed.append("separate_repair_bound_admission")
    for key, value in [
        ("reviewer", "root"),
        ("independence", False),
        ("original_report_sha256", "0" * 64),
        ("original_patch_sha256", "0" * 64),
        ("coordinator_delta_sha256", "0" * 64),
    ]:
        rrp.write_text(json.dumps({**rr, key: value}))
        try:
            scope["approved_repair"]("B001")
        except (RuntimeError, ValueError):
            passed.append("repair_reject_" + key)
        else:
            raise AssertionError(key)
    rrp.write_text(json.dumps({**rr, "reviewed_patch_sha256": "0" * 64}))
    assert scope["approved_repair"]("B001") is None
    passed.append("repair_unreviewed_new_patch_not_admitted")
    scope["query"] = lambda _: {"total_count": 0, "check_runs": []}
    assert scope["checks"]("a" * 40)[0] == "pending"
    passed.append("ci_missing")
    check = {
        "id": 1,
        "app": {"slug": "github-actions"},
        "name": "checks",
        "head_sha": "a" * 40,
        "status": "completed",
        "conclusion": "success",
    }
    scope["query"] = lambda _: {"total_count": 1, "check_runs": [check]}
    assert scope["checks"]("a" * 40)[0] == "passed"
    passed.append("ci_exact_head")
    scope["query"] = lambda _: {
        "total_count": 1,
        "check_runs": [{**check, "conclusion": "failure"}],
    }
    assert scope["checks"]("a" * 40)[0] == "failed"
    passed.append("ci_failure")
    scope["query"] = lambda _: {
        "total_count": 1,
        "check_runs": [{**check, "head_sha": "b" * 40}],
    }
    assert scope["checks"]("a" * 40)[0] != "passed"
    passed.append("ci_stale")
    scope["query"] = lambda _: {"total_count": 2, "check_runs": [check]}
    try:
        scope["checks"]("a" * 40)
    except RuntimeError:
        passed.append("ci_pagination_incomplete")
    else:
        raise AssertionError("pagination")
    events = []
    scope["event"] = lambda kind, **fields: events.append((kind, fields))
    popen = scope["subprocess"].Popen

    def never_start(*args, **kwargs):
        raise AssertionError("Popen must not start")

    scope["subprocess"].Popen = never_start
    try:
        scope["CUTOFF"] = time.time() - 1
        code, _, receipt = scope["operation"]("TEST", "merge", ["fake"])
        assert code == 125 and json.loads(receipt.read_text())["child_started"] is False
        passed.append("cutoff_before_popen")
        scope["CUTOFF"] = time.time() + 3600
        (base / "integration-control.stop").write_text("stop")
        code, _, receipt = scope["operation"]("TEST", "publish", ["fake"])
        assert code == 125 and json.loads(receipt.read_text())["child_started"] is False
        passed.append("stop_before_popen")
        (base / "integration-control.stop").unlink()
        scope["CUTOFF"] = time.time() + 10
        code, _, receipt = scope["operation"]("TEST", "merge", ["fake"])
        assert code == 125 and json.loads(receipt.read_text())["child_started"] is False
        passed.append("small_merge_window_before_popen")
    finally:
        scope["subprocess"].Popen = popen
    # Execute the exact AST of the uncertain-merge handler, with only external reads mocked.
    branch = next(
        n
        for n in ast.walk(tree)
        if isinstance(n, ast.If)
        and isinstance(n.test, ast.Name)
        and n.test.id == "code"
        and any(
            isinstance(x, ast.Constant) and x.value == "stop_on_uncertain_merge"
            for x in ast.walk(n)
        )
    )
    body = [n for n in branch.body if not isinstance(n, ast.Break)]
    wrapped = ast.FunctionDef(
        name="exercise_uncertain",
        args=ast.arguments(
            posonlyargs=[], args=[], kwonlyargs=[], kw_defaults=[], defaults=[]
        ),
        body=body,
        decorator_list=[],
    )
    module = ast.fix_missing_locations(ast.Module(body=[wrapped], type_ignores=[]))
    exec(compile(module, "uncertain-merge-actual-handler", "exec"), scope)  # noqa: S102  # Execute the selected local operator AST only in synthetic offline tests.
    for merged in (True, False):
        scope.update(
            state={"tasks": {"B001": {}}, "post_merge_checks": {}, "paused": False},
            task="B001",
            code=1,
            receipt=out / "synthetic.json",
            integ={"pr_number": 1, "pr_url": "https://example.invalid/pr/1"},
            save=lambda: None,
        )
        scope["query"] = lambda _, flag=merged: {
            "merged": flag,
            "merge_commit_sha": "a" * 40 if flag else None,
        }
        scope["exercise_uncertain"]()
        assert scope["state"]["paused"] is True
        assert ("B001" in scope["state"]["post_merge_checks"]) is merged
        assert (
            scope["state"]["tasks"]["B001"]["status"]
            == "merge_outcome_requires_reconciliation"
        )
        passed.append(
            "uncertain_merge_"
            + ("observed_merged_tracked" if merged else "unknown_pauses")
        )
# A green CI observation cannot promote an unreconciled or mismatched merged tree.
for needs, treeok in [(False, True), (True, True), (False, False)]:
    scope.update(
        state={
            "tasks": {
                "B001": {
                    "status": "merge_outcome_requires_reconciliation"
                    if needs
                    else "merged_pending_combined_ci"
                }
            },
            "post_merge_checks": {
                "B001": {
                    "status": "pending",
                    "merge_commit_sha": "a" * 40,
                    "pr_url": "https://example.invalid/pr/1",
                    "merged_tree_verified": treeok,
                    "requires_coordinator_reconciliation": needs,
                }
            },
            "paused": needs,
        },
        save=lambda: None,
    )
    scope["checks"] = lambda _: ("passed", {})
    scope["sample_post_merges"]()
    assert (
        scope["state"]["tasks"]["B001"]["status"] == "merged_green_provisional"
    ) is (treeok and not needs)
    passed.append("ci_promotion_guard_" + str(needs) + "_" + str(treeok))
receipt = {
    "kind": "private_recovery_integration_guard_validation_v1",
    "recorded_at_utc": datetime.now(UTC).isoformat(),
    "count": len(passed),
    "checks_passed": passed,
    "script_sha256": hashlib.sha256(SCRIPT.read_bytes()).hexdigest(),
    "real_task_approvals": 0,
    "actual_external_operations": 0,
}
out = SCRIPT.parent / (
    "recovery-queue-validation-v1-" + __import__("uuid").uuid4().hex[:8] + ".json"
)
out.write_text(json.dumps(receipt, indent=2) + "\n")
out.chmod(0o600)
print(
    json.dumps(
        {"passed": len(passed), "external_operations": 0, "real_approvals_created": 0}
    )
)
