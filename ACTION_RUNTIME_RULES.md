# ACTION_RUNTIME_RULES.md

> Authoritative contract for every action handler that lands in the
> canonical `actions_library` and is dispatched by `executeAction()`.
> Sits below CONSTITUTION.md / CLAUDE.md / SYSTEM_CONTROL.md in the
> authority order — every clause here is a concretization of an
> invariant already defined in those documents.
>
> If a planned handler cannot satisfy every rule in this document,
> it MUST NOT ship.

---

## 0. Scope

This document governs every row added to the `actions_library` table
and every corresponding handler in
`backend/src/services/execution/action-executor.ts`. It applies to:

- Currently-canonical handlers (Meta + Google + Slack + email — 9 total:
  the 7 Phase Ω.7 baseline handlers plus `slack.post_message` and
  `email.send_digest` shipped in Phase Ω.8A.1)
- All Phase Ω.8 expansion handlers (Slack / Sheets / Slides / BigQuery / GA4 / Search Console / Shopify / TikTok / LinkedIn)
- Every future handler authored by anyone, anywhere

It does NOT govern:
- AI Output Contract handlers (`aiValidator.ts` — separate authority)
- Approval queue dispatcher (`services/approvals/dispatcher.ts` — separate authority)
- Anything outside `executeAction()`'s call tree

---

## 1. The single-executor invariant (non-negotiable)

**Every action that ever runs inside this platform MUST be dispatched
through `executeAction()` in `backend/src/services/execution/action-executor.ts`.**

This is the canonical runtime. No exceptions. No bypasses. No
"convenience" direct provider calls from a route handler. No "lightweight"
shortcuts. No "just this once" exemptions.

If a feature requires running an operation that doesn't fit
`executeAction()`'s shape, the correct response is:

1. STOP
2. Extend `actions_library` with a new row
3. Add the matching handler in `ACTION_HANDLERS` map
4. Route the feature through `executeAction()`

The correct response is NEVER to bypass.

---

## 2. The 8 mandatory rules every action handler must satisfy

| # | Rule | Enforced by |
|---|---|---|
| 1 | The action has a row in `actions_library` with a populated `parameter_schema` JSON Schema | `executeAction()` SELECT + parameter validator |
| 2 | The handler is registered in `ACTION_HANDLERS[<platform>.<action_type>]` (or bare `<action_type>` for cross-provider actions) | `executeAction()` dispatch lookup — throws on missing |
| 3 | The handler reads `params` ONLY from the validated `parameter_schema` shape — never from request body, never from query string | Parameter validation happens before handler invocation |
| 4 | The handler reads `orgId` ONLY from `ctx` (server-side from Clerk JWT) — never from anywhere else | `executeAction()` passes orgId from the auth middleware context |
| 5 | The handler is wrapped in `try/catch` with the canonical error shape — throws bubble to the audit row with `result='failed'` + `error_message` | `executeAction()` catch block |
| 6 | Every real provider call is bracketed by `logExec('exec.api_call')` + `logExec('exec.api_response')` lines with `request_id` correlation | `executeAction()` logger injection |
| 7 | The handler is guarded by a `<NAMESPACE>_<ACTION>_LIVE` env flag (default false → simulated mode); enabling requires per-org allowlist | Per-handler env check + `LIVE_FLAG_DEPENDENCIES` startup fail-fast in `backend/src/index.ts` |
| 8 | The handler returns the canonical `HandlerResult` shape: `{ success: boolean, mode: 'live' \| 'simulated', resultData?: Record<string, unknown>, errorMessage?: string }` | TypeScript type on `ACTION_HANDLERS` map |

A handler that violates ANY of these rules MUST be rejected at code
review and reverted before merge.

---

## 3. Naming convention (canonical slug shape)

Action slug format: `<integration>.<verb>_<object>` lowercased,
underscore-separated, no plurals, no hyphens.

| Field | Rules |
|---|---|
| `<integration>` | The provider id matching `lib/workflow-templates/integrations.ts` (e.g. `meta`, `google`, `shopify`, `slack`, `sheets`). Cross-provider verbs (e.g. `send_alert_email`) MAY omit the integration prefix — bare action_type — but this should be RARE; prefer prefixing wherever sensible. |
| `<verb>` | Imperative present tense — `pause`, `increase`, `decrease`, `create`, `send`, `post`, `append`, `generate`, `export`, `fetch`. No "perform_X". No "do_Y". No "execute_Z". |
| `<object>` | The artifact the verb acts on — `campaign`, `budget`, `message`, `row`, `report`, `query`. Singular. |

**Examples:**
- ✅ `meta.pause_campaign`
- ✅ `slack.post_message`
- ✅ `sheets.append_row`
- ✅ `bigquery.export_query`
- ❌ `metaPauseCampaign` (camelCase forbidden — keys must match DB literals)
- ❌ `meta_pause_campaign` (no underscore between integration + verb)
- ❌ `meta.pause` (object missing — ambiguous)
- ❌ `meta.pause_campaigns` (plural forbidden — actions operate on single objects)

The slug is the operator-visible identifier. It appears in:
- `actions_library.platform` + `actions_library.action_type` columns
- `automation_rules.action_template_id` FK
- Template manifest `step.action_type` references
- `result_data.action_type` audit metadata
- Operator-facing chips on `/actions` and `/operator/ai` surfaces

Once shipped, a slug NEVER changes. Renaming requires a migration that
preserves the old slug as an alias for backward compat.

---

## 4. Parameter schema requirements

Every action MUST publish a JSON Schema in `actions_library.parameter_schema`
with:

- `type: 'object'`
- `properties` keyed by parameter name
- `required` array listing mandatory params
- Per-property: `type`, `description` (operator-facing), optionally `enum`, `minimum`, `maximum`, `pattern`

**Required parameter properties for every spend-touching action:**

| Property | Required? | Purpose |
|---|---|---|
| `campaign_id` (or equivalent provider id) | YES | What the action operates on |
| `idempotency_key` | Server-injected | Prevents duplicate side effects on retry |

**Required parameter properties for every alerting / notification action:**

| Property | Required? | Purpose |
|---|---|---|
| `recipient` or `channel` | YES | Operator-facing destination — never inferred |
| `message` or `template_id` | YES | Content payload — never silently default to "Test message" |

Parameters with NO operator-facing default value MUST be `required`.
Defensive defaults are explicit in the schema, never implicit in code.

---

## 5. LIVE flag conventions

Every real-provider-call handler is gated by a binary env flag.

**Flag naming:**
- Format: `<INTEGRATION>_<ACTION_VERB>_<ACTION_OBJECT>_LIVE`
- Examples: `META_PAUSE_CAMPAIGN_LIVE`, `SLACK_POST_MESSAGE_LIVE`,
  `SHEETS_APPEND_ROW_LIVE`, `BIGQUERY_EXPORT_QUERY_LIVE`
- Defaults: `false` (simulated mode is canonical default)

**Flag behavior:**
| Flag state | Handler behavior |
|---|---|
| Unset OR `'false'` | Simulated mode — handler does NOT call provider. Returns canonical `{ success: true, mode: 'simulated', resultData: {...} }`. Audit row written with `mode='simulated'`. |
| `'true'` AND credentials present AND org in allowlist | Live mode — handler calls real provider. Returns canonical `{ success, mode: 'live', resultData: {...with http_status, response_id, etc.} }`. Audit row written with `mode='live'`. |
| `'true'` but credential missing OR allowlist excludes org | Handler throws → audit row `result='failed'`, `error_message='<FLAG>=true but <DEP> is not configured'`. Boot-time `LIVE_FLAG_DEPENDENCIES` check catches credential-vs-flag inconsistency on startup. |

**Per-integration allowlist:** Every LIVE flag MUST share a per-integration
allowlist env var: `<INTEGRATION>_LIVE_ORG_ALLOWLIST` (comma-separated org_id list).
Empty allowlist in dev → all orgs allowed; in production → MUST be explicit.

**Startup fail-fast:** `backend/src/index.ts:LIVE_FLAG_DEPENDENCIES` array
MUST list every new LIVE flag with its credential dependencies. A flag set
to `true` without its credential present prevents server boot.

---

## 6. Idempotency

Every action handler MUST behave correctly under retry.

**Mechanism:** The canonical `(org_id, execution_id)` partial unique index
on `decision_history` (Phase 4 minimal close, migration
`20260503140000_phase4_decision_history_idempotency.sql`) is the canonical
idempotency primitive.

**Handler obligation:**
- Handlers do NOT generate `execution_id` themselves. The caller (FE or
  the auto-fire path) supplies it. `executeAction()` enforces uniqueness
  before invoking the handler.
- On idempotent replay, `executeAction()` returns the original audit row
  with `result_data.idempotent_replay=true`. The handler is NOT re-invoked.
- Handlers MUST NOT implement their own idempotency caching; double-doing
  it creates two competing sources of truth.

**Exception: irreversible actions.** For actions where the provider itself
provides a stable idempotency key (e.g. Slack's `client_msg_id`, Stripe's
`Idempotency-Key` header), the handler MAY propagate the `execution_id`
as the provider key for defense-in-depth — but the canonical
idempotency gate remains `decision_history`.

---

## 7. Approval policy

The canonical authority is `actionRequiresApproval(action_type)` in
`backend/src/services/execution/automation-engine.ts:91`. This function
reads `SPEND_INCREASING_OR_LAUNCH_ACTION_TYPES`, a frozen Set.

**Rule:** Every new spend-increasing or launch-capable action MUST be
added to that Set in the same PR that adds the handler. The Set is the
SOLE policy register; no parallel FE mirror, no per-handler conditional,
no environment-driven override.

**Categories that require approval (spend-risk tier 3+; see §11):**
- Any action that creates a NEW campaign / ad / audience
- Any action that INCREASES spend (budget up, bid up, scope expansion)
- Any action that LAUNCHES content publicly (post a social ad, email a
  customer list, create a Slack alert in a customer channel)

**Categories that do NOT require approval:**
- Pause / decrease / stop / archive (always safe — reversible)
- Read operations (fetch metrics, query, list)
- Internal-only notifications (Slack messages to operator team channel)
- Internal report generation (Slides deck, Sheets row, BigQuery export)

When in doubt, default to **approval-required**. Removing approval gating
on a previously-gated action requires explicit operator authorization
documented in SYSTEM_CONTROL.md.

---

## 8. Audit trail

Every successful and failed handler invocation MUST produce exactly ONE
row in `decision_history`. The row is written by `executeAction()`, NOT
by the handler.

**Handler obligations:**
- Return the canonical `HandlerResult` shape
- Populate `resultData` with everything operator-relevant:
  - `mode` (live/simulated) — required
  - `http_status` — when a real provider call was made
  - `response_id` — provider's response identifier (Meta call_id, Slack ts, etc.)
  - `token_source` (e.g. `META_TEST_ACCESS_TOKEN` / `vault:<integration_id>`)
  - `idempotent_replay: false` (the executor flips this to true on replay)
  - Any provider-specific fields useful for debugging or operator UX
- Throw on unexpected failures — `executeAction()` catches and writes
  `result='failed'` + `error_message` to the audit row

**Forbidden:**
- Writing to `decision_history` directly from a handler
- Writing to `automation_runs` directly from a handler
- Mutating the AI Output Contract validator state
- Bypassing the audit row write under any error condition

---

## 9. Rate limit

Every action invocation counts toward the per-org per-minute rate limit
enforced by `executeAction()` via `ACTION_EXECUTION_MAX_PER_MINUTE` env
(default 60). Handlers do NOT bypass.

When the rate limit fires, `executeAction()` throws `code: 'RATE_LIMITED'`
with `retryAfterSeconds: 60`. Idempotent replays do NOT count toward
the budget.

---

## 10. Trace correlation

Every handler invocation runs inside a request context populated by the
auth middleware + tracing middleware:

- `c.get('requestId')` — minted by `tracingMiddleware`
- `c.get('orgId')` — extracted from Clerk JWT
- `c.get('userId')` — extracted from Clerk JWT
- Optional `trace_id` from `ai_decisions.trace_id` when the action is
  dispatched from an auto-fire path

Handler-side log lines (`[exec]` prefix) MUST include `request_id` in
the format `[exec][req=<id>] <message>` so a single grep on any
request_id pivots across `[req]`, `[err]`, `[exec]`, `[AI]`, `[automation]`,
and `[auth]` log streams.

---

## 11. Spend-risk taxonomy

Every action carries a spend-risk tier. The tier informs:
- Whether approval gating applies
- Whether the action defaults to operator-visible "Live" badge vs. "Simulated"
- What test coverage is required pre-launch
- How operator-facing copy describes the operation

| Tier | Label | Definition | Approval gate | Examples |
|---|---|---|---|---|
| **0** | Read-only | Fetches data, no side effects | No | `ga4.fetch_metrics`, `search_console.fetch_queries`, `sheets.read_range` |
| **1** | Internal-only | Side effects only visible to the operator team | No | `slack.post_message` (operator channel), `email.send_internal`, `sheets.append_row`, `slides.generate_report` |
| **2** | Reversible external | Operator-visible change, easy to undo | No | `meta.pause_campaign`, `google.pause_campaign`, `meta.decrease_budget` |
| **3** | Spend-increasing reversible | Real money spend goes UP but the operator can undo | **YES** | `meta.increase_budget`, `tiktok.increase_budget` |
| **4** | Launch-capable | Creates new ad assets / public content / customer-visible artifacts | **YES** | `meta.create_campaign`, `google.create_campaign`, `linkedin.create_campaign` |
| **5** | Customer-facing publish | Sends content to end-customers directly (not internal team) | **YES (mandatory; never auto-fire)** | Reserved — no Tier-5 action shipped yet |

Tier assignments are codified in `lib/action-enrichments/manifest.ts`
via the optional `safety_note` field (Tier 3+ entries get a note).

---

## 12. Execution safety levels

Beyond the spend-risk tier, every handler carries an execution-safety
classification governing observability + on-failure behavior:

| Level | Behavior on failure | Examples |
|---|---|---|
| **strict** | Failure halts the dispatch chain; audit row `failed`; operator must intervene | Spend-touching actions |
| **best-effort** | Failure logs + writes audit row `failed`, but caller continues (e.g. notification didn't send → workflow primary action still proceeds) | Side notifications, Slack alerts |
| **read-only** | Failure returns empty/null result; caller decides | Metric fetches, report generation reads |

Level is enforced at the handler-internals layer (try/catch shape +
return value). It is NOT a runtime flag — it's an authoring discipline.

---

## 13. What an action handler MUST NOT do (forbidden surface)

Enumerated for clarity. Anything in this list = automatic review reject.

| Forbidden | Why |
|---|---|
| Bypass `executeAction()` | Violates single-executor invariant |
| Read `org_id` from request body, query string, or path param | Violates org-isolation; only `c.get('orgId')` from Clerk JWT is trusted |
| Write to `decision_history` directly | Violates single-writer invariant |
| Write to `automation_runs` directly | Violates canonical execution ledger |
| Mutate `approval_queue` directly | Violates approval-queue write authority (`services/approvals/dispatcher.ts`) |
| Cache provider responses across requests | Creates parallel state; canonical state is audit row |
| Implement parallel idempotency mechanism | Conflicts with `(org_id, execution_id)` partial unique index |
| Skip audit row on "trivial" success | Every invocation must be auditable |
| Catch + swallow handler errors silently | Violates "Fail Loudly" (CONSTITUTION §3) |
| Hardcode credentials | Credentials live in env + Vault; never inline |
| Log secret values | CONSTITUTION §1.1 |
| Read `OPENROUTER_API_KEY` directly (use the canonical AI service) | Bypasses AI Output Contract |
| Construct a workflow runtime / orchestrator wrapper | Violates RUNTIME_BOUNDARIES.md |
| Bypass `actionRequiresApproval` for spend-increasing actions | Violates approval policy invariant |
| Call other action handlers from inside a handler (chain dispatch) | Creates implicit orchestration; canonical chain dispatch is `evaluateRulesForAIDecision()` ONLY |

---

## 14. Adding a new action — the canonical PR checklist

Every PR adding a new action handler MUST:

1. ☐ Add the row to `actions_library` via a new migration in
   `supabase/migrations/` with a sensible `name`, marketer-facing
   `description`, and complete `parameter_schema`.
2. ☐ Add the handler in `ACTION_HANDLERS` map in `action-executor.ts`.
   Handler returns canonical `HandlerResult` shape.
3. ☐ Add the `<NAMESPACE>_<ACTION>_LIVE` env flag to `backend/.env.example`
   with default `false` + operator-facing comment.
4. ☐ Add the flag to `LIVE_FLAG_DEPENDENCIES` in `backend/src/index.ts`
   with its credential deps.
5. ☐ Add the enrichment row to `lib/action-enrichments/manifest.ts`
   (category, outcome, use_cases, outputs, related_slugs).
6. ☐ If spend-risk tier 3+, add the slug to
   `SPEND_INCREASING_OR_LAUNCH_ACTION_TYPES` in `automation-engine.ts`.
7. ☐ Update `INTEGRATIONS_CAPABILITY_MATRIX.md` to mark the action
   as supported on its provider.
8. ☐ Update `ACTION_ECOSYSTEM_PLAN.md` to move the action from "planned"
   to "shipped" in the roadmap table.
9. ☐ Reference at least one template that uses the new action_type, so
   the marketplace `Used in N templates` count is non-zero on launch.
10. ☐ Backend + frontend typecheck + lint pass.
11. ☐ No changes to `executeAction()` itself unless the change is
    strictly additive (e.g. extending `result_data` shape).

### 14.1 Mandatory 6-field governance block on every seeded action

Every `actions_library` seed `INSERT` in a migration MUST be immediately
preceded by a 6-field SQL comment block. The block makes the action's
governance posture reviewable at the migration diff — no need to
cross-read code to know how an action behaves.

The six fields, in order:

| # | Field | What it states |
|---|---|---|
| 1 | `slug` | The canonical `<integration>.<verb>_<object>` slug (§3) |
| 2 | `operation category` | One of the 7 `OPERATIONS_TAXONOMY.md` categories |
| 3 | `spend-risk tier` | The tier 0–5 from §11 |
| 4 | `approval gate` | `NONE`, or the `SPEND_INCREASING_OR_LAUNCH_ACTION_TYPES` membership that gates it (§7) |
| 5 | `LIVE flag` | The `<NAMESPACE>_<ACTION>_LIVE` flag name + default (§5) |
| 6 | `execution-safety` | `strict` / `best-effort` / `read-only` (§12) |

Example (Phase Ω.8A.1
`20260515120000_phase_omega8_a1_actions_and_slack_platform.sql`):

```sql
-- slug:               slack.post_message
-- operation category: Notify (OPERATIONS_TAXONOMY.md §2.4)
-- spend-risk tier:    1 — Internal-only (§11)
-- approval gate:      NONE — tier 1 not in SPEND_INCREASING_OR_LAUNCH_ACTION_TYPES
-- LIVE flag:          SLACK_POST_MESSAGE_LIVE (default false → simulated)
-- execution-safety:   best-effort (§12)
INSERT INTO actions_library (...) VALUES (...);
```

A seed `INSERT` without a complete, accurate 6-field block is a review
reject. The block is documentation-in-the-migration, not a substitute
for the §14 checklist — both are required.

---

## 15. Provider-specific authentication

| Auth model | Storage | Handler responsibility |
|---|---|---|
| OAuth refresh token (per-org) | `integrations.vault_refresh_token_secret_id` → Supabase Vault | Resolve refresh token, exchange for access token at call time, never cache |
| Static API key (per-org) | Supabase Vault secret id on `integrations` row | Resolve at call time |
| Single-value non-OAuth secret (per-org) | `integrations.provider_secret_id` → Supabase Vault (e.g. a Slack incoming-webhook URL) | Resolve at call time AFTER `shape-registry.ts` `assertCredentialShape()` confirms credential ownership; never store the secret raw in a DB column |
| System-wide API key | `process.env.<INTEGRATION>_API_KEY` | Read at handler entry |
| Webhook signing secret | `process.env.<INTEGRATION>_WEBHOOK_SECRET` | Verified by webhook handler, not action handler |

**Credential-column ownership invariant.** An `integrations` row populates
EXACTLY ONE credential column: OAuth providers use
`vault_refresh_token_secret_id`; non-OAuth single-secret providers (Slack)
use `provider_secret_id`. The mapping lives in
`backend/src/services/integrations/shape-registry.ts` and is enforced —
not just documented — by `assertCredentialShape()`, which throws before
any handler resolves a secret. A row that populates the wrong column, or
both, fails loud with an audited `result='failed'`.

Handlers MUST NOT log access tokens, refresh tokens, API keys, webhook
URLs, or any secret env var value. Token-source labels in
`result_data.token_source` (e.g. `vault:<integration_id>`,
`vault:integration:slack`, or `META_TEST_ACCESS_TOKEN`) are allowed as
audit metadata.

---

## 16. Versioning and deprecation

Action slugs are STABLE — they never change in place. To evolve an
action:

- Add a new slug with the v2 behavior (`meta.pause_campaign_v2`)
- Keep the old slug + handler dispatching to the v2 logic with a
  warning log line
- Migrate templates + rules in a follow-up pass
- Eventually remove the old handler after operator-visible deprecation
  window

NEVER hot-swap behavior on an existing slug. Operators may have rules
referencing that slug expecting specific semantics; silent change is a
breaking change.

---

## 17. Authority chain

| If ACTION_RUNTIME_RULES.md conflicts with | Then |
|---|---|
| CONSTITUTION.md | CONSTITUTION wins |
| CLAUDE.md | CLAUDE wins |
| SYSTEM_CONTROL.md (active runtime authority) | SYSTEM_CONTROL wins |
| Any planning doc (Phases.md, ACTION_ECOSYSTEM_PLAN.md, etc.) | This document wins |
| Inline code comments | This document wins |
| Operator authorization for a specific PR | The authorization wins but MUST be documented in SYSTEM_CONTROL.md |
