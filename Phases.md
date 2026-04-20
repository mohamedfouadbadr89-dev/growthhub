# Growth OS — Build Phases & Specs

---

## PHASE 1 — Foundation
**Goal:** Auth + Database + Backend skeleton working end-to-end

### Clerk
- [ ] ClerkProvider in `app/layout.tsx`
- [ ] Middleware protecting all private routes
- [ ] Sign-in / Sign-up pages (`/sign-in`, `/sign-up`)
- [ ] Auto-create Organization on sign-up
- [ ] Redirect to `/dashboard/overview` after auth

### Supabase Schema
- [ ] `organizations` table
- [ ] `users` table
- [ ] `subscriptions` table
- [ ] `audit_logs` table
- [ ] RLS enabled on all tables
- [ ] All tables have `org_id` column

### Backend (Railway)
- [ ] Express/Hono server setup
- [ ] Clerk token verification middleware
- [ ] Health check endpoint `GET /health`
- [ ] Base API structure `/api/v1/`
- [ ] Error handling + logging (Sentry)

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
- [ ] `actions_library` table
- [ ] `automation_rules` table
- [ ] `automation_runs` table
- [ ] `decision_history` table (CRITICAL — memory system)

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