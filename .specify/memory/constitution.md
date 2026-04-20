<!--
SYNC IMPACT REPORT
Version change: (template, unpublished) → 1.0.0
Added sections: Core Principles (I–V), Architecture Constraints, Development Workflow, Governance
Removed sections: n/a (first ratification)
Templates requiring updates:
  ✅ .specify/templates/plan-template.md — Constitution Check section aligns with principles below
  ✅ .specify/templates/spec-template.md — no structural changes required
  ✅ .specify/templates/tasks-template.md — no structural changes required
Follow-up TODOs: none
-->

# GrowthHub Constitution

## Core Principles

### I. Data Flow Integrity (NON-NEGOTIABLE)

The frontend MUST never call Supabase directly. All database operations MUST
route through the Backend API (Railway). The backend MUST verify the Clerk
authentication token on every request. This three-tier boundary
(Frontend → Backend API → Supabase) is the single source of truth for data
access and MUST NOT be bypassed under any circumstance, including prototyping
or debugging shortcuts.

### II. Multi-Tenant Isolation

Every database table MUST include an `org_id` column. Row Level Security (RLS)
MUST be enabled on every table — no exceptions. No query MUST ever execute
without an `org_id` filter. The `service_role_key` MUST reside exclusively on
the Backend and MUST never be exposed to the frontend or committed to version
control. All sensitive operations MUST be recorded in the `audit_logs` table.
Data MUST be exportable per organization for compliance purposes.

### III. Phase-Gated Delivery

Each build phase (as defined in `Phases.md`) MUST deliver its stated
deliverable before the next phase begins. No phase may be partially shipped
and considered "done." Decision History (Phase 4) is the most critical table
in the system — it is the memory and explainability layer and MUST never be
skipped, simplified, or merged into a generic logs table.

### IV. AI Usage & Billing Separation

Two user plan types exist — `subscription` and `ltd` — and MUST be treated
as completely separate code paths:
- `subscription` users consume platform OpenRouter credits; credits MUST be
  checked and deducted before every AI call.
- `ltd` (AppSumo) users MUST use their own OpenRouter key (BYOK), stored
  encrypted in Supabase Vault. The platform key MUST never be used for `ltd`
  users. If an `ltd` user has no BYOK key configured, AI features MUST be
  blocked with a prompt to add the key.

### V. UI Composition Contract

Every `page.tsx` file MUST contain content only — no `<aside>` sidebar,
no `<header>` topbar, no `fixed` positioning, and no `h-screen` wrappers.
The shared `app/dashboard/layout.tsx` MUST supply the Sidebar and Topbar for
all dashboard pages automatically. This constraint ensures consistent layout
rendering and prevents duplicate chrome across routes.

## Architecture Constraints

- **Frontend**: Next.js App Router on Hostinger VPS (PM2 + Nginx + SSL).
- **Backend**: Express/Hono on Railway — persistent, handles all DB access and
  background jobs.
- **Database**: Supabase (PostgreSQL) — fully isolated, production-only project.
- **Auth**: Clerk — every user MUST belong to an Organization; `orgId` from
  Clerk equals `org_id` in every DB table.
- **Jobs**: Inngest for background automation and sync jobs.
- **AI Gateway**: OpenRouter for multi-model LLM access.
- **Deployment**: Changes MUST be pushed to GitHub before any VPS deployment.
  PM2 manages the Next.js process; Nginx handles SSL termination.

## Development Workflow

- RLS MUST be verified after every new table is added.
- Every API endpoint MUST be tested with an incorrect `org_id` to verify
  tenant isolation before merging.
- Each Speckit spec covers exactly one build phase.
- The `decision_history` table schema (fields: `decision`, `action_taken`,
  `trigger_condition`, `data_used`, `result`, `ai_explanation`,
  `confidence_score`) MUST be implemented exactly as specified — it is the
  system's memory and learning loop and is subject to investor due diligence.

## Governance

This constitution supersedes all other development practices and informal
agreements. Any amendment MUST be documented here with a version bump
following semantic versioning:
- **MAJOR**: Removal or redefinition of a non-negotiable principle.
- **MINOR**: Addition of a new principle or material expansion of guidance.
- **PATCH**: Clarifications, wording fixes, non-semantic refinements.

All pull requests MUST be reviewed against this constitution. Complexity
deviations MUST be justified in the PR description. Runtime development
guidance lives in `CLAUDE.md`.

**Version**: 1.0.0 | **Ratified**: 2026-04-20 | **Last Amended**: 2026-04-20
