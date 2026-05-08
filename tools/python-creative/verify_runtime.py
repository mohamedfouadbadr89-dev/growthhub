#!/usr/bin/env python3
"""
Phase 5 Python Creative Runtime — verification script.

Authority: specs/SYSTEM_CONTROL.md continuation #8 (2026-05-07) — TOOLING /
ENVIRONMENT scope only. This script is a READ-ONLY verifier; it makes no
network calls, no database calls, and no filesystem writes outside its
own stdout. It exists to confirm an operator has the local Python
creative substrate set up correctly before iterating on creative work.

Usage:
    python3 verify_runtime.py

Exit codes:
    0  — all checks passed
    1  — one or more checks failed (see stdout for which)

What this verifies:
    1. Python version >= 3.9
    2. Each requirement in requirements.txt is importable
    3. The system `ffmpeg` binary is on PATH (required by ffmpeg-python)

What this does NOT do (intentional, per governance):
    - No DB connections
    - No HTTP calls to OpenRouter / SiliconFlow / Supabase
    - No reads of backend `.env`
    - No imports of backend service code
    - No production runtime side effects of any kind
"""

from __future__ import annotations

import importlib
import shutil
import subprocess
import sys
from typing import List, Tuple


# Required minimum Python version. Matches requirements.txt expectation.
MIN_PYTHON: Tuple[int, int] = (3, 9)

# Modules that requirements.txt is expected to install. Listed by their
# IMPORT name (not their pip name). Kept manually in sync with
# requirements.txt — small enough that a sync slip is obvious.
REQUIRED_IMPORTS: List[str] = [
    "PIL",          # Pillow
    "imageio",
    "numpy",
    "requests",
    "dotenv",       # python-dotenv
    "ffmpeg",       # ffmpeg-python
]


def check_python_version() -> bool:
    """Confirm Python interpreter meets the minimum required version."""
    actual = sys.version_info[:2]
    ok = actual >= MIN_PYTHON
    label = "OK" if ok else "FAIL"
    print(
        f"[{label}] Python {actual[0]}.{actual[1]} "
        f"(minimum required: {MIN_PYTHON[0]}.{MIN_PYTHON[1]})"
    )
    return ok


def check_imports() -> bool:
    """Confirm every entry in REQUIRED_IMPORTS is importable."""
    all_ok = True
    for name in REQUIRED_IMPORTS:
        try:
            importlib.import_module(name)
            print(f"[OK]   import {name}")
        except ImportError as e:
            print(f"[FAIL] import {name} — {e}")
            all_ok = False
    return all_ok


def check_ffmpeg_binary() -> bool:
    """Confirm the SYSTEM ffmpeg binary is discoverable on PATH."""
    path = shutil.which("ffmpeg")
    if not path:
        print(
            "[FAIL] ffmpeg binary not found on PATH. "
            "Install it (macOS: `brew install ffmpeg`) and re-run."
        )
        return False
    # Try a quick `-version` invocation to confirm executability.
    try:
        result = subprocess.run(
            [path, "-version"],
            capture_output=True,
            text=True,
            timeout=5,
        )
    except (OSError, subprocess.SubprocessError) as e:
        print(f"[FAIL] ffmpeg discovered at {path} but failed to execute: {e}")
        return False
    first_line = (result.stdout or result.stderr).splitlines()[:1]
    summary = first_line[0] if first_line else "<no output>"
    print(f"[OK]   ffmpeg at {path} — {summary}")
    return True


def main() -> int:
    print("Phase 5 Python Creative Runtime — verification")
    print("-" * 60)
    checks = [
        check_python_version(),
        check_imports(),
        check_ffmpeg_binary(),
    ]
    print("-" * 60)
    if all(checks):
        print("All checks passed. Local creative tooling is ready.")
        return 0
    failed = sum(1 for c in checks if not c)
    print(f"{failed} check(s) failed. See entries above; fix and re-run.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
