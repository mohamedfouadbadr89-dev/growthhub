# CLAUDE.md — Growth OS (GrowthHub)

## 1. PRODUCT CONTEXT

**What is this?**
An AI-powered Growth Operating System — a closed-loop decision engine for ecommerce/DTC brands.

**Core Loop:**
Data → Insight → Decision → Action → Result → Learning → Better Decision

**Critical Distinction:**
- Competitors: show insights OR run rules
- This product: thinks + decides + executes + learns

**The 3 Core Innovations:**
- Decision History = Memory System (not logs)
- Decision Center = Brain (converts signals → actions)
- Strategies = Reusable Playbooks (feeds automation)

---

## 2. CURRENT STATUS

### ✅ Completed
- **Frontend** — All pages built from Stitch, Clerk auth working, fully functional locally
- **Database Schema** — organizations, users, subscriptions, audit_logs with RLS
- **Auth** — Clerk integrated, webhooks configured (user.created)
- **Backend Code** — Express API written, routes defined, PM2 setup

### ❌ BLOCKED
- **Backend Accessibility** — Server not reachable externally (localhost binding issue)
- **Webhooks** — Clerk webhooks failing (backend not exposed)
- **Supabase Inserts** — No data entering DB (webhook failure cascade)

### 🚨 Critical Blocker
Backend on VPS (72.62.131.250:3001) is **not accessible from external networks**. This blocks:
- Clerk webhook delivery
- Supabase data ingestion
- All API communication

---

## 3. TECH STACK

| Layer | Tool | Status |
|-------|------|--------|
| Frontend | Next.js (App Router) | ✅ Done, locally working |
| Frontend Host | Hostinger VPS (KVM 1) | 🔧 Ready for deploy |
| Backend Host | Hostinger VPS (same instance) | ❌ Not exposed (0.0.0.0 issue) |
| Database | Supabase (PostgreSQL) | ✅ Schema ready, RLS enabled |
| Auth | Clerk | ✅ Configured, webhooks stuck |
| Secrets | Supabase Vault | ✅ Ready |
| Cache | Upstash Redis | 📋 Phase 2+ |
| Queue/Jobs | Inngest | 📋 Phase 2+ |
| File Storage | Supabase Storage | 📋 Phase 5+ |
| Email | Resend | 📋 Phase 7 |
| AI Gateway | OpenRouter | 📋 Phase 3+ |
| Image Gen | SiliconFlow + Kolors | 📋 Phase 5+ |
| Payments | Stripe | 📋 Phase 7 |

---

## 4. ARCHITECTURE RULES

### Data Flow — NEVER break this
```
Frontend (Hostinger VPS) → Backend API (same VPS) → Supabase (Database)
```
- Frontend NEVER calls Supabase directly
- All DB queries go through Backend API
- Backend verifies Clerk token on every request

### Database Isolation — CRITICAL for audit & investors
- Supabase project is **fully isolated** — production only
- **Row Level Security (RLS) enabled on every table** — no exceptions
- Every table has `org_id` — users only see their org's data
- `service_role_key` lives on Backend only — never exposed to frontend
- All sensitive operations logged in `audit_logs`

### Auth Rules — Clerk
- Every user belongs to an Organization (mandatory)
- `orgId` from Clerk = `org_id` in every DB table
- NEVER query DB without `org_id` filter
- Middleware protects all routes except `/`, `/sign-in`, `/sign-up`

### Backend Binding — CRITICAL FIX NEEDED
```typescript
// CORRECT
app.listen(PORT, '0.0.0.0')

// WRONG (current issue)
app.listen(PORT, 'localhost')
```
Currently the backend is binding to localhost only — it needs to bind to 0.0.0.0 to be accessible from external networks (Clerk webhooks, external API calls).

---

## 5. SYSTEM ARCHITECTURE LAYERS

```
INPUT LAYER        → Dashboards (✅), Attribution, LTV, Creative Analytics
INTELLIGENCE LAYER → Decision Engine (📋), Anomaly Detection, Opportunity Detection
DECISION LAYER     → Decisions Overview, Alerts, Opportunities
EXECUTION LAYER    → Actions Library, Campaigns, Creatives
AUTOMATION LAYER   → Decision Center (Brain), Strategies, Builder, Decision History
```

---

## 6. PAGE ROUTING MAP

### Dashboard → `app/dashboard/`
| Page | Path | Status |
|------|------|--------|
| Overview | `overview/page.tsx` | ✅ Done |
| Channels | `channels/page.tsx` | ✅ Done |
| Creative Analytics | `creative/page.tsx` | ✅ Done |
| Attribution | `attribution/page.tsx` | ✅ Done |
| Segment | `segment/page.tsx` | ✅ Done |
| Profit | `profit/page.tsx` | ✅ Done |
| LTV Analysis | `ltv/page.tsx` | ✅ Done |
| Cohort Analysis | `cohort/page.tsx` | ✅ Done |

### Decisions → `app/decisions/`
| Page | Path | Status |
|------|------|--------|
| Overview | `page.tsx` | ✅ Done |
| Detail | `[id]/page.tsx` | ✅ Done |
| Alerts | `alerts/page.tsx` | ✅ Done |
| Opportunities | `opportunities/page.tsx` | ✅ Done |
| Recommendations | `recommendations/page.tsx` | ✅ Done |
| Audience Insights | `audience/page.tsx` | ✅ Done |

### Actions → `app/actions/`
| Page | Path | Status |
|------|------|--------|
| Library | `page.tsx` | ✅ Done |
| Detail | `[id]/page.tsx` | ✅ Done |
| Execution Logs | `logs/page.tsx` | ✅ Done |
| Automation Status | `automation/page.tsx` | ✅ Done |

### Creatives → `app/creatives/`
| Page | Path | Status |
|------|------|--------|
| Generator | `page.tsx` | ✅ Done |
| Results | `results/page.tsx` | ✅ Done |
| Editor | `editor/page.tsx` | ✅ Done |
| Brand Kit | `brand-kit/page.tsx` | ✅ Done |

### Campaigns → `app/campaigns/`
| Page | Path | Status |
|------|------|--------|
| List | `page.tsx` | ✅ Done |
| Create | `create/page.tsx` | ✅ Done |
| Detail | `[id]/page.tsx` | ✅ Done |

### Integrations → `app/integrations/`
| Page | Path | Status |
|------|------|--------|
| List | `page.tsx` | ✅ Done |
| Connect | `connect/page.tsx` | ✅ Done |

### Settings → `app/settings/`
| Page | Path | Status |
|------|------|--------|
| Account | `page.tsx` | ✅ Done |
| Team | `team/page.tsx` | ✅ Done |
| Billing | `billing/page.tsx` | ✅ Done |

---

## 7. PAGE FILE RULES — CRITICAL

Every `page.tsx` = **content only**.

✅ DO:
```tsx
export default function PageName() {
  return (
    <div className="space-y-8">
      {/* content here */}
    </div>
  )
}
```

❌ NEVER:
- No `<aside>` sidebar in pages
- No `<header>` topbar in pages
- No `fixed` positioning
- No `h-screen` wrappers
- The `app/dashboard/layout.tsx` handles Sidebar + Topbar

---

## 8. DESIGN TOKENS

```
primary:                #005bc4
foreground:             #05345c
muted-foreground:       #3d618c
background:             #f8f9ff
border:                 #91b4e4 (with opacity)
surface-container-low:  #eff4ff
surface-container-high: #dce9ff
```

---

## 9. BILLING & USER PLANS

### Two User Types
| | Regular User | AppSumo LTD User |
|---|---|---|
| Billing | Subscription + Credits | One-time deal |
| API | OpenRouter (platform key) | BYOK — mandatory |
| Credits | Active | Disabled completely |

### Logic
```typescript
if (user.plan_type === 'ltd') {
  // force BYOK — credits system disabled
  // use user's own OpenRouter key from Supabase Vault
} else {
  // normal credits flow
  // deduct from org credits balance
}
```

### DB Column
```sql
-- in users or organizations table
plan_type: enum('subscription', 'ltd')
byok_openrouter_key: encrypted via Supabase Vault (nullable)
```

---

## 10. BACKEND DEPLOYMENT

### Current Issue
Backend Express server is binding to `localhost` instead of `0.0.0.0`. This means:
- ✅ Locally accessible (curl localhost:3001 works sometimes)
- ❌ **NOT accessible from external networks** (Clerk webhooks can't reach it)
- ❌ Server may be crashing silently (PM2 says "online" but unresponsive)

### Fix Required
1. Change `app.listen(PORT, 'localhost')` → `app.listen(PORT, '0.0.0.0')`
2. Add comprehensive logging (startup message, all requests, all errors)
3. Verify PM2 process isn't crashing (add error handlers)
4. Verify Hostinger firewall isn't blocking port (not just UFW)
5. Test from external IP that endpoint is reachable
6. Verify Supabase insert is actually working

### Backend File Location
`/root/backend/growthhub/api/index.js`

### Current Routes
- `GET /api/v1/health` — status check
- `POST /api/v1/webhooks/clerk` — user.created webhook
- `GET /test-webhook` — debug endpoint

---

## 11. ENVIRONMENT VARIABLES

### Frontend (.env.local)
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### Backend (.env)
```
PORT=3001
NODE_ENV=production
SUPABASE_URL=https://...supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
CLERK_WEBHOOK_SECRET=...
```

---

## 12. DECISION HISTORY — SPECIAL NOTE

This is NOT a log table. It is the system memory and explainability layer.

Every record contains:
- `decision` — what was decided
- `action_taken` — what was executed
- `trigger_condition` — what caused it
- `data_used` — data snapshot at decision time
- `result` — success / failed / skipped
- `ai_explanation` — why the AI decided this
- `confidence_score` — 0-100

This feeds the learning loop — treat it as the most critical table in the system.

---

## 13. FRONTEND → BACKEND INTEGRATION (CRITICAL)

### Current Status
❌ **DISCONNECTED** — Frontend is static/server-rendered, no API calls to backend

### Requirements
- ✅ Remove all mock/hardcoded data
- ✅ Create centralized API client
- ✅ Connect all pages to real backend
- ✅ Implement loading/error/empty states
- ✅ Use Clerk JWT for auth

### API Client Setup
```typescript
// lib/api-client.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://72.62.131.250:3001/api/v1';

export async function apiCall(
  endpoint: string,
  options: RequestInit = {}
) {
  const token = await getClerkToken(); // from @clerk/nextjs
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }
  
  return response.json();
}
```

### Environment Variables
```
NEXT_PUBLIC_API_URL=http://72.62.131.250:3001
```

### Pages to Connect (Priority Order)

**Priority 1 — Core Data:**
1. Dashboard Overview → GET /api/v1/metrics
2. Brand Kit → GET/PUT /api/v1/brand-kit, POST /api/v1/brand-kit/logo
3. Creatives → POST /api/v1/creatives, GET /api/v1/creatives

**Priority 2 — Secondary:**
4. Decisions → GET /api/v1/decisions
5. Actions → GET /api/v1/actions
6. Integrations → GET /api/v1/integrations

**Priority 3 — Later:**
7. Campaigns, Settings, etc.

### Rules (MANDATORY)
- ❌ NO hardcoded/mock data
- ❌ NO direct Supabase access
- ❌ NO secrets in frontend
- ✅ All data from backend APIs
- ✅ Every page has loading/error states
- ✅ Clerk JWT in every request header