# ACTION_ECOSYSTEM_PLAN.md

> Strategic roadmap for Phase Ω.8 — Action Ecosystem Expansion.
> Targets ~18 active action handlers across 8 active providers by
> the end of priority A, up from 7 across 3 providers today.
>
> Every handler in this plan routes through `executeAction()`. NO
> workflow runtime is introduced. The product evolves toward
> "Marketing operations teammate" — not "generic workflow builder".

---

## 0. Position statement

The platform is currently a marketing operations system with a thin
action catalog (7 handlers, 3 active providers). Phase Ω.8 fills out
the catalog so the templates marketplace + AI Copilot have a rich
ecosystem to compose against. **No workflow runtime. No orchestration.**
Every new action is a single primitive dispatched by the canonical
executor.

The success criterion for Phase Ω.8 is: **every template currently in
the marketplace becomes activatable end-to-end**, not just the
single-step ones. (Today, only `pause-underperforming-meta-campaigns`
and `cac-spike-notification` are simple-complexity. Phase Ω.8 makes
weekly-ppc-report, daily-shopify-summary, budget-pacing-alert, and
the rest of the marketplace genuinely runnable.)

---

## 1. Current state (Phase Ω.7 baseline)

**Active providers:** Meta · Google Ads · Email (Resend)

**Shipped handlers (7):**
| Slug | Category | Tier | Status |
|---|---|---|---|
| `meta.pause_campaign` | Pause | 2 | ✅ |
| `meta.decrease_budget` | Budget | 2 | ✅ |
| `meta.increase_budget` | Budget | 3 (gated) | ✅ |
| `meta.create_campaign` | Launch | 4 (gated) | ✅ |
| `google.pause_campaign` | Pause | 2 | ✅ |
| `google.create_campaign` | Launch | 4 (gated) | ✅ |
| `send_alert_email` | Notify (internal) | 1 | ✅ |

**Connected (OAuth substrate present):** Meta · Google · Shopify

**Connected but no canonical action handlers:** Shopify (sync-only)

**Not connected yet:** TikTok · LinkedIn · GA4 · Search Console · Sheets ·
Slides · Drive · BigQuery · Slack · AI (action surface)

---

## 2. Target state (end of Phase Ω.8 priority A)

**Active providers:** 8 (Meta · Google Ads · Shopify · GA4 · Search Console ·
Sheets · Slides · BigQuery · Slack · AI · Email — counting Slack + AI even
though they're not "ad platforms")

**Shipped handlers target (18):** the 7 above plus 11 new:

| Slug | Category | Tier | Provider | Priority |
|---|---|---|---|---|
| `google.increase_budget` | Budget | 3 (gated) | Google Ads | A.1 |
| `google.decrease_budget` | Budget | 2 | Google Ads | A.1 |
| `google.fetch_campaign_metrics` | Monitor | 0 | Google Ads | A.1 |
| `meta.fetch_campaign_metrics` | Monitor | 0 | Meta | A.1 |
| `shopify.fetch_orders` | Monitor | 0 | Shopify | A.2 |
| `ga4.fetch_metrics` | Monitor | 0 | GA4 | A.2 |
| `search_console.fetch_queries` | Monitor | 0 | Search Console | A.2 |
| `sheets.append_row` | Report | 1 | Sheets | A.3 |
| `slides.generate_report` | Report | 1 | Slides | A.3 |
| `bigquery.export_query` | Report | 1 | BigQuery | A.3 |
| `slack.post_message` | Notify (internal) | 1 | Slack | A.4 |
| `ai.summarize` | Report | 1 | AI | A.4 |

**Effect on marketplace:** 14 templates today reference action_types.
All 14 become genuinely activatable end-to-end once priority A ships.

---

## 3. Priority phasing within Phase Ω.8

### Priority A — the catalog completion pass (target: ~6 weeks)

Goal: ship the 11 handlers in §2 in the order below. Each handler is
its own focused PR following `ACTION_RUNTIME_RULES.md §14` checklist.

**Sub-pass A.1 — Google Ads parity with Meta (~1 week)**
Closes the gap where Meta has 4 operations and Google has 2.
- `google.increase_budget` (gated; reuses existing Google OAuth substrate)
- `google.decrease_budget` (reuses)
- `google.fetch_campaign_metrics` (read-only; reuses)
- `meta.fetch_campaign_metrics` (companion read for Meta)

After A.1: Google + Meta have feature parity for pause / budget /
metrics fetch.

**Sub-pass A.2 — read-only reporting reads (~2 weeks)**
Adds the 3 read-only operations templates need to feed report
generation:
- `shopify.fetch_orders` (uses existing Shopify OAuth + `read_orders` scope)
- `ga4.fetch_metrics` (requires new GA4 OAuth scope on existing Google client)
- `search_console.fetch_queries` (requires new Search Console scope)

After A.2: all 7 marketplace templates that consume metrics can pull
real data.

**Sub-pass A.3 — report output destinations (~2 weeks)**
Adds the 3 write destinations templates need to deliver reports:
- `sheets.append_row` (new scope; existing Google OAuth client)
- `slides.generate_report` (new scope; template-deck clone + replace pattern)
- `bigquery.export_query` (new scope OR per-org service-account auth)

After A.3: weekly-ppc-report, cross-channel-roas-snapshot, and
search-console-weekly-insights templates run end-to-end.

**Sub-pass A.4 — communication channels (~1 week)**
Adds the 2 communication primitives templates need:
- `slack.post_message` (per-org incoming webhook OR bot token)
- `ai.summarize` (system-wide OpenRouter, fire-and-forget within executeAction)

After A.4: daily-ecommerce-summary, budget-pacing-alert,
creative-fatigue-refresh, cac-spike-notification, anomaly-digest-daily,
approval-queue-digest, and shopify-low-stock-alert templates run
end-to-end.

### Priority B — TikTok + LinkedIn (target: ~3 weeks)

Goal: extend the ad-platform breadth. Requires new OAuth substrate.

Each provider gets the basic pause + (gated) increase_budget:
- `tiktok.pause_campaign` + `tiktok.increase_budget` + `tiktok.decrease_budget`
- `linkedin.pause_campaign`

Provider OAuth flows added to `connect.ts` with per-org refresh token
storage. Operator must complete provider's developer-app review before
each LIVE flag flips to `true`.

### Priority C — depth fills (deferred; nice-to-have)

Goal: deepen each provider with finer-grained operations.

- `meta.pause_ad_set`, `meta.pause_ad`, `meta.create_audience`
- `google.pause_ad_group`
- `slack.post_thread_reply`, `slack.send_dm`
- `sheets.read_range`
- `drive.upload_file`

No deadline; these land when a template needs them.

### Priority D — reserved for operator-driven additions

Goal: react to operator demand once Priority A+B ship.

Plausible candidates:
- Webhook outbound (generic POST as an action)
- HubSpot CRM integration
- Klaviyo / Mailchimp campaign sends (tier 4 gated)
- Mixpanel / Amplitude events

---

## 4. Per-handler scope of work

Each handler follows the canonical 11-step PR checklist
(`ACTION_RUNTIME_RULES.md §14`). The work-shape per handler:

| Work item | Typical effort |
|---|---|
| Migration: seed `actions_library` row | ~30 LOC |
| Handler in `ACTION_HANDLERS` map | ~80-200 LOC depending on provider call complexity |
| Service module (per-provider, e.g. `services/integrations/slack.ts`) | ~100-150 LOC for OAuth + API call wrappers |
| LIVE flag in `backend/.env.example` + `LIVE_FLAG_DEPENDENCIES` | ~10 LOC |
| Enrichment row in `lib/action-enrichments/manifest.ts` | ~15 LOC |
| At least one template using the slug | ~30-50 LOC |
| `INTEGRATIONS_CAPABILITY_MATRIX.md` update | ~5 LOC |
| Tests / smoke validation | ~50-100 LOC |

**Total per handler:** ~300-600 LOC across BE + manifests + docs.
**Total Phase Ω.8 priority A:** ~3,500-6,500 LOC across 11 handlers
spread over ~6 weeks.

---

## 5. Dependencies + sequencing

```
        ┌─────────────────────────────────────────────────────┐
        │ Existing OAuth substrate                            │
        │ - Meta (active)                                     │
        │ - Google (active; reused for GA4/Sheets/Slides/BQ)  │
        │ - Shopify (active; mutation scopes still needed)    │
        │ - Email/Resend (system-wide)                        │
        │ - AI/OpenRouter (system-wide)                       │
        └─────────────────────────────────────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────────────────────────────┐
        │ Sub-pass A.1 — Google Ads parity                    │
        │ Depends on: existing Google OAuth                   │
        └─────────────────────────────────────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────────────────────────────┐
        │ Sub-pass A.2 — read-only reads                      │
        │ Depends on: GA4 scope, Search Console scope         │
        │ Operator action: re-authorize Google integration    │
        └─────────────────────────────────────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────────────────────────────┐
        │ Sub-pass A.3 — report outputs                       │
        │ Depends on: Sheets scope, Slides scope, BQ auth     │
        │ Operator action: provide Slides template id +       │
        │   BigQuery dataset                                  │
        └─────────────────────────────────────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────────────────────────────┐
        │ Sub-pass A.4 — Slack + AI summarize                 │
        │ Depends on: Slack app credentials (operator-config) │
        └─────────────────────────────────────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────────────────────────────┐
        │ Priority B — TikTok + LinkedIn                      │
        │ Depends on: new OAuth substrates per provider       │
        │ Operator action: complete dev-app reviews           │
        └─────────────────────────────────────────────────────┘
```

A.1 is fastest — pure backend; no operator-config wait. A.2/A.3 require
operator to reconnect Google integration once new scopes are added.
A.4's Slack wait is provider-app-config (per-org incoming webhook URLs).

---

## 6. Marketer utility prioritization

The 14 marketplace templates today, ranked by how many handlers they
need before they're fully activatable:

| Template | Handlers needed today | After Ω.8 priority A? |
|---|---|---|
| pause-underperforming-meta-campaigns | 0 (already activatable) | ✅ already activatable |
| cac-spike-notification | 0 (already activatable for the Slack hop) | ✅ already activatable |
| daily-ecommerce-summary | `shopify.fetch_orders` + `ai.summarize` + `slack.post_message` | ✅ activatable |
| weekly-ppc-performance-report | `google.fetch_campaign_metrics` + `ai.summarize` + `slides.generate_report` + (email already shipped) | ✅ activatable |
| cross-channel-roas-snapshot | `meta.fetch_campaign_metrics` + `google.fetch_campaign_metrics` + `sheets.append_row` | ✅ activatable |
| scale-winners-with-approval | 0 (already activatable; approval primitive exists) | ✅ already activatable |
| creative-fatigue-refresh | `ai.summarize` + `slack.post_message` | ✅ activatable |
| budget-pacing-alert | `meta.fetch_campaign_metrics` + `slack.post_message` | ✅ activatable |
| anomaly-digest-daily | `ai.summarize` (+ email already shipped) | ✅ activatable |
| competitor-watch-weekly | `ai.summarize` (+ email already shipped) | ✅ activatable |
| approval-queue-digest | `slack.post_message` | ✅ activatable |
| shopify-low-stock-alert | `shopify.fetch_orders` (fetch_inventory variant) + `slack.post_message` | partial — needs `shopify.fetch_inventory` (deferred to A.5 sub-pass) |
| search-console-weekly-insights | `search_console.fetch_queries` + `ai.summarize` (+ email shipped) | ✅ activatable |
| ad-spend-snapshot-daily | `meta.fetch_campaign_metrics` + `google.fetch_campaign_metrics` + `ai.summarize` (+ email shipped) | ✅ activatable |

After Phase Ω.8 priority A: **13 of 14 templates fully activatable**.
The 1 remaining (shopify low-stock) waits on `shopify.fetch_inventory`
in priority A.5 or C.

---

## 7. What this plan explicitly EXCLUDES

These are NOT Phase Ω.8 scope:

- ❌ Workflow runtime / sequencer / DAG / branching / loops
- ❌ Schedule trigger infrastructure (Inngest re-registration)
- ❌ Webhook trigger infrastructure
- ❌ Multi-step workflow persistence layer (`workflows` / `workflow_steps`
  tables remain forbidden per RUNTIME_BOUNDARIES.md)
- ❌ Workflow versioning / history
- ❌ Sub-workflow / workflow-calls-workflow patterns
- ❌ Workflow scheduler / cron beyond existing Inngest functions
- ❌ Customer-facing publish actions (tier 5 reserved; no shipping
  decision yet)
- ❌ Outbound email to customer lists (tier 4 gated, deferred)
- ❌ New AI runtime (the Copilot remains ideation-only; AI as action
  for `ai.summarize` reuses existing OpenRouter substrate)

If any planned Phase Ω.8 handler appears to require any of the above,
**STOP and re-evaluate the design**. The handler is likely the wrong
shape.

---

## 8. Strategic principles guiding Phase Ω.8

These four principles take precedence over any local optimization:

### 8.1 Templates first, handlers second

Phase Ω.8 is justified by the marketplace. Every new handler unlocks a
template the operator can ALREADY see in the marketplace but can't
activate. We don't ship a handler that no template uses.

### 8.2 Single-executor invariant is sacred

`executeAction()` is the only execution path. No exceptions, no
"convenience" detours, no "this one is special". Every Phase Ω.8 PR
that violates this is rejected at review.

### 8.3 Safety defaults to OFF

Every new LIVE flag defaults to `false`. Every spend-tier-3+ action
defaults to gated. Every per-org allowlist defaults to empty in prod
(operator must explicitly enable). The platform should be UNUSABLE for
real-money mutations until the operator explicitly configures it.

### 8.4 No new orchestration surface

Phase Ω.8 ships ACTIONS, not WORKFLOWS. Workflows compose actions in
the existing single-step rule shape. The marketplace + Copilot already
provide the composition UX layer. There is no Phase Ω.8 case for adding
a workflow runtime.

---

## 9. Success metrics (operator-visible)

After Phase Ω.8 priority A:

- **18+ handlers** in the action catalog (up from 7)
- **8+ active providers** with at least one canonical operation
- **13 of 14 templates** fully activatable end-to-end
- **3 marketer-faced operation categories** (Pause / Budget / Report)
  populated by 3+ providers each — cross-provider primitives become
  real to operators
- **`requires_approval` rate** in the action catalog: ~25% (4 of 14
  spend-increasing/launch operations) — operator sees that most
  operations don't need approval and the few that do are clearly marked
- **Zero new orchestration code paths** — RUNTIME_BOUNDARIES.md remains
  the authoritative architecture; this plan adds primitives, not engines

---

## 10. Risk register

| Risk | Severity | Mitigation |
|---|---|---|
| Operator forgets to flip a LIVE flag and runs A.2 in simulated mode for weeks | LOW | Operator-facing LIVE-flag matrix on /governance dashboard (Phase δ) already surfaces this. |
| Google scope re-authorization breaks existing Google Ads connection | MEDIUM | Each new scope appends to the existing Google OAuth client. Operators re-auth via existing /integrations flow; tested in dev before each scope add. |
| BigQuery service-account auth model conflicts with per-org OAuth pattern | MEDIUM | BQ ships in A.3 — use service-account JSON in per-org Vault as the canonical pattern. Operator generates the SA key in their GCP project. Document the operator procedure. |
| Slack app distribution model unclear (incoming webhook vs bot) | MEDIUM | Default to incoming webhook for v1 (simpler operator setup; per-channel URL). Bot model deferred to Priority C if multi-channel posts become a use case. |
| TikTok / LinkedIn dev-app review delays Priority B | LOW (deferred priority) | B is explicitly deferred until A completes; operator initiates dev-app review in parallel with A.3-A.4. |
| AI rate-limiting from OpenRouter when `ai.summarize` becomes popular | MEDIUM | Per-org rate limit (`ACTION_EXECUTION_MAX_PER_MINUTE`) already protects. Add per-org credit cap (existing substrate via `deduct_credits` RPC) to `ai.summarize` handler. |
| New handlers drift on `result_data` shape conventions | LOW | `ACTION_RUNTIME_RULES.md §8` codifies the shape. PR review enforces. |
| Operator confusion when a template has steps for a provider that's not connected | LOW | The template detail page shows "Not connected — Connect →" rows (Phase Ω.6 #5 IntegrationBadge); the activation flow surfaces the gap honestly. |

---

## 11. Authority + cross-references

This plan is reference material. Implementation authority remains:
- `CONSTITUTION.md` — prime directives
- `CLAUDE.md` — execution rules
- `SYSTEM_CONTROL.md` — runtime authority
- `ACTION_RUNTIME_RULES.md` — per-handler contract
- `OPERATIONS_TAXONOMY.md` — classification scheme
- `INTEGRATIONS_CAPABILITY_MATRIX.md` — provider readiness matrix

When this plan conflicts with any authority document above, the
authority wins and this plan MUST be updated.

---

## 12. Re-evaluation cadence

This document is re-reviewed at:
- End of each sub-pass (A.1, A.2, A.3, A.4 completion)
- Any operator-initiated priority shift
- Any RUNTIME_BOUNDARIES.md update that affects handler authoring

Priority A target completion: ~6 weeks from authorization start.
Priority B target completion: ~3 weeks after A.
Priority C / D: ongoing, demand-driven.
