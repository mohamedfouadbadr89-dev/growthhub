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

## 2. TECH STACK

| Layer | Tool | Notes |
|-------|------|-------|
| Frontend | Next.js (App Router) | |
| Frontend Host | Hostinger VPS (KVM 1) | Node.js + PM2 + Nginx + SSL — manual setup |
| Version Control | GitHub | Source of truth |
| Backend Host | Railway | Persistent server for jobs/APIs |
| Database | Supabase (PostgreSQL) | Isolated project — production only |
| Auth | Clerk | Multi-tenancy + Organizations |
| Secrets | Supabase Vault | Encrypted credentials |
| Cache | Upstash Redis | Serverless |
| Queue/Jobs | Inngest | Background jobs, automation runs |
| File Storage | Supabase Storage | Creatives, brand assets |
| Email | Resend | Alerts, billing, notifications |
| AI Gateway | OpenRouter | Multi-model LLM access |
| Image Gen | SiliconFlow + Kolors | Creative generation |
| Payments | Stripe | Billing |
| Error Tracking | Sentry | |
| Product Analytics | Posthog | |

---

## 3. ARCHITECTURE RULES

### Data Flow — NEVER break this
```
Frontend (Hostinger VPS) → Backend API (Railway) → Supabase (Database)
```
- Frontend NEVER calls Supabase directly
- All DB queries go through Backend API
- Backend verifies Clerk token on every request

### Database Isolation — CRITICAL
This project is subject to technical audits and investor due diligence.

- Supabase project is **fully isolated** — dedicated production project, shared with nothing
- **Row Level Security (RLS) enabled on every table** — no exceptions
- Every table has `org_id` — users only see their organization's data
- `service_role_key` lives on Backend only — never exposed to frontend
- All sensitive operations are logged in `audit_logs` table
- Data is exportable per organization for compliance

### Auth Rules — Clerk
- Every user belongs to an Organization (mandatory)
- `orgId` from Clerk = `org_id` in every DB table
- NEVER query DB without `org_id` filter
- Use `auth()` in Server Components / API routes
- Use `useAuth()` / `useOrganization()` in Client Components only
- Middleware protects all routes except `/`, `/sign-in`, `/sign-up`

### Deployment Flow
```
Local → GitHub → Hostinger VPS (pull + pm2 restart)
```
- Never deploy directly without pushing to GitHub first
- PM2 manages the Next.js process on the VPS
- Nginx handles SSL termination and reverse proxy

---

## 4. SYSTEM ARCHITECTURE LAYERS

```
INPUT LAYER        → Dashboards, Attribution, LTV, Creative Analytics
INTELLIGENCE LAYER → Decision Engine (AI + rules), Anomaly Detection
DECISION LAYER     → Decisions Overview, Alerts, Opportunities
EXECUTION LAYER    → Actions Library, Campaigns, Creatives
AUTOMATION LAYER   → Decision Center (Brain), Strategies, Builder, History
```

---

## 5. PAGE ROUTING MAP

### Dashboard → `app/dashboard/`
| Page | Path | Logic | Output |
|------|------|-------|--------|
| Overview | `overview/page.tsx` | KPIs, anomaly detection | → decisions |
| Channels | `channels/page.tsx` | Channel breakdown, budget signals | → opportunities |
| Creative Analytics | `creative/page.tsx` | Creative-level performance | → creative_generator |
| Attribution | `attribution/page.tsx` | Multi-touch attribution | → budget decisions |
| Segments | `segment/page.tsx` | Segmentation by value/behavior | → audience_recommendations |
| Profit | `profit/page.tsx` | True net profit calculation | → scaling/stop decisions |
| LTV Analysis | `ltv/page.tsx` | Predictive LTV | → long-term decisions |
| Cohort Analysis | `cohort/page.tsx` | Retention curves | → strategy tuning |

### Decisions → `app/decisions/`
| Page | Path | Logic | Output |
|------|------|-------|--------|
| Overview | `page.tsx` | Aggregates AI decisions, prioritization | → decision_detail |
| Detail | `[id]/page.tsx` | trigger + data + reasoning + impact | → actions/automation |
| Alerts | `alerts/page.tsx` | Threshold triggers | → decisions |
| Opportunities | `opportunities/page.tsx` | Growth signals | → decision center |
| Recommendations | `recommendations/page.tsx` | AI suggestions | → campaigns |
| Audience Insights | `audience/page.tsx` | AI segmentation | → campaigns |

### Actions → `app/actions/`
| Page | Path | Logic | Output |
|------|------|-------|--------|
| Library | `page.tsx` | Executable templates | → action_detail |
| Detail | `[id]/page.tsx` | API mapping + execution logic | → run |
| Execution Logs | `logs/page.tsx` | Execution tracking | → decision history |
| Automation Status | `automation/page.tsx` | System health | → decision center |

### Automation → `app/automation/`
| Page | Path | Logic |
|------|------|-------|
| Decision Center | `page.tsx` | Brain — real-time insights, one-click execution |
| Strategies | `strategies/page.tsx` | IF→THEN playbooks, reusable logic |
| Builder | `builder/page.tsx` | Custom workflow builder |
| Decision History | `history/page.tsx` | Memory — decision+trigger+data+result+AI explanation+confidence |

### Creatives → `app/creatives/`
| Page | Path |
|------|------|
| Generator | `page.tsx` |
| Results | `results/page.tsx` |
| Editor | `editor/page.tsx` |
| Brand Kit | `brand-kit/page.tsx` |

### Campaigns → `app/campaigns/`
| Page | Path |
|------|------|
| List | `page.tsx` |
| Create | `create/page.tsx` |
| Detail | `[id]/page.tsx` |

### Integrations → `app/integrations/`
| Page | Path |
|------|------|
| List | `page.tsx` |
| Connect | `connect/page.tsx` |

### Settings → `app/settings/`
| Page | Path |
|------|------|
| Account | `page.tsx` |
| Team | `team/page.tsx` |
| Billing | `billing/page.tsx` |

---

## 6. PAGE FILE RULES — CRITICAL

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
- No `fixed` positioning in pages
- No `h-screen` wrappers in pages

The `app/dashboard/layout.tsx` handles Sidebar + Topbar automatically.

---

## 7. STITCH HTML EXPORT CONVERSION

When given a Stitch HTML export:

1. Extract main content only — remove sidebar, topbar, nav
2. Convert colors:
   - `#005bc4` → `text-primary` / `bg-primary`
   - `#05345c` → `text-foreground`
   - `#3d618c` → `text-muted-foreground`
   - `#f8f9ff` → `bg-background`
   - `#eff4ff` → `bg-surface-container-low`
   - `#dce9ff` → `bg-surface-container-high`
   - `#ffffff` → `bg-white`
   - `border-[#91b4e4]/10` → `border-border`
3. Replace `material-symbols-outlined` → Lucide React icons
4. Static data as constants at top of file
5. Add `"use client"` only if state/interactions needed
6. `font-sans` for headings, `font-body` for body text
7. Save to correct path from routing map above

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

## 9. DECISION HISTORY — SPECIAL NOTE

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

## 10. ENVIRONMENT VARIABLES

```
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard/overview
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard/overview

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# OpenRouter
OPENROUTER_API_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Resend
RESEND_API_KEY=

# Upstash Redis
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Inngest
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=

# Sentry
SENTRY_DSN=
```

---

## 11. BILLING & USER PLANS

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

### Rules
- LTD users NEVER touch the platform OpenRouter key
- Credits balance check is SKIPPED for LTD users
- BYOK key is stored encrypted in Supabase Vault
- If LTD user has no BYOK key → block AI features with prompt to add key