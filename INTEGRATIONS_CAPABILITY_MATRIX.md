# INTEGRATIONS_CAPABILITY_MATRIX.md

> Provider × operation matrix for the Phase Ω.8 action ecosystem.
> Every cell answers: "Can this integration perform this operation
> today, planned, or never?" Per provider: auth model, current backend
> status, supported / planned operations, OAuth scopes, LIVE flags.
>
> This document is reference material — not a roadmap. The roadmap
> lives in `ACTION_ECOSYSTEM_PLAN.md`.

---

## 0. Matrix legend

| Symbol | Meaning |
|---|---|
| ✅ | Shipped — canonical action handler exists in `action-executor.ts`, row in `actions_library`, LIVE flag in env |
| 🟡 | Planned — Phase Ω.8 priority A/B (in roadmap, not yet built) |
| 🔵 | Considered — Phase Ω.8 priority C/D (good idea, deferred) |
| ⛔ | Not applicable — provider doesn't expose this capability |
| ❌ | Explicitly out of scope (governance reason documented) |

---

## 1. Per-operation matrix (high-level)

The 7 operation categories from `OPERATIONS_TAXONOMY.md` × 14 providers
from `lib/workflow-templates/integrations.ts`.

| Provider \\ Op | Pause | Budget | Launch | Notify | Report | Monitor | Approve |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| **Meta Ads**       | ✅ | ✅ | ✅ | ⛔ | 🔵 | 🟡 | n/a |
| **Google Ads**     | ✅ | 🟡 | ✅ | ⛔ | 🔵 | 🟡 | n/a |
| **TikTok Ads**     | 🟡 | 🟡 | 🔵 | ⛔ | 🔵 | 🔵 | n/a |
| **LinkedIn Ads**   | 🟡 | 🔵 | 🔵 | ⛔ | 🔵 | 🔵 | n/a |
| **Shopify**        | 🔵 | ⛔ | 🔵 | ⛔ | 🟡 | 🟡 | n/a |
| **GA4**            | ⛔ | ⛔ | ⛔ | ⛔ | 🔵 | 🟡 | n/a |
| **Search Console** | ⛔ | ⛔ | ⛔ | ⛔ | 🔵 | 🟡 | n/a |
| **Google Sheets**  | ⛔ | ⛔ | ⛔ | ⛔ | 🟡 | 🔵 | n/a |
| **Google Slides**  | ⛔ | ⛔ | ⛔ | ⛔ | 🟡 | ⛔ | n/a |
| **Google Drive**   | ⛔ | ⛔ | ⛔ | ⛔ | 🔵 | 🔵 | n/a |
| **BigQuery**       | ⛔ | ⛔ | ⛔ | ⛔ | 🟡 | 🔵 | n/a |
| **Slack**          | ⛔ | ⛔ | ⛔ | ✅ | ⛔ | ⛔ | n/a |
| **Email (Resend)** | ⛔ | ⛔ | ⛔ | ✅ | 🔵 | ⛔ | n/a |
| **AI (OpenRouter)**| ⛔ | ⛔ | ⛔ | ⛔ | 🟡 | ⛔ | n/a |

**Approve column is `n/a` everywhere** — Approve is a workflow step
kind (`approval_queue` substrate), not a provider operation. See
`OPERATIONS_TAXONOMY.md §2.7`.

**Shipped (Phase Ω.8A.1):** 9 action handlers (4 Meta + 2 Google +
1 Slack + 2 email). The Phase Ω.7 baseline was 7; Phase Ω.8A.1 added
`slack.post_message` and `email.send_digest`.

**Phase Ω.8 priority A target:** the remaining 🟡 cells → 18 total
action handlers across 8 active providers.

---

## 2. Per-provider detail

### 2.1 Meta Ads

**Status:** Connected (Phase 2). OAuth flow live in `connect.ts`. Per-org
refresh token in Supabase Vault.

**Backend platform id:** `meta`

**OAuth scopes:** `ads_read`, `ads_management`

**Auth model:** Per-org OAuth refresh token. Sandbox fallback to
`META_TEST_ACCESS_TOKEN` system-wide token for dev orgs.

**LIVE flags:**
| Flag | Status |
|---|---|
| `META_PAUSE_CAMPAIGN_LIVE` | shipped |
| `META_DECREASE_BUDGET_LIVE` | shipped |
| `META_INCREASE_BUDGET_LIVE` | shipped (gated by approval) |
| `META_CREATE_CAMPAIGN_LIVE` | shipped (gated by approval) |
| `META_FETCH_METRICS_LIVE` | planned (Monitor) |

**Allowlist env:** `META_LIVE_ORG_ALLOWLIST` (shared across all Meta flags)

**Shipped operations:**
- ✅ `meta.pause_campaign` (Tier 2)
- ✅ `meta.decrease_budget` (Tier 2)
- ✅ `meta.increase_budget` (Tier 3, gated; capped by `META_INCREASE_BUDGET_MAX_PERCENT`)
- ✅ `meta.create_campaign` (Tier 4, gated; status=PAUSED hardcoded)

**Planned operations (Phase Ω.8 priority A):**
- 🟡 `meta.fetch_campaign_metrics` — pull spend/CTR/ROAS for last N days
- 🟡 `meta.pause_ad_set` — finer-grained pause (within campaign)

**Considered (deferred):**
- 🔵 `meta.create_audience`
- 🔵 `meta.create_ad` (vs create_campaign)
- 🔵 Reporting helpers (Slides/Sheets aggregation)

---

### 2.2 Google Ads

**Status:** Connected (Phase 2). OAuth flow live. Per-org refresh token in Vault.

**Backend platform id:** `google`

**OAuth scopes:** `https://www.googleapis.com/auth/adwords`

**Auth model:** Per-org OAuth refresh token + system-wide
`GOOGLE_ADS_DEVELOPER_TOKEN` + system-wide OAuth client.

**Customer-account context:** `customer_id` resolves from
`ad_accounts.platform_account_id` for the org's first connected Google
integration. MCC traversal via optional `GOOGLE_ADS_LOGIN_CUSTOMER_ID`.

**LIVE flags:**
| Flag | Status |
|---|---|
| `GOOGLE_PAUSE_CAMPAIGN_LIVE` | shipped |
| `GOOGLE_CREATE_CAMPAIGN_LIVE` | shipped (gated by approval) |
| `GOOGLE_INCREASE_BUDGET_LIVE` | planned (gated by approval) |
| `GOOGLE_DECREASE_BUDGET_LIVE` | planned |
| `GOOGLE_FETCH_METRICS_LIVE` | planned |

**Allowlist env:** `GOOGLE_LIVE_ORG_ALLOWLIST`

**Shipped operations:**
- ✅ `google.pause_campaign` (Tier 2)
- ✅ `google.create_campaign` (Tier 4, gated; advertising_channel_type default 'SEARCH')

**Planned operations (Phase Ω.8 priority A):**
- 🟡 `google.increase_budget` (Tier 3, gated)
- 🟡 `google.decrease_budget` (Tier 2)
- 🟡 `google.fetch_campaign_metrics` (Tier 0)

---

### 2.3 TikTok Ads

**Status:** Not connected. No backend OAuth substrate. Provider listed
in `lib/workflow-templates/integrations.ts` as `tiktok` with
`backend_platform_id: null` (badges render "Available soon" honestly).

**Backend platform id (planned):** `tiktok`

**OAuth scopes (planned):** `advertiser.read`, `advertiser.write`

**Auth model (planned):** TikTok Business API OAuth flow.

**Planned operations (Phase Ω.8 priority B):**
- 🟡 `tiktok.pause_campaign` (Tier 2)
- 🟡 `tiktok.increase_budget` (Tier 3, gated)
- 🟡 `tiktok.decrease_budget` (Tier 2)

**Considered (deferred):**
- 🔵 `tiktok.create_campaign` (Tier 4, gated)
- 🔵 `tiktok.fetch_campaign_metrics` (Tier 0)

**Phase Ω.8 prerequisite:** OAuth substrate must land first (extend
`connect.ts` with `buildTikTokAuthUrl` + token exchange). Operator
authorization required.

---

### 2.4 LinkedIn Ads

**Status:** Not connected. Same as TikTok — listed in provider registry,
backend substrate planned.

**Backend platform id (planned):** `linkedin`

**OAuth scopes (planned):** `r_ads`, `rw_ads`, `r_ads_reporting`

**Auth model (planned):** LinkedIn Marketing API OAuth flow.

**Planned operations (Phase Ω.8 priority B):**
- 🟡 `linkedin.pause_campaign` (Tier 2)

**Considered (deferred):**
- 🔵 `linkedin.increase_budget` (Tier 3, gated)
- 🔵 `linkedin.create_campaign` (Tier 4, gated)
- 🔵 `linkedin.fetch_campaign_metrics` (Tier 0)

**Phase Ω.8 prerequisite:** OAuth substrate + operator authorization.

---

### 2.5 Shopify

**Status:** Connected (Phase 2). OAuth flow live. Per-org refresh token
in Vault. Currently READ-ONLY in the backend (sync handler exists; no
mutation handlers).

**Backend platform id:** `shopify`

**OAuth scopes:** `read_orders` (current). Mutation scopes deferred.

**Auth model:** Shopify Partner OAuth per-shop install.

**LIVE flags:**
| Flag | Status |
|---|---|
| `SHOPIFY_FETCH_ORDERS_LIVE` | planned |
| `SHOPIFY_PAUSE_DISCOUNT_LIVE` | considered |

**Planned operations (Phase Ω.8 priority A):**
- 🟡 `shopify.fetch_orders` (Tier 0) — pull yesterday's orders / revenue / top SKUs
- 🟡 `shopify.fetch_inventory` (Tier 0) — for low-stock alerts

**Considered (deferred):**
- 🔵 `shopify.pause_discount_code` (Tier 2)
- 🔵 `shopify.create_discount_code` (Tier 4, gated)

**Spend impact:** Shopify ops have NO ad-spend impact — mostly reporting
+ inventory monitoring. Approval gating applies only to customer-visible
mutations.

---

### 2.6 GA4

**Status:** Not connected. Provider listed; backend substrate planned.

**Backend platform id (planned):** `ga4`

**OAuth scopes (planned):** `https://www.googleapis.com/auth/analytics.readonly`

**Auth model (planned):** Google OAuth refresh token (shared OAuth
client with Google Ads, separate scope).

**Planned operations (Phase Ω.8 priority A):**
- 🟡 `ga4.fetch_metrics` (Tier 0) — events, sessions, conversions, audiences

**Considered (deferred):**
- 🔵 `ga4.fetch_audience` (Tier 0)

**No mutations.** GA4 is read-only by design.

---

### 2.7 Search Console

**Status:** Not connected. Provider listed; backend substrate planned.

**Backend platform id (planned):** `search_console`

**OAuth scopes (planned):** `https://www.googleapis.com/auth/webmasters.readonly`

**Auth model (planned):** Google OAuth refresh token (shared OAuth client).

**Planned operations (Phase Ω.8 priority A):**
- 🟡 `search_console.fetch_queries` (Tier 0) — top queries, positions, CTR shifts

**Considered (deferred):**
- 🔵 `search_console.fetch_sitemaps` (Tier 0)

**No mutations.** Search Console is read-only by design.

---

### 2.8 Google Sheets

**Status:** Not connected. Provider listed; backend substrate planned.

**Backend platform id (planned):** `sheets`

**OAuth scopes (planned):** `https://www.googleapis.com/auth/spreadsheets`

**Auth model (planned):** Google OAuth refresh token (shared OAuth client).

**Planned operations (Phase Ω.8 priority A):**
- 🟡 `sheets.append_row` (Tier 1) — append one row to a tracking sheet

**Considered (deferred):**
- 🔵 `sheets.read_range` (Tier 0) — for source-data workflows

---

### 2.9 Google Slides

**Status:** Not connected. Provider listed; backend substrate planned.

**Backend platform id (planned):** `slides`

**OAuth scopes (planned):** `https://www.googleapis.com/auth/presentations`

**Auth model (planned):** Google OAuth refresh token (shared OAuth client).

**Planned operations (Phase Ω.8 priority A):**
- 🟡 `slides.generate_report` (Tier 1) — clone template deck, fill placeholders

**No reads / no mutations beyond generate.** Slides is output-only.

---

### 2.10 Google Drive

**Status:** Not connected. Provider listed; backend substrate planned.

**Backend platform id (planned):** `drive`

**OAuth scopes (planned):** `https://www.googleapis.com/auth/drive.file`

**Considered (deferred):**
- 🔵 `drive.upload_file` (Tier 1) — archive reports, save exports
- 🔵 `drive.list_files` (Tier 0) — read folder contents

---

### 2.11 BigQuery

**Status:** Not connected. Provider listed; backend substrate planned.

**Backend platform id (planned):** `bigquery`

**OAuth scopes (planned):** `https://www.googleapis.com/auth/bigquery`

**Auth model (planned):** Service-account JSON key (per-org, stored in
Vault). Alternative: Google OAuth user-token.

**Planned operations (Phase Ω.8 priority A):**
- 🟡 `bigquery.export_query` (Tier 1) — run query, export to BQ table or GCS

**Considered (deferred):**
- 🔵 `bigquery.fetch_query_result` (Tier 0)

---

### 2.12 Slack

**Status:** ✅ Connectable (Phase Ω.8A.1). `slack` is a valid
`integrations.platform`; the per-org incoming-webhook URL is stored in
Supabase Vault, referenced by `integrations.provider_secret_id`.

**Backend platform id:** `slack`

**OAuth scopes:** none — the v1 model is INCOMING WEBHOOK only (no Slack
OAuth, no bot token, no `chat.postMessage` API).

**Connect route:** `POST /api/v1/integrations/connect/slack` with body
`{ webhook_url }`. Slack has NO OAuth dance, so there is no `/start` or
`/complete` — the operator creates an incoming webhook in their Slack
workspace and submits the URL to this single route. The route validates
the URL shape (`isValidSlackWebhookUrl`), stores it via Vault
`createSecret()`, and upserts the `integrations` row. Reconnect upserts
on `(org_id, platform)` and best-effort deletes the superseded secret.
Disconnect (`DELETE /api/v1/integrations/:id`) deletes the
`provider_secret_id` secret from Vault and NULLs the column.

**Auth model:** Per-org Slack incoming-webhook URL — a single-value
non-OAuth secret. Stored ONLY in Supabase Vault (never raw in a DB
column), referenced by `integrations.provider_secret_id`. Resolved
per-request after `shape-registry.ts` `assertCredentialShape()` confirms
the credential-ownership invariant. `SLACK_DEFAULT_WEBHOOK_URL` is a
dev-only fallback for orgs with no Slack integration row.

**LIVE flags:**
| Flag | Status |
|---|---|
| `SLACK_POST_MESSAGE_LIVE` | shipped (default false → simulated) |
| `SLACK_POST_THREAD_REPLY_LIVE` | considered |

**Shipped operations (Phase Ω.8A.1):**
- ✅ `slack.post_message` (Tier 1) — post a plain-text message to the
  org's connected incoming webhook

**Considered (deferred):**
- 🔵 `slack.post_thread_reply` (Tier 1)
- 🔵 `slack.send_dm` (Tier 1)

**Channel safety:** the destination channel is bound by the incoming-webhook
URL the operator chose at connect time. Tier 1 — internal team channel.
Posting to customer-facing channels (when present) would be tier 4 and
gated; not in scope.

---

### 2.13 Email (Resend)

**Status:** ✅ Shipped. Two canonical handlers: `send_alert_email` and
`email.send_digest`. Resend API key in env. Recipients computed
server-side from `users` table where `role='admin'`.

**Backend platform id:** `email` (logical — there's no per-org Resend
integration row). Phase Ω.8A.1 added `email` to the `actions_library`
platform CHECK enum so `email.send_digest` carries its own platform id
rather than the legacy `send_alert_email` convention of `platform='meta'`.

**Auth model:** System-wide `RESEND_API_KEY` env. NO per-org auth.

**LIVE flags:** `SEND_ALERT_EMAIL_LIVE` (shipped) ·
`EMAIL_SEND_DIGEST_LIVE` (shipped, default false → simulated)

**Shipped operations:**
- ✅ `send_alert_email` (Tier 1 — admin recipients only)
- ✅ `email.send_digest` (Tier 1 — admin recipients only) — sends a
  deterministic **text/plain** digest. The structured `digest` param is
  flattened by `normalizeForEmail()` (deterministic, pure; no HTML, no
  markdown). The raw digest is audited in `data_used.params`; the
  normalized body in `result_data.normalized_payload`.

**Considered (deferred):**
- 🔵 `email.send_customer_broadcast` — tier 4, gated, separate handler

---

### 2.14 AI (OpenRouter)

**Status:** Connected at the canonical AI service layer (used by Copilot,
auto-fire chain, recommendations). Currently NOT exposed as an action.

**Backend platform id (planned):** `ai` (logical)

**Auth model:** System-wide `OPENROUTER_API_KEY` env OR per-org BYOK
from Supabase Vault.

**Planned operations (Phase Ω.8 priority A):**
- 🟡 `ai.summarize` (Tier 1) — generate text summary of input data
  inside a workflow step

**Considered (deferred):**
- 🔵 `ai.classify` — categorize input
- 🔵 `ai.draft_copy` — generate marketing copy

**Why "AI as action" is separate from the existing AI service:** The
existing AI service (`/api/v1/ai/decisions/generate`) returns a
validated `ai_decisions` row. Action-AI is a fire-and-forget summarize
call for use INSIDE a multi-step workflow's data flow (the result feeds
the next step's params via the result_data field). Both route through
the canonical `executeAction()` for audit + rate limit + idempotency.

---

## 3. OAuth-shared groups

Several Google products share OAuth clients in the backend:

**Google Ads + GA4 + Search Console + Sheets + Slides + Drive + BigQuery**
- Single OAuth client (`GOOGLE_ADS_CLIENT_ID` + `GOOGLE_ADS_CLIENT_SECRET`
  in env, despite the name — these are the canonical Google OAuth client
  credentials for the whole Google surface)
- Per-product scope set
- Per-org refresh token in Vault stores ALL scopes the org granted

When adding a Google integration in Phase Ω.8 priority A, the OAuth
client doesn't need re-configuring; the new scope is requested at
re-auth time. Operators who connected before the new scope landed
re-authorize through the standard `/integrations` UI.

---

## 4. Per-provider runtime safety profile

| Provider | Default LIVE state | Max % cap (where applicable) | Allowlist required in prod? |
|---|---|---|---|
| Meta | OFF | `META_INCREASE_BUDGET_MAX_PERCENT=50` | YES |
| Google Ads | OFF | (TBD on Phase Ω.8 budget handler) | YES |
| TikTok | OFF (planned) | (TBD) | YES |
| LinkedIn | OFF (planned) | (TBD) | YES |
| Shopify | OFF (planned) | n/a (read-only ops) | NO (read-only) |
| GA4 | OFF (planned) | n/a | NO |
| Search Console | OFF (planned) | n/a | NO |
| Sheets | OFF (planned) | n/a | NO |
| Slides | OFF (planned) | n/a | NO |
| Drive | OFF (planned) | n/a | NO |
| BigQuery | OFF (planned) | n/a | NO |
| Slack | OFF (`SLACK_POST_MESSAGE_LIVE`) | n/a | YES (production-channel safety) |
| Email | OFF (`SEND_ALERT_EMAIL_LIVE`, `EMAIL_SEND_DIGEST_LIVE`) | n/a | NO (admin-only recipients) |
| AI | n/a (always live) | per-org credit cap | NO |

---

## 5. Authority

This matrix is sourced from:
- `lib/workflow-templates/integrations.ts` (provider registry)
- `lib/action-enrichments/manifest.ts` (canonical enrichments)
- `backend/src/services/execution/action-executor.ts` (shipped handlers)
- `backend/src/index.ts:LIVE_FLAG_DEPENDENCIES` (LIVE flag truth)
- `backend/.env.example` (env documentation)
- `backend/src/routes/v1/connect.ts` (OAuth flow currently live)

When this document conflicts with code, code is the truth and this
document MUST be updated to match.
