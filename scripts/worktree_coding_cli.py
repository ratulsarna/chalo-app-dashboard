#!/usr/bin/env python3
"""
Standalone worktree workflow scripts for manual development.

Three independent workflows:
1. create: Create worktree and launch interactive CLI tool
2. export: Export worktree changes to review branch
3. cleanup: Remove worktree

Usage examples:
    # Create worktree and launch codex
    python3 worktree_coding_cli.py create . "codex --yolo"

    # Export changes to review branch
    python3 worktree_coding_cli.py export . /path/.worktrees/20250101-123456-abc12345

    # Cleanup worktree
    python3 worktree_coding_cli.py cleanup . /path/.worktrees/20250101-123456-abc12345
"""

from __future__ import annotations

import sys
import subprocess
import argparse
from pathlib import Path
from datetime import datetime
import uuid
import shutil
import shlex
import json
from dataclasses import dataclass
from typing import Sequence


class UserError(Exception):
    pass


def _script_path() -> str:
    return sys.argv[0] or "scripts/worktree_coding_cli.py"


def _run(cmd: Sequence[str], *, cwd: Path | None = None, check: bool = True, capture: bool = True) -> subprocess.CompletedProcess[str]:
    try:
        if capture:
            return subprocess.run(
                list(cmd),
                cwd=str(cwd) if cwd else None,
                capture_output=True,
                text=True,
                check=check,
            )
        return subprocess.run(list(cmd), cwd=str(cwd) if cwd else None, check=check)
    except FileNotFoundError as e:
        raise UserError(f"Command not found: {cmd[0]}") from e


def _git(repo: Path, args: Sequence[str], *, check: bool = True, capture: bool = True) -> subprocess.CompletedProcess[str]:
    return _run(["git", "-C", str(repo), *args], check=check, capture=capture)


def _require_existing_path(path: Path, *, what: str) -> None:
    if not path.exists():
        raise UserError(f"{what} does not exist: {path}")


def _require_git_repo(project_path: Path) -> None:
    result = _git(project_path, ["rev-parse", "--is-inside-work-tree"], check=False, capture=True)
    if result.returncode != 0 or result.stdout.strip() != "true":
        detail = (result.stderr or "").strip()
        if detail:
            raise UserError(f"Not a git repo: {project_path}\n{detail}")
        raise UserError(f"Not a git repo: {project_path}")


def _generate_worktree_id() -> str:
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    return f"{timestamp}-{uuid.uuid4().hex[:8]}"


def _load_copy_config(project_path: Path) -> dict | None:
    config_path = project_path / ".worktree_standalone.json"
    if not config_path.exists():
        return None
    try:
        data = json.loads(config_path.read_text())
    except json.JSONDecodeError as e:
        raise UserError(f"Invalid JSON in {config_path}: {e}") from e
    if not isinstance(data, dict):
        raise UserError(f"Config {config_path} must be a JSON object")
    return data


def _validate_relative_path(path_value: str, *, label: str) -> Path:
    path = Path(path_value)
    if path.is_absolute():
        raise UserError(f"{label} must be relative paths: {path_value}")
    if ".." in path.parts:
        raise UserError(f"{label} must not contain '..': {path_value}")
    return path


def _collect_copy_sources(project_path: Path, config: dict, extra_files: Sequence[str]) -> list[tuple[Path, Path]]:
    copy_files = list(config.get("copy_files", []))
    copy_globs = config.get("copy_globs", [])

    if copy_files is None:
        copy_files = []
    if copy_globs is None:
        copy_globs = []

    if not isinstance(copy_files, list) or not all(isinstance(item, str) for item in copy_files):
        raise UserError("copy_files must be a list of relative path strings")
    if not isinstance(copy_globs, list) or not all(isinstance(item, str) for item in copy_globs):
        raise UserError("copy_globs must be a list of glob strings")

    for extra in extra_files:
        if not isinstance(extra, str):
            raise UserError("--copy-file values must be strings")
        copy_files.append(extra)

    sources: dict[Path, Path] = {}
    for rel in copy_files:
        rel_path = _validate_relative_path(rel, label="copy_files entries")
        src = project_path / rel_path
        sources[rel_path] = src

    for pattern in copy_globs:
        _validate_relative_path(pattern, label="copy_globs entries")
        for match in project_path.glob(pattern):
            if match.is_file():
                rel_path = match.relative_to(project_path)
                sources[rel_path] = match

    return [(src, rel) for rel, src in sources.items()]


def _copy_if_newer(src: Path, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and src.stat().st_mtime <= dest.stat().st_mtime:
        return
    shutil.copy2(src, dest)


def _copy_configured_files(*, project_path: Path, worktree_path: Path, extra_files: Sequence[str]) -> None:
    config = _load_copy_config(project_path) or {}
    sources = _collect_copy_sources(project_path, config, extra_files)
    if not sources:
        return
    for src, rel_path in sources:
        if not src.exists():
            print(f"ℹ Configured copy file missing: {rel_path}")
            continue
        if src.is_dir():
            print(f"ℹ Configured copy path is a directory, skipping: {rel_path}")
            continue
        dest = worktree_path / rel_path
        _copy_if_newer(src, dest)
        print(f"✓ Copied {rel_path}")


@dataclass(frozen=True)
class WorktreeNames:
    unique_id: str
    work_branch: str
    review_branch: str


def _names_from_worktree_path(worktree_path: Path) -> WorktreeNames:
    unique_id = worktree_path.name
    return WorktreeNames(
        unique_id=unique_id,
        work_branch=f"work-{unique_id}",
        review_branch=f"review/{unique_id}",
    )


def create_and_launch(
    project_path: str,
    command: str,
    branch: str = "main",
    *,
    extra_copy_files: Sequence[str] = (),
) -> str:
    """
    Create a worktree and launch an interactive CLI tool.

    Args:
        project_path: Path to the main git repository
        command: Command to launch (e.g., "codex --yolo")
        branch: Base branch to create worktree from (default: main)

    Returns:
        Path to the created worktree
    """
    project = Path(project_path).resolve()
    _require_existing_path(project, what="Project path")
    _require_git_repo(project)

    unique_id = _generate_worktree_id()
    worktrees_dir = project.parent / ".worktrees"
    worktrees_dir.mkdir(exist_ok=True)
    worktree = worktrees_dir / unique_id
    names = _names_from_worktree_path(worktree)

    print(f"Creating worktree at: {worktree}")
    print(f"Branch: {names.work_branch}")
    print(f"Based on: {branch}")

    try:
        _git(
            project,
            ["worktree", "add", str(worktree), "-b", names.work_branch, branch],
            check=True,
            capture=True,
        )
        print("✓ Worktree created successfully")
        try:
            _copy_configured_files(
                project_path=project,
                worktree_path=worktree,
                extra_files=extra_copy_files,
            )
        except Exception as e:
            print(f"⚠ Failed to copy configured files: {e}")

        print(f"\nLaunching: {command}")
        print(f"Working directory: {worktree}")
        print("-" * 60)
        cmd_parts = shlex.split(command)
        if not cmd_parts:
            raise UserError("Tool command is empty after parsing")
        result = _run(cmd_parts, cwd=worktree, check=False, capture=False)
        print("-" * 60)
        exit_code = getattr(result, "returncode", 0)
        print(f"\n✓ CLI tool exited (code {exit_code})")
        print(f"\nWorktree path: {worktree}")
        print(f"To export changes: python3 {_script_path()} export {project} {worktree}")
        print(f"To cleanup: python3 {_script_path()} cleanup {project} {worktree}")
        return str(worktree)
    except subprocess.CalledProcessError as e:
        detail = (e.stderr or "").strip()
        if detail:
            raise UserError(f"Error creating worktree:\n{detail}") from e
        raise UserError(f"Error creating worktree: {e}") from e


def export_to_review(
    project_path: str,
    worktree_path: str,
    *,
    auto_commit: bool = True,
    base_branch_for_log: str = "main",
) -> str:
    """
    Export worktree changes to a review branch in the main repository.

    Args:
        project_path: Path to the main git repository
        worktree_path: Path to the worktree
        auto_commit: Whether to auto-commit uncommitted changes (default: True)
        base_branch_for_log: Base branch used for log output only (default: main)

    Returns:
        Name of the created review branch
    """
    project = Path(project_path).resolve()
    worktree = Path(worktree_path).resolve()
    _require_existing_path(project, what="Project path")
    _require_existing_path(worktree, what="Worktree path")
    _require_git_repo(project)
    _require_git_repo(worktree)

    names = _names_from_worktree_path(worktree)

    print(f"Exporting worktree: {worktree}")
    print(f"To review branch: {names.review_branch}")

    status_result = _git(worktree, ["status", "--porcelain"], check=True, capture=True)
    has_changes = bool(status_result.stdout.strip())

    if has_changes and auto_commit:
        print("Found uncommitted changes, auto-committing...")
        _git(worktree, ["add", "-A"], check=True, capture=True)
        commit_msg = f"Auto-commit: Export to review at {datetime.now().isoformat()}"
        _git(worktree, ["commit", "-m", commit_msg], check=True, capture=True)
        print("✓ Changes committed")
    elif has_changes:
        print("Warning: Uncommitted changes exist but auto-commit is disabled")

    head_commit = _git(worktree, ["rev-parse", "HEAD"], check=True, capture=True).stdout.strip()

    check_result = _git(
        project,
        ["rev-parse", "--verify", f"refs/heads/{names.work_branch}"],
        check=False,
        capture=True,
    )
    if check_result.returncode != 0:
        _git(project, ["branch", names.work_branch, head_commit], check=True, capture=True)
        print(f"✓ Created branch {names.work_branch}")
    else:
        try:
            _git(project, ["branch", "-f", names.work_branch, head_commit], check=True, capture=True)
            print(f"✓ Updated branch {names.work_branch}")
        except subprocess.CalledProcessError as e:
            error_text = (e.stderr or str(e)).strip()
            if "used by worktree" in error_text:
                print(f"ℹ Skipped updating {names.work_branch}: branch is active in a worktree")
            else:
                raise

    _git(project, ["branch", "-f", names.review_branch, head_commit], check=True, capture=True)
    print(f"✓ Created/updated {names.review_branch} -> {head_commit[:8]}")

    base_range = f"{base_branch_for_log}..{names.review_branch}"
    log_result = _git(project, ["log", "--oneline", base_range, "--max-count=10"], check=False, capture=True)
    if log_result.returncode == 0 and log_result.stdout.strip():
        print(f"\nCommits in {names.review_branch} (since {base_branch_for_log}):")
        print(log_result.stdout)

    print("\n✓ Export complete!")
    print(f"Review branch: {names.review_branch}")
    print(f"To push: cd {project} && git push -u origin {names.review_branch}")
    print(f"To cleanup worktree: python3 {_script_path()} cleanup {project} {worktree}")
    return names.review_branch


def cleanup_worktree(project_path: str, worktree_path: str, force: bool = False) -> None:
    """
    Remove a worktree and optionally its associated branches.

    Args:
        project_path: Path to the main git repository
        worktree_path: Path to the worktree to remove
        force: Force removal even with uncommitted changes
    """
    project = Path(project_path).resolve()
    worktree = Path(worktree_path).resolve()

    if not worktree.exists():
        print(f"Worktree does not exist: {worktree}")
        return

    _require_existing_path(project, what="Project path")
    _require_git_repo(project)

    names = _names_from_worktree_path(worktree)

    print(f"Removing worktree: {worktree}")

    if not force:
        status_result = _git(worktree, ["status", "--porcelain"], check=False, capture=True)
        if status_result.returncode == 0 and status_result.stdout.strip():
            raise UserError(
                "Uncommitted changes detected.\n"
                "Use --force to remove anyway, or export first with:\n"
                f"  python3 {_script_path()} export {project} {worktree}"
            )

    cmd = ["worktree", "remove", str(worktree)]
    if force:
        cmd.append("--force")
    _git(project, cmd, check=True, capture=True)
    print("✓ Worktree removed")

    try:
        _git(project, ["branch", "-D", names.work_branch], check=True, capture=True)
        print(f"✓ Removed branch {names.work_branch}")
    except subprocess.CalledProcessError:
        pass

    _git(project, ["worktree", "prune"], check=False, capture=True)
    print("\n✓ Cleanup complete!")


def main():
    """Main entry point with subcommand parsing."""
    parser = argparse.ArgumentParser(
        description="Standalone worktree workflow for manual development",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Create worktree and launch codex
  python3 worktree_coding_cli.py create . "codex --yolo"

  # Create worktree from specific branch and launch different tool
  python3 worktree_coding_cli.py create . "claude-code" --branch develop

  # Export changes to review branch
  python3 worktree_coding_cli.py export . /path/.worktrees/20250101-123456-abc12345

  # Cleanup worktree
  python3 worktree_coding_cli.py cleanup . /path/.worktrees/20250101-123456-abc12345

  # Force cleanup even with uncommitted changes
  python3 worktree_coding_cli.py cleanup . /path/.worktrees/20250101-123456-abc12345 --force
        """
    )

    subparsers = parser.add_subparsers(dest='command', help='Command to run')

    # Create subcommand
    create_parser = subparsers.add_parser('create', help='Create worktree and launch CLI tool')
    create_parser.add_argument('project_path', help='Path to main git repository')
    create_parser.add_argument('tool_command', help='Command to launch (e.g., "codex --yolo")')
    create_parser.add_argument('--branch', default='main', help='Base branch (default: main)')
    create_parser.add_argument('--copy-file', action='append', default=[],
                               help='Extra file to copy into worktree (repeatable, relative to repo root)')

    # Export subcommand
    export_parser = subparsers.add_parser('export', help='Export worktree to review branch')
    export_parser.add_argument('project_path', help='Path to main git repository')
    export_parser.add_argument('worktree_path', help='Path to worktree')
    export_parser.add_argument('--no-auto-commit', action='store_true',
                               help='Do not auto-commit uncommitted changes')
    export_parser.add_argument('--base', default='main',
                               help='Base branch for log output only (default: main)')

    # Cleanup subcommand
    cleanup_parser = subparsers.add_parser('cleanup', help='Remove worktree')
    cleanup_parser.add_argument('project_path', help='Path to main git repository')
    cleanup_parser.add_argument('worktree_path', help='Path to worktree')
    cleanup_parser.add_argument('--force', action='store_true',
                                help='Force removal even with uncommitted changes')

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    try:
        if args.command == 'create':
            create_and_launch(
                args.project_path,
                args.tool_command,
                args.branch,
                extra_copy_files=args.copy_file,
            )
        elif args.command == 'export':
            export_to_review(
                args.project_path,
                args.worktree_path,
                auto_commit=not args.no_auto_commit,
                base_branch_for_log=args.base,
            )
        elif args.command == 'cleanup':
            cleanup_worktree(args.project_path, args.worktree_path, args.force)
    except UserError as e:
        print(f"Error: {e}")
        sys.exit(1)
    except subprocess.CalledProcessError as e:
        detail = (e.stderr or str(e)).strip()
        print(f"Error: {detail or e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
