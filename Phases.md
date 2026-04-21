# Growth OS — Build Phases & Specs

## PROJECT STATUS SUMMARY

**Current Phase:** 1-4 Code Ready, Blocked at Backend Exposure
**Blocker:** Backend server not accessible externally (0.0.0.0 binding issue)
**Priority:** Fix backend first, then resume Phase 1-4 integration testing

---

## PHASE 1 — Foundation
**Status:** ⚠️ Code Complete, Integration Blocked

**Goal:** Auth + Database + Backend skeleton working end-to-end

### Clerk ✅
- [x] ClerkProvider in `app/layout.tsx`
- [x] Middleware protecting all private routes
- [x] Sign-in / Sign-up pages (`/sign-in`, `/sign-up`)
- [x] Auto-create Organization on sign-up
- [x] Redirect to `/dashboard/overview` after auth
- [x] Webhooks configured (user.created)
- [ ] **BLOCKED:** Webhook not being received (backend not exposed)

### Supabase Schema ✅
- [x] `organizations` table
- [x] `users` table
- [x] `subscriptions` table
- [x] `audit_logs` table
- [x] RLS enabled on all tables
- [x] All tables have `org_id` column
- [ ] **BLOCKED:** No data entering (webhook failure cascade)

### Backend (Express on VPS) ⚠️
- [x] Express server written
- [x] Clerk token verification middleware
- [x] Health check endpoint `GET /health`
- [x] Base API structure `/api/v1/`
- [x] Error handling + logging setup
- [x] PM2 process manager
- [ ] **CRITICAL:** Server binding to localhost, not 0.0.0.0
- [ ] **CRITICAL:** Not accessible from external networks
- [ ] **CRITICAL:** Webhook endpoint unreachable

### Deliverable Status
❌ **NOT COMPLETE** — User can sign up but webhook fails, no data enters DB

**What's Needed:**
1. Fix backend binding to 0.0.0.0
2. Verify Hostinger firewall allows port 3001
3. Verify PM2 process not crashing
4. Test webhook delivery from Clerk
5. Confirm Supabase insert working

---

## PHASE 2 — Data Ingestion
**Status:** ❌ Not Started (Blocked by Phase 1)

**Goal:** Connect ad platforms + pull real data into DB

### Integrations
- [ ] `integrations` table
- [ ] `ad_accounts` table
- [ ] `sync_logs` table
- [ ] Integrations List page (real data)
- [ ] Connect Integration flow (OAuth)

### Platforms (Core First)
- [ ] Meta Ads API — campaigns + metrics
- [ ] Google Ads API — campaigns + metrics
- [ ] Shopify API — orders + revenue

### Sync Jobs (Inngest)
- [ ] Daily sync job per integration
- [ ] `campaign_metrics` table (partitioned by date)
- [ ] Sync status + error handling
- [ ] Manual re-sync trigger

### Deliverable
User connects Meta/Google/Shopify → data syncs → Dashboard shows real numbers

---

## PHASE 3 — Intelligence Layer
**Status:** ❌ Not Started

**Goal:** AI starts generating decisions from data

### Decision Engine
- [ ] `decisions` table
- [ ] `alerts` table
- [ ] Anomaly detection logic (ROAS drop, spend spike, conversion drop)
- [ ] Opportunity detection logic (scaling signals)
- [ ] Decision prioritization engine

### Pages (Real Data)
- [ ] Dashboard Overview — real KPIs
- [ ] Decisions Overview — real decisions
- [ ] Decision Detail — trigger + data + reasoning + impact
- [ ] Alerts Center — threshold triggers
- [ ] Opportunities — growth signals

### AI Integration (OpenRouter)
- [ ] Decision generation prompt
- [ ] Anomaly explanation
- [ ] Confidence score calculation

### Deliverable
System detects anomalies → generates decisions → user sees prioritized action list

---

## PHASE 4 — Execution Layer
**Status:** ❌ Not Started

**Goal:** User can execute decisions as actions

### Actions
- [ ] `actions_library` table
- [ ] `automation_rules` table
- [ ] `automation_runs` table
- [ ] `decision_history` table (CRITICAL — memory system)

### Decision History Record (SACRED)
Every execution logs:
- decision
- action_taken
- trigger_condition
- data_used (snapshot)
- result (success/failed/skipped)
- ai_explanation
- confidence_score

### Pages (Real Data)
- [ ] Actions Library
- [ ] Action Detail
- [ ] Execution Logs
- [ ] Automation Status
- [ ] Decision History

### Automation
- [ ] Automation rules builder
- [ ] Strategies (IF→THEN playbooks)
- [ ] Inngest jobs for automated execution

### Deliverable
User sees decision → clicks execute → action runs → result logged in Decision History

---

## PHASE 5 — Creatives
**Status:** ❌ Not Started

**Goal:** AI generates creatives from brand data + performance signals

### Brand Kit
- [ ] `brand_kits` table
- [ ] Logo + colors + fonts upload (Supabase Storage)
- [ ] Tone of voice input

### Creative Generation
- [ ] `creative_generations` table
- [ ] `creatives` table
- [ ] OpenRouter for copy generation (headlines, body)
- [ ] SiliconFlow / Kolors for image generation
- [ ] Creative scoring by performance data

### Pages (Real Data)
- [ ] Brand Kit
- [ ] Creative Generator
- [ ] Creative Results
- [ ] Creative Editor

### Deliverable
User uploads brand kit → generates creatives → ranks by predicted performance → pushes to campaign

---

## PHASE 6 — Campaigns
**Status:** ❌ Not Started

**Goal:** Full campaign management with AI assistance

### Campaigns
- [ ] `campaigns` table (connected to ad_accounts)
- [ ] Campaign list with real metrics
- [ ] Campaign detail with decisions overlay
- [ ] AI-assisted campaign creation

### Pages (Real Data)
- [ ] Campaigns List
- [ ] Campaign Detail
- [ ] Create Campaign

### Deliverable
User creates campaign from inside the OS → AI suggests targeting + budget → pushes to Meta/Google

---

## PHASE 7 — Monetization + Polish
**Status:** ❌ Not Started

**Goal:** Billing, settings, production-ready

### Billing (Stripe)
- [ ] `subscriptions` table connected to Stripe
- [ ] Plans: Starter / Growth / Scale
- [ ] Credits system for AI usage
- [ ] BYOK option (bring your own OpenRouter key) for LTD users
- [ ] AppSumo LTD flow (coupon redemption)
- [ ] Webhooks for subscription events
- [ ] Auto invoice via Resend

### Settings
- [ ] Account settings
- [ ] Team management (invite members)
- [ ] API keys management
- [ ] Billing page

### Production Readiness
- [ ] RLS audit on all tables
- [ ] Audit logs complete
- [ ] Rate limiting on all API endpoints
- [ ] Performance testing
- [ ] Error boundaries on all pages
- [ ] Sentry configured for production

### Deliverable
Full production-ready SaaS — paying customers can onboard, use, and be billed

---

## BUILD ORDER & STATUS

| Phase | Focus | Status | Notes |
|-------|-------|--------|-------|
| 1 | Foundation (Auth + DB + Backend) | ⚠️ Code done, blocked | Backend exposure issue |
| 2 | Data Ingestion (Integrations + Sync) | ❌ Waiting | Can't start without Phase 1 |
| 3 | Intelligence (Decisions + AI) | ❌ Waiting | Can't start without Phase 2 |
| 4 | Execution (Actions + History) | ❌ Waiting | Can't start without Phase 3 |
| 5 | Creatives (AI Generation) | ❌ Waiting | Can't start without Phase 4 |
| 6 | Campaigns | ❌ Waiting | Can't start without Phase 5 |
| 7 | Monetization + Polish | ❌ Waiting | Can't start without Phase 6 |

---

## BILLING LOGIC (applies to all phases)

### Plan Types
- `subscription` — pays monthly, gets credits, uses platform OpenRouter key
- `ltd` — one-time AppSumo deal, credits disabled, BYOK mandatory

### Credits System Logic (subscription only)
```
Check balance → Deduct → Execute → Log
```
Credit costs per action:
- Copy generation = 2 credits
- Image generation = 10 credits
- Decision generation = 1 credit

### BYOK Logic (ltd only)
- User adds their own OpenRouter API key
- Key stored encrypted in Supabase Vault
- Platform key never used for LTD users
- If no BYOK key → block AI features

### AppSumo Flow
- User redeems coupon code
- `plan_type` set to `ltd`
- Credits disabled automatically
- Prompt to add BYOK key on first login

---

## SPECKIT NOTES

- Each phase = one Speckit spec
- Never start next phase before current phase deliverable is working
- Decision History (Phase 4) is the most critical table — never skip or simplify
- RLS must be verified after every new table added
- Every API endpoint must be tested with wrong `org_id` to verify isolation

---

## NEXT IMMEDIATE ACTIONS

1. **Fix Phase 1 Backend** (BLOCKER)
   - Change binding from localhost to 0.0.0.0
   - Verify PM2 process stability
   - Verify Hostinger firewall
   - Test webhook delivery from Clerk
   - Confirm Supabase insert working

2. **Once Phase 1 is fixed:**
   - Test user signup → webhook → DB insert end-to-end
   - Then proceed to Phase 2 with Speckit