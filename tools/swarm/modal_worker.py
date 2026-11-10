#!/usr/bin/env python3
"""Trusted sandbox helper. Never receives model or GitHub credentials."""

import argparse
import json
import os
import subprocess
from pathlib import Path, PurePosixPath


def run(args, cwd, *, check=True):
    env = {
        key: value
        for key, value in os.environ.items()
        if key not in {"CODEX_API_KEY", "OPENAI_API_KEY", "GH_TOKEN", "GITHUB_TOKEN"}
    }
    return subprocess.run(args, cwd=cwd, env=env, check=check, capture_output=True)


def owned(path, ownership):
    return any(path == root or path.startswith(root + "/") for root in ownership)


def valid_path(path):
    return (
        isinstance(path, str)
        and bool(path)
        and not path.startswith("/")
        and "\\" not in path
        and all(
            part not in {"", ".", "..", ".git", ".swarm"} for part in path.split("/")
        )
    )


def collect(repo, base_sha, ownership, destination):
    """Capture tracked, deleted and new files even when an agent exits unsuccessfully."""
    destination.mkdir(parents=True, exist_ok=True)
    # Intent-to-add includes new files in the binary diff without committing them.
    run(["git", "add", "--intent-to-add", "--all", "--", "."], repo)
    changes = run(
        [
            "git",
            "diff",
            "--no-ext-diff",
            "--no-textconv",
            "--no-renames",
            "--name-only",
            "-z",
            base_sha,
            "--",
        ],
        repo,
    ).stdout
    paths = sorted(filter(None, changes.decode().split("\0")))
    patch = run(
        [
            "git",
            "diff",
            "--no-ext-diff",
            "--no-textconv",
            "--no-renames",
            "--binary",
            base_sha,
            "--",
        ],
        repo,
    ).stdout
    (destination / "changes.patch").write_bytes(patch)
    violations = [
        path for path in paths if not valid_path(path) or not owned(path, ownership)
    ]
    # Do not accept symlinks or credentials as a task's implementation.
    prohibited = [
        path
        for path in paths
        if (repo / path).is_symlink()
        or any(part.startswith(".env") for part in PurePosixPath(path).parts)
        or Path(path).name in {"auth.json", ".modal.toml"}
    ]
    head = run(["git", "rev-parse", "HEAD"], repo).stdout.decode().strip()
    result = {
        "changed_files": paths,
        "ownership_violations": violations,
        "prohibited_files": prohibited,
        "head_unchanged": head == base_sha,
        "patch_bytes": len(patch),
    }
    (destination / "changes.json").write_text(json.dumps(result, indent=2) + "\n")
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=["prepare", "collect", "check"])
    parser.add_argument("manifest")
    args = parser.parse_args()
    manifest = json.loads(Path(args.manifest).read_text())
    repo = Path("/workspace/repo")
    artifacts = Path("/artifacts")
    artifacts.mkdir(exist_ok=True)
    if args.action == "prepare":
        repo.parent.mkdir(exist_ok=True)
        versions = {
            tool: run([tool, "--version"], "/workspace").stdout.decode().strip()
            for tool in ("node", "npm", "codex", "git")
        }
        (artifacts / "versions.json").write_text(json.dumps(versions, indent=2) + "\n")
        run(
            ["git", "clone", "--no-checkout", manifest["repository"], str(repo)],
            "/workspace",
        )
        run(["git", "checkout", "--detach", manifest["base_sha"]], repo)
        run(["git", "switch", "-c", manifest["branch"]], repo)
        result = run(["npm", "ci", "--no-audit", "--no-fund"], repo, check=False)
        (artifacts / "install.log").write_bytes(result.stdout + result.stderr)
        raise SystemExit(result.returncode)
    if args.action == "collect":
        collect(repo, manifest["base_sha"], manifest["task"]["ownership"], artifacts)
    if args.action == "check":
        result = run(["npm", "run", "check"], repo, check=False)
        (artifacts / "checks.log").write_bytes(result.stdout + result.stderr)
        raise SystemExit(result.returncode)


if __name__ == "__main__":
    main()
