# OPERATIONS_TAXONOMY.md

> The canonical classification scheme for actions in `actions_library`.
> Every operation that ever lands in the catalog MUST fit into one of
> the categories below. This file is the single source of truth for
> category metadata; the FE enrichment manifest
> (`lib/action-enrichments/manifest.ts`) and the operator-facing
> /actions surface both consume the categories defined here.
>
> Categories are STABLE — adding a new one is a governance decision
> documented in SYSTEM_CONTROL.md, not a unilateral PR.

---

## 0. Why this taxonomy exists

Without a stable classification:

- Operators see actions grouped by provider (Meta, Google) and miss
  cross-provider primitives (Pause is the same operator intent whether
  it runs against Meta, Google, or TikTok)
- New action handlers drift into ad-hoc naming patterns
- The marketer-facing "Browse by operation" pivot becomes incoherent
- Approval policy registration is per-slug instead of per-category, so
  policy drift becomes likely

This document fixes all four problems by establishing 7 canonical
categories with explicit semantics + naming + risk-tier defaults.

---

## 1. The 7 canonical operation categories

| Category | Operator intent | Default spend-risk tier | Auto-fire default |
|---|---|---|---|
| **Pause** | Stop something that's currently running | 2 (reversible external) | Allowed |
| **Budget** | Adjust how much money flows through an existing campaign | 2 if decreasing; 3 if increasing | Decrease: allowed · Increase: **gated** |
| **Launch** | Create a new campaign / ad / public asset | 4 (launch-capable) | **Gated** |
| **Notify** | Send a message to operator team OR end-customer | 1 if internal; 4 if external | Internal: allowed · External: **gated** |
| **Report** | Produce a digest, deck, sheet, or analytical artifact | 0–1 | Allowed |
| **Monitor** | Continuous health check, anomaly watch, status fetch | 0 (read-only) | Allowed |
| **Approve** | Human-in-the-loop gate (workflow primitive, not a provider call) | n/a | n/a — pauses workflow |

These 7 categories cover every plausible marketing operation.
Anything that doesn't fit is one of:
- An undiscovered category (raise a governance proposal first)
- A composition of existing categories (model it as multiple steps,
  not a new category)
- An orchestration concept (out of scope — RUNTIME_BOUNDARIES applies)

---

## 2. Category definitions (full semantics)

### 2.1 Pause

**Intent:** Stop an actively running marketing object.

**Properties:**
- Always reversible (a paused thing can be unpaused)
- Never spend-increasing
- Operator-visible side effect (campaign status flips, ad goes dark)
- Default: auto-fire allowed (no approval required)

**Examples (shipped):**
- `meta.pause_campaign`
- `google.pause_campaign`

**Examples (planned):**
- `meta.pause_ad_set`
- `meta.pause_ad`
- `tiktok.pause_campaign`
- `linkedin.pause_campaign`
- `shopify.pause_discount_code`

**Anti-examples (not Pause):**
- `meta.archive_campaign` — destructive; categorize as Pause if reversible,
  else Launch (since it changes lifecycle state irreversibly)
- `meta.delete_campaign` — permanent; should NEVER ship as a canonical
  action (operators delete via provider UI, not via automation)

### 2.2 Budget

**Intent:** Adjust monetary throughput on an existing campaign.

**Properties:**
- May increase or decrease spend
- Reversible (operator can flip back to old value)
- DIRECTION determines risk tier:
  - DECREASE → tier 2, auto-fire allowed
  - INCREASE → tier 3, auto-fire **gated**

**Examples (shipped):**
- `meta.increase_budget` (gated)
- `meta.decrease_budget`

**Examples (planned):**
- `google.increase_budget` (gated)
- `google.decrease_budget`
- `tiktok.increase_budget` (gated)
- `linkedin.increase_budget` (gated)

**Server-side safety cap:** Every `increase_budget` action MUST enforce
a maximum percent cap server-side (e.g.
`META_INCREASE_BUDGET_MAX_PERCENT=50`). Operator-supplied params above
the cap are rejected with `code: 'INVALID_FILTER'` BEFORE the provider
call. The cap is independent from the approval gate — both must pass.

### 2.3 Launch

**Intent:** Create a new marketing object (campaign, ad, audience, etc.).

**Properties:**
- Irreversible in the sense that the new object now exists
- Always launches in PAUSED status — the action does NOT activate
- Spend-launching: tier 4
- Always auto-fire **gated**

**Examples (shipped):**
- `meta.create_campaign`
- `google.create_campaign`

**Examples (planned):**
- `tiktok.create_campaign`
- `linkedin.create_campaign`
- `meta.create_audience`
- `meta.create_ad_set`

**Canonical safety rule:** Launches NEVER auto-activate. The handler
must hardcode `status='PAUSED'` (or the provider equivalent) on
creation. Activation is a follow-up manual action by the operator.

### 2.4 Notify

**Intent:** Deliver a message to an audience.

**Properties:**
- Tier depends on AUDIENCE:
  - Internal team (operator's own Slack channel, operator's inbox) → tier 1
  - External customers (mass email list, customer-channel Slack) → tier 4 (gated)
- Idempotency is critical (no duplicate notifications)
- Best-effort failure semantics (the workflow continues; the
  notification just didn't land)

**Examples (shipped):**
- `send_alert_email` (internal — to org admins only)

**Examples (planned, internal — tier 1):**
- `slack.post_message` (operator team channel)
- `slack.post_thread_reply`
- `email.send_digest` (to org admins)

**Examples (planned, external — tier 4 gated):**
- `email.send_customer_broadcast`
- `slack.post_customer_channel`

**Recipient-list safety:** Internal notify handlers MUST compute the
recipient list server-side (e.g. query `users` where `role='admin'`).
Operator-supplied recipient lists are accepted ONLY for external (tier 4)
actions and trigger the approval gate.

### 2.5 Report

**Intent:** Produce a digestible artifact summarizing data.

**Properties:**
- Reads from one or more providers, writes to ONE destination
  (Slides deck, Sheets row, BigQuery export, Drive upload)
- Tier 0–1 (no spend impact; internal-facing artifact)
- Auto-fire always allowed
- Failure mode is best-effort (the report didn't generate; operator
  re-runs manually)

**Examples (planned):**
- `slides.generate_report` — generates Google Slides deck from template
- `sheets.append_row` — appends one row to a tracking sheet
- `bigquery.export_query` — runs query, exports result to GCS / BQ table
- `drive.upload_file` — saves a file to Drive
- `ai.summarize` — generates a marketer-facing summary from input data

**No-shipped:** Every Report action currently in the catalog is
deferred. Phase Ω.8 priority A.

### 2.6 Monitor

**Intent:** Read provider state without mutating it.

**Properties:**
- Pure read operations
- Tier 0 (no side effects)
- Auto-fire always allowed
- Idempotency-trivial (every read is naturally idempotent)
- Failure mode is read-only (handler returns null; caller decides)

**Examples (planned):**
- `ga4.fetch_metrics`
- `search_console.fetch_queries`
- `shopify.fetch_orders`
- `meta.fetch_campaign_metrics`
- `google.fetch_campaign_metrics`

**Why these are still actions (not just service calls):** Going
through the canonical `executeAction()` pipeline ensures:
- Org isolation enforcement
- Per-org rate limit applies (prevents an AI workflow from spamming GA4)
- Audit trail per read (operator can grep "what did the AI read at 3pm")
- Per-org allowlist + LIVE flag governance

### 2.7 Approve

**Intent:** Pause a workflow until an operator explicitly approves.

**Properties:**
- Not a provider call — this is a workflow primitive
- Does NOT have an `action_type` slug in `actions_library` — it's
  a step kind in templates/copilot drafts only
- Implementation: when a workflow reaches an `approve` step, enqueue
  a row in the canonical `approval_queue` table; existing dispatcher
  resumes the next step on approve

**Examples:** Approval is a STEP KIND, not an action slug. There's no
`platform.approve` — instead, templates and Copilot drafts use
`{ kind: 'approval' }` step shape.

---

## 3. Naming conventions (recap from ACTION_RUNTIME_RULES.md §3)

Action slug: `<integration>.<verb>_<object>`

**Allowed verbs per category:**

| Category | Allowed verbs |
|---|---|
| Pause | `pause`, `archive` (only if reversible) |
| Budget | `increase_budget`, `decrease_budget` |
| Launch | `create_campaign`, `create_ad`, `create_audience`, `create_ad_set` |
| Notify | `send`, `post`, `notify` |
| Report | `generate_report`, `append_row`, `export_query`, `upload_file`, `summarize` |
| Monitor | `fetch_metrics`, `fetch_queries`, `fetch_orders`, `fetch_<object>` |

Verbs that DON'T appear above MUST NOT ship without an explicit
governance proposal that extends this taxonomy.

---

## 4. Cross-category interactions

**Compositions** marketers often want, and how they map:

| Marketer-facing intent | Canonical composition |
|---|---|
| "Pause campaign + tell my team" | Pause + Notify |
| "Generate weekly report + email me" | Report + Notify (internal) |
| "Increase budget but ask me first" | Approve + Budget (increase) |
| "Find anomalies + alert me" | Monitor + Notify (internal) |
| "Launch new test + announce" | Approve + Launch + Notify (internal) |

Each row represents 2-3 canonical actions strung together as workflow
steps. There is NO catch-all "compound action" category — combinations
live in templates / Copilot drafts.

---

## 5. Spend-risk tier defaults per category

| Tier | Description | Categories that default to this tier |
|---|---|---|
| 0 | Read-only | Monitor (all) |
| 1 | Internal-only side effect | Notify (internal), Report |
| 2 | Reversible external | Pause (all), Budget (decrease) |
| 3 | Spend-increasing reversible | Budget (increase) |
| 4 | Launch-capable / external publish | Launch (all), Notify (external) |
| 5 | Customer-facing publish (reserved) | (none shipped) |

Tier assignments are overridable per-action when context warrants
(documented in the enrichment `safety_note`).

---

## 6. Future category proposals

Categories NOT in this taxonomy that have been considered and rejected:

| Proposed | Rejected because |
|---|---|
| `Optimize` | Too vague — every category optimizes something. Use the verb-specific category (Pause / Budget / Launch). |
| `Audience` | Audience operations are sub-cases of Launch (create_audience), Monitor (fetch_audience_size), or Notify (broadcast_to_audience). |
| `Schedule` | Schedule is a TRIGGER kind, not an action category. |
| `Reportify` (humorous proposal) | Reject; "Report" suffices. |
| `Compose` | Workflow composition is RUNTIME_BOUNDARIES territory, not an action category. |
| `Approve` (as action) | Approve is a workflow STEP KIND served by the existing approval_queue, NOT a `<platform>.<verb>` action slug. Listed in §2.7 as a primitive, not as an action. |

Adding a new category to this document requires:
1. A governance proposal in SYSTEM_CONTROL.md
2. Explicit operator authorization
3. Updating `lib/action-enrichments/manifest.ts` to add the
   `OperationCategoryMeta` row
4. Backwards-compat preservation of existing 7 categories

---

## 7. Operator-facing surfaces that consume this taxonomy

- `app/actions/page.tsx` — "Operations" view-mode toggle groups cards by category
- `app/actions/[id]/page.tsx` — `EnrichmentPanels` reads category from manifest
- `app/automation/strategies/page.tsx` — "Browse by operation" pivot strip uses these categories
- `lib/action-enrichments/manifest.ts` — `OPERATION_CATEGORIES` constant
- `lib/workflow-templates/cross-refs.ts` — `getTemplatesByOperationCategory`

Any future surface that displays category labels MUST import from
`lib/action-enrichments` and MUST NOT hard-code label strings.
