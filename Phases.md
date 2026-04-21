# Growth OS — Build Phases & Specs

---

## PHASE 1 — Foundation
**Goal:** Auth + Database + Backend skeleton working end-to-end

### Clerk
- [x] ClerkProvider in `app/layout.tsx`
- [x] Middleware protecting all private routes
- [x] Sign-in / Sign-up pages (`/sign-in`, `/sign-up`)
- [x] Auto-create Organization on sign-up
- [x] Redirect to `/dashboard/overview` after auth

### Supabase Schema
- [x] `organizations` table
- [x] `users` table
- [x] `subscriptions` table
- [x] `audit_logs` table
- [x] RLS enabled on all tables
- [x] All tables have `org_id` column

### Backend (Railway/VPS)
- [x] Hono server setup (binds 0.0.0.0:3001)
- [x] Clerk token verification middleware
- [x] Health check endpoint `GET /health`
- [x] Base API structure `/api/v1/`
- [x] Error handling + logging
- [x] Clerk webhook handler (`POST /api/webhooks/clerk`)
- [x] PM2 ecosystem config (`ecosystem.config.cjs`)

### Deliverable
User can sign up → create org → land on dashboard → backend responds to authenticated requests

---

## PHASE 2 — Data Ingestion
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
**Goal:** User can execute decisions as actions

### Actions
- [x] `actions_library` table
- [x] `automation_rules` table
- [x] `automation_runs` table
- [x] `decision_history` table (CRITICAL — memory system)

### Decision History Record
Every execution logs:
- decision
- action_taken
- trigger_condition
- data_used (snapshot)
- result (success/failed/skipped)
- ai_explanation
- confidence_score

### Pages (Real Data)
- [x] Actions Library (`/actions`)
- [x] Action Detail (`/actions/[id]`)
- [x] Execution Logs (`/actions/logs`)
- [x] Automation Status (`/actions/automation`)
- [x] Decision History (`/automation/history`)

### Automation
- [x] Automation rules builder (CRUD via API + UI)
- [x] Strategies (IF→THEN playbooks — automation_rules table)
- [x] Inngest job for automated execution (`dispatchAutomation`)
- [x] Manual execution from Decision Detail page

### Deliverable
User sees decision → clicks execute → action runs → result logged in Decision History

---

## PHASE 5 — Creatives
**Goal:** AI generates creatives from brand data + performance signals

### Brand Kit
- [x] `brand_kits` table
- [x] Logo + colors + fonts upload (Supabase Storage)
- [x] Tone of voice input

### Creative Generation
- [x] `creative_generations` table
- [x] `creatives` table
- [x] OpenRouter for copy generation (headlines, body)
- [x] SiliconFlow / Kolors for image generation
- [x] Creative scoring by performance data

### Pages (Real Data)
- [x] Brand Kit
- [x] Creative Generator
- [x] Creative Results
- [x] Creative Editor

### Deliverable
User uploads brand kit → generates creatives → ranks by predicted performance → pushes to campaign

---

## PHASE 6 — Campaigns
**Goal:** Full campaign management with AI assistance

### Campaigns
- [x] `campaigns` table (connected to ad_accounts)
- [x] Campaign list with real metrics
- [x] Campaign detail with decisions overlay
- [x] AI-assisted campaign creation

### Pages (Real Data)
- [x] Campaigns List
- [x] Campaign Detail
- [x] Create Campaign

### Deliverable
User creates campaign from inside the OS → AI suggests targeting + budget → pushes to Meta/Google

---

## PHASE 7 — Monetization + Polish
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

## BUILD ORDER SUMMARY

| Phase | Focus | Duration |
|-------|-------|----------|
| 1 | Foundation (Auth + DB + Backend) | Week 1 |
| 2 | Data Ingestion (Integrations + Sync) | Week 2-3 |
| 3 | Intelligence (Decisions + AI) | Week 3-4 |
| 4 | Execution (Actions + History) | Week 4-5 |
| 5 | Creatives (AI Generation) | Week 5-6 |
| 6 | Campaigns | Week 6 |
| 7 | Monetization + Polish | Week 7-8 |

---

## SPECKIT NOTES

- Each phase = one Speckit spec
- Never start next phase before current phase deliverable is working
- Decision History (Phase 4) is the most critical table — never skip or simplify
- RLS must be verified after every new table added
- Every API endpoint must be tested with wrong `org_id` to verify isolation

---

## BILLING LOGIC — Applies to Phase 7

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