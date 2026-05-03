# Tasks: Phase 6 — Campaigns

**Feature**: Campaigns (Browse, Detail with Decisions Overlay, Create with AI Assistance + Push)
**Branch**: `claude/init-growthhub-PaRUm`
**Plan**: `specs/006-campaigns/plan.md`

---

## Phase 1: Setup

- [X] T001 Verify prerequisites: Phase 2 campaign_metrics table exists, Phase 3 decisions table exists, Phase 4 actions_library + executeAction() service exist in `backend/src/services/execution/action-executor.ts`

---

## Phase 2: Foundational — Database Migration

- [X] T002 Create `supabase/migrations/20260420000007_campaigns.sql`: campaigns table with all columns, UNIQUE constraint on (org_id, name, platform), RLS policy, 4 indexes, moddatetime trigger, and 2 new action seeds for Meta and Google create_campaign actions

---

## Phase 3: User Story 1 — Browse Campaigns (P1)

**Story Goal**: Org member opens Campaigns list and sees all campaigns with 30-day aggregated metrics. Filters by status. Cross-org isolation enforced.

**Independent Test**: GET /api/v1/campaigns returns campaigns with metrics.spend, metrics.roas, metrics.conversions. GET with ?status=active returns only active campaigns. Different org token returns empty array.

- [X] T00X [US1] Create `backend/src/services/campaigns/campaigns.ts` — implement `listCampaigns(orgId, filters)`: query campaigns table with status/platform filter, join campaign_metrics last 30 days aggregated by (campaign_name, platform), attach metrics to each campaign row, support limit/offset pagination with total count
- [X] T00X [US1] Create `backend/src/services/campaigns/index.ts` — re-export all service functions
- [X] T00X [US1] Create `backend/src/routes/v1/campaigns.ts` — implement GET / handler: extract orgId from Clerk JWT, parse and validate query params (status, platform, limit 1–100 clamped to 100, offset), call listCampaigns, return 200 with `{campaigns, total}`
- [X] T00X [US1] Mount campaigns router in `backend/src/routes/v1/index.ts`: `v1.route('/campaigns', campaignsRouter)`
- [X] T00X [US1] Rewrite `app/campaigns/page.tsx` — campaigns list: fetch GET /api/v1/campaigns on mount, display table with name/platform/status/spend/roas/conversions columns, status filter dropdown (all/active/paused/draft/completed), empty state with "Connect an integration" CTA, loading skeleton

---

## Phase 4: User Story 2 — Campaign Detail with Decisions Overlay (P2)

**Story Goal**: Clicking a campaign shows full detail: 30-day metrics, 14-day trend, and any AI decisions that reference the campaign by name. User can pause/activate from detail page.

**Independent Test**: GET /api/v1/campaigns/:id returns decisions array with confidence_score. PATCH /api/v1/campaigns/:id with {status: "paused"} returns updated campaign.

- [X] T00X [US2] Add `getCampaignById(orgId, id)` to `backend/src/services/campaigns/campaigns.ts`: fetch campaign row, 30-day aggregated metrics, 14-day daily trend from campaign_metrics (GROUP BY date), decisions overlay (SELECT from decisions WHERE campaign_name ILIKE campaign.name AND status='active'), assemble and return full detail object
- [X] T00X [US2] Add `updateCampaign(orgId, id, patch)` to `backend/src/services/campaigns/campaigns.ts`: validate status transition via VALID_TRANSITIONS map, enforce admin-only for 'archived' status (pass role from route handler), apply patch, return updated row
- [X] T0X0 [US2] Add GET /:id handler to `backend/src/routes/v1/campaigns.ts`: call getCampaignById, 404 if not found or wrong org, return 200 with full detail shape
- [X] T0X1 [US2] Add PATCH /:id handler to `backend/src/routes/v1/campaigns.ts`: parse body (status, daily_budget, targeting, name), validate status enum, check admin role from Clerk for 'archived', call updateCampaign, return 200
- [X] T0X2 [US2] Rewrite `app/campaigns/[id]/page.tsx` — campaign detail: fetch GET /api/v1/campaigns/:id, display metrics summary cards (spend/ROAS/conversions/impressions), 14-day trend sparkline, Decisions section listing each decision with confidence score badge and link to /actions/:action_id, status update button (Pause/Activate), 404 state

---

## Phase 5: User Story 3 — Create Campaign with AI Assistance + Push (P3)

**Story Goal**: User creates a new campaign, gets AI targeting suggestions, optionally edits them, saves as draft, and pushes to Meta or Google via the actions library.

**Independent Test**: POST /api/v1/campaigns creates draft campaign with 201. POST /api/v1/campaigns/:id/ai-suggestions returns suggestions object. POST /api/v1/campaigns/:id/push returns 202 with history_id. LTD user without BYOK gets 402 BYOK_REQUIRED. Push with no integration gets 422 INTEGRATION_NOT_CONNECTED.

- [X] T0X3 [US3] Add `createCampaign(orgId, body)` to `backend/src/services/campaigns/campaigns.ts`: validate name + platform required, validate platform IN ('meta','google'), INSERT into campaigns, 409 on unique constraint violation, return created row
- [X] T0X4 [US3] Create `backend/src/services/campaigns/ai-suggestions.ts` — `generateAiSuggestions(orgId, campaignId)`: resolveApiKey(orgId) BYOK gate, fetch campaign row, fetch top 3 campaigns by ROAS from campaign_metrics last 30 days, build OpenRouter prompt requesting interests/age_min/age_max/gender/daily_budget_recommendation, parse and validate JSON response, UPDATE campaigns.ai_suggestions with result + generated_at timestamp, return suggestions
- [X] T0X5 [US3] Add `pushCampaign(orgId, campaignId, platform)` to `backend/src/services/campaigns/campaigns.ts`: fetch campaign (404 if missing), validate status is draft or paused (400 otherwise), verify integration connected for platform from integrations table (422 INTEGRATION_NOT_CONNECTED if not), resolve action template ID (meta→00000000-0000-0000-0000-000000000009, google→00000000-0000-0000-0000-000000000010), call executeAction with campaign params, return {history_id, action_id, status:'executed'}
- [X] T0X6 [US3] Add POST / handler to `backend/src/routes/v1/campaigns.ts`: parse and validate body (name required, platform required and in enum), call createCampaign, return 201
- [X] T0X7 [US3] Add POST /:id/ai-suggestions handler to `backend/src/routes/v1/campaigns.ts`: call generateAiSuggestions, return 200 with {suggestions}; propagate 402 BYOK_REQUIRED, 404 campaign not found
- [X] T0X8 [US3] Add POST /:id/push handler to `backend/src/routes/v1/campaigns.ts`: validate body.platform, call pushCampaign, return 202 with history response; propagate 404/422/400 errors
- [X] T0X9 [US3] Rewrite `app/campaigns/create/page.tsx` — create form: name + platform + daily_budget fields, targeting fields (interests tags, age_min, age_max, gender), "Get AI Suggestions" button (POST to ai-suggestions, display results panel), "Save Draft" button (POST /campaigns, then redirect to /campaigns), "Push to Platform" button (POST /campaigns/:id/push if already saved or save-then-push, redirect to /actions/logs), error states for BYOK_REQUIRED and INTEGRATION_NOT_CONNECTED

---

## Phase 6: Polish

- [X] T0X0 TypeScript check: `cd /home/user/growthhub/backend && npx tsc --noEmit` — fix any type errors in campaigns service and routes
- [X] T0X1 Update `Phases.md` — check off Phase 6 campaign items
- [X] T0X2 Commit all Phase 6 files and push to `claude/init-growthhub-PaRUm`

---

## Dependencies

```
T001 → T002 → T003 → T004 → T005 → T006 → T007  (US1 — sequential)
T006 → T008 → T009 → T010 → T011 → T012           (US2 — sequential after router mounted)
T006 → T013 → T014 → T015 → T016 → T017 → T018 → T019  (US3 — sequential)
T019 → T020 → T021 → T022                          (Polish)
```

## Parallel Opportunities

Within each user story phase, database service tasks (T003, T008, T013–T015) can be coded in parallel with each other before route handlers (T005, T010, T011, T016–T018) and frontend (T007, T012, T019) are wired up.

## Implementation Strategy

**MVP scope**: Complete US1 (T001–T007) first for immediate campaign visibility value. Then US2 (T008–T012) for decision overlay. US3 (T013–T019) last as it has the most external dependencies (OpenRouter, Phase 4 executeAction, integrations table).
