# Python Creative Runtime — Operator Tooling

**Status:** TOOLING / ENVIRONMENT — not a service, not a phase deliverable.
**Authority (canonical):** [`specs/python-creative-runtime.md`](../../specs/python-creative-runtime.md) — full governance contract for boundaries, allowed/forbidden libraries, future provider preparation, promotion path to canonical Node backend.
**Authority (execution lock):** [`specs/SYSTEM_CONTROL.md`](../../specs/SYSTEM_CONTROL.md) continuation #8 + #9 (2026-05-07).
**Scope:** local-only, operator-side substrate for creative media iteration.

---

## What this is

A self-contained Python virtual environment for **local operator use** alongside the production Phase 5 creative system. Useful for:

- Iterating on creative prompts before promoting to backend services
- Local image manipulation (resize, watermark, format convert) outside the production hot path
- ffmpeg-adjacent media processing for ad-hoc operator tasks
- Testing OpenRouter / SiliconFlow API responses in isolation

**This environment runs nowhere except an operator's local machine.** Production traffic, deploys, and CI do not depend on it.

---

## What this is NOT

Per the explicit governance authorization for this directory, the following are **strictly forbidden** and will not be added here:

- ❌ HTTP services (FastAPI / Flask / Django / etc.)
- ❌ Background workers (Celery / RQ / Dramatiq / etc.)
- ❌ Job queues or schedulers
- ❌ Database writes / ORM models / supabase-py imports for production
- ❌ Routing changes to the backend (Hono routers stay JS/TS only)
- ❌ Schema migrations (those live in `/supabase/migrations/`)
- ❌ Frontend wiring or build hooks
- ❌ MCP / tool-governance scaffolding
- ❌ Automation engine extensions
- ❌ Architecture refactors

If a future request asks for any of the above, **do not add it here**. Open a phase-unlock authorization in `specs/SYSTEM_CONTROL.md` instead.

---

## Architecture position

```
Frontend (Next.js, TypeScript)
   ↓
Backend API (Hono, TypeScript) ← production runtime
   ↓
Service Layer (TypeScript) ← Phase 5 creatives services live here
   ↓
Database (Supabase Postgres)


tools/python-creative/  ← THIS — operator-only, never imported
                          by anything above; runs only when an
                          operator activates the venv on their
                          local machine.
```

The Python environment **does not** sit on the request path. It is fully isolated from production runtime by design.

---

## Setup

### Prerequisites

- Python 3.9+ (system check: `python3 --version`)
- ffmpeg binary (system check: `ffmpeg -version`)
  - macOS: `brew install ffmpeg`
  - Ubuntu/Debian: `sudo apt install ffmpeg`
  - Windows: download from <https://ffmpeg.org/download.html>

### Create the isolated environment

From the repository root:

```bash
cd tools/python-creative
python3 -m venv .venv
source .venv/bin/activate     # on Windows: .venv\Scripts\activate
pip install --upgrade pip
pip install -r requirements.txt
```

The `.venv/` directory is `.gitignore`d at repo level — never commit it.

### Verify the runtime

After installing, run the verification script:

```bash
python verify_runtime.py
```

This script confirms:
- Python version
- All requirements importable
- `ffmpeg` system binary discoverable

It does NOT touch the database, the backend, or the network.

---

## Dependencies

See `requirements.txt`. Pinned ranges; conservative major versions. All dependencies are operator-tooling-grade — no production runtime expectation.

| Package | Purpose | Spec authority |
|---|---|---|
| `Pillow` | Image manipulation (resize, format convert, watermark) | `python-creative-runtime.md` § Pillow |
| `imageio` | Multi-format image I/O (gif, webp, etc.) | `python-creative-runtime.md` § imageio |
| `numpy` | Numerical array math (Pillow/imageio dependency; embeddings prep) | `python-creative-runtime.md` § numpy |
| `requests` | HTTP client for ad-hoc local API testing — operator-side convenience only | `python-creative-runtime.md` § CURRENT INSTALLED LIBRARIES |
| `python-dotenv` | `.env` loader for local scripts (NOT production secret orchestration) | `python-creative-runtime.md` § python-dotenv |
| `ffmpeg-python` | Thin Python wrapper around the SYSTEM ffmpeg binary | `python-creative-runtime.md` § ffmpeg-python |
| `dspy` | LLM orchestration experimentation, prompt optimization, reasoning pipelines, evaluation. **NOT authorized for production orchestration ownership, autonomous execution, or production routing.** Outputs translate manually to canonical TypeScript in `backend/src/utils/aiValidator.ts` + `backend/src/services/ai/*.ts` + `backend/src/routes/v1/ai.ts`. | `python-creative-runtime.md` § DSPy |

---

## Verification scripts

This directory ships with TWO read-only verification scripts. Both are operator-side, perform zero network/DB/filesystem-write side effects, and exit with a clear pass/fail signal.

### `verify_runtime.py` — full environment verifier

The canonical verifier. Confirms:
- Python ≥ 3.9
- Every entry in `REQUIRED_IMPORTS` is importable (Pillow, imageio, numpy, requests, python-dotenv, ffmpeg-python, **dspy**)
- The SYSTEM `ffmpeg` binary is on PATH and executable

Run after `pip install -r requirements.txt` to confirm the environment is ready.

```bash
python verify_runtime.py
```

### `test_dspy.py` — quick DSPy-only sanity check

A 3-line operator convenience script that imports DSPy and prints its version. Use it when you want to confirm DSPy specifically is working without running the full `verify_runtime.py` battery (e.g., debugging a fresh `pip install dspy` upgrade in isolation).

```bash
python test_dspy.py
```

`test_dspy.py` is **complementary** to `verify_runtime.py`, not a replacement. The canonical verifier (`verify_runtime.py`) already covers DSPy via its REQUIRED_IMPORTS list.

---

## Governance reminders

This directory is governance-classified as **TOOLING / ENVIRONMENT**.

- ✅ **Allowed**: add operator-side scripts that read/manipulate local files; verify environment; iterate on prompts.
- ❌ **Forbidden**: anything that would make this directory part of the production runtime. If a need arises that requires production integration, the correct path is to update `specs/SYSTEM_CONTROL.md` and unlock the appropriate phase — not to expand this Python environment.

The `Phase 5 (AI Creatives)` deliverable on the production runtime (TypeScript backend at `backend/src/services/creatives/*.ts` + `backend/src/routes/v1/{creatives,brand-kit}.ts`) is **CLOSED**. This Python tooling supplements operator workflows; it does not extend or replace the production system.
