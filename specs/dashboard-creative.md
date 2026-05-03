
📄 dashboard-creative.md


## 🔒 SYSTEM ENFORCEMENT LAYER

AI_GATEWAY: REQUIRED
AI_SOURCE: API_GATEWAY_ONLY

RULES:
- ❌ NO direct AI calls from frontend
- ❌ NO AI generation on GET requests
- ❌ NO "if missing → generate"
- ✅ AI only triggered via POST endpoints
- ✅ ALL AI responses must be cached

CACHE:
- required for all AI outputs
- key: org_id + entity_id + type

RATE LIMIT:
- per user
- per org
- prevent duplicate execution within 60s

---

## 🧱 DATABASE SOURCE

DB_PROVIDER: SUPABASE_ONLY

RULES:
- ❌ NO local database
- ❌ NO prisma migrations
- ❌ NO mock data in production
- ✅ ALL tables must exist in Supabase
- ✅ ALL writes go through Supabase API / RPC

---

## 🔐 SECRETS MANAGEMENT

VAULT: SUPABASE_VAULT

USE:
- OpenRouter keys
- BYOK users
- external APIs

RULES:
- ❌ NEVER expose keys to frontend
- ❌ NEVER log secrets
- ✅ fetch at runtime only

---

## ⚡ AI EXECUTION RULE

- AI must NEVER run on page load
- AI must be triggered ONLY by user action
- AI must be cached after execution

PAGE: dashboard/creative/page.tsx

⸻

🧩 1. UI → Data Mapping

Creative Performance Cards:

* creative_id
* creative_name
* platform (meta / tiktok / google)
* thumbnail_url
* spend
* revenue
* roas
* ctr
* hook_rate
* thumb_stop_rate
* trend_percentage

⸻

Top Creatives Section:

* top_creatives[] (sorted by performance)

⸻

Creative Breakdown Table:

* creative_name
* platform
* impressions
* clicks
* ctr
* conversions
* revenue
* roas
* status

⸻

Filters:

* date_range
* platform
* campaign_id

⸻

🧱 2. Data Shape (Normalized)

type Creative = {
  id: string
  name: string
  platform: "meta" | "tiktok" | "google"
  thumbnail_url: string

  metrics: {
    spend: number
    revenue: number
    roas: number
    ctr: number
    hook_rate: number
    thumb_stop_rate: number
    trend: number
  }

  status: "winning" | "stable" | "fatigue" | "losing"
}

type CreativeResponse = {
  creatives: Creative[]

  top_creatives: Creative[]

  summary: {
    total_spend: number
    total_revenue: number
    avg_roas: number
  }
}

⸻

🌐 3. API Contracts

GET /api/v1/dashboard/creatives

Query:

* date_range
* platform
* campaign_id

Response:
CreativeResponse

⸻

GET /api/v1/dashboard/creatives/:id

Purpose:

* detailed creative view

⸻

🗄️ 4. DB Schema (Initial)

creatives

* id
* org_id
* name
* platform
* thumbnail_url
* created_at

⸻

creative_metrics

* id
* org_id
* creative_id
* date
* impressions
* clicks
* spend
* revenue
* conversions
* created_at

⸻

creative_scores

* id
* org_id
* creative_id
* hook_rate
* thumb_stop_rate
* ctr
* roas
* trend
* score
* created_at

⸻

⚙️ 5. Execution Logic

Metrics Engine:

ctr = clicks / impressions  
roas = revenue / spend

⸻

Hook Rate:

* video watch first 3 seconds / impressions

⸻

Thumb Stop Rate:

* scroll stop events / impressions

⸻

Creative Score:

score = weighted formula:

0.4 * roas  
+ 0.2 * ctr  
+ 0.2 * hook_rate  
+ 0.2 * thumb_stop_rate

⸻

Status Logic:

if roas > 3 AND ctr high → winning  
if roas stable → stable  
if ctr dropping → fatigue  
if roas < 1.5 → losing

⸻

Trend:

trend = performance vs previous period

⸻

💳 6. Credits System

No credits used

⸻

🧠 7. AI Usage Classification

None

This page is analytics only

⸻

📊 8. Marketing Rules (Not AI)

Winning creatives:

* scale budget
* duplicate

⸻

Fatigue creatives:

* refresh hook
* test new angle

⸻

Losing creatives:

* pause immediately

⸻

🧾 9. Comments (FOR CLAUDE)

Replace static UI with:

GET /api/v1/dashboard/creatives

⸻

Requirements:

* loading state
* error state
* empty state

⸻

Important:

* do not calculate metrics in frontend
* backend handles scoring

⸻

Security:

* every query must include org_id
* no direct DB access from frontend

⸻

Performance:

* cache top creatives
* aggregate daily metrics

⸻

Future Integration:

feeds:

* creative generation AI
* decision engine

⸻

## 🧠 AI Layer

NONE

RULES:
- strictly no AI
- backend scoring only


## 🧬 SCHEMA CONTROL
- schema.sql is source of truth
- no runtime creation

AUTH: CLERK
- all requests must include org_id


- NO auto AI
- NO fallback AI


## 🔴 REALTIME STRATEGY

SOURCE: SUPABASE_REALTIME

MODE: HIGH-FREQUENCY (CREATIVE CRITICAL)

---

1. BROADCAST

CHANNEL:

- creative_metrics:{org_id}

EVENTS:

creative_update:
- creative_id
- spend
- revenue
- roas
- ctr
- hook_rate
- thumb_stop_rate

status_update:
- creative_id
- status (winning / fatigue / losing)

top_creatives_update:
- top_creatives[]

---

RULES:

- top creatives MUST update instantly
- status MUST reflect latest performance
- scoring MUST NOT happen in frontend

---

2. POSTGRES_CHANGES

TABLES:

- creative_metrics (INSERT)
- creative_scores (UPDATE)

---

3. FALLBACK

- refetch GET /api/v1/dashboard/creatives every 30s

---

SECURITY:

- org_id scoped channels

## ⚠️ SCORING RULE

- ALL creative scoring MUST be backend-only
- frontend MUST NOT derive status
- status MUST be delivered from API

REASON:

- consistency with decision engine
- avoid mismatch across system


✅ DONE