
automation-strategies.md

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

PAGE: app/automation/strategies/page.tsx

⸻

🧩 1. UI → Data Mapping

AI Recommendation (Hero Section)

* recommendation_id
* title
* description
* estimated_savings
* confidence_score
* actions:
    * activate
    * review

⸻

Strategy Categories

* category_id
* name

⸻

Strategies Grid

* id
* name
* description
* category
* trigger_conditions[]
* actions[]
* estimated_impact
* difficulty
* platforms[]

⸻

Custom Strategy CTA

* create_new_strategy

⸻

⸻

🧱 2. Data Shape

type AutomationStrategy = {
  id: string
  name: string
  description: string

  category: "budget" | "scaling" | "creative" | "reporting"

  trigger_conditions: {
    metric: string
    operator: ">" | "<" | "="
    value: number
    timeframe?: string
  }[]

  actions: {
    type: string
    value?: number
    target?: string
  }[]

  estimated_impact: {
    revenue?: number
    savings?: number
    roas_lift?: number
  }

  difficulty: "low" | "medium" | "high"

  platforms: ("meta" | "google" | "tiktok")[]

  created_at: string
}

🌐 3. API Contracts

Get Strategies

GET /api/v1/automation/strategies

Query:

* category
* platform

⸻

Activate Strategy

POST /api/v1/automation/strategies/:id/activate

## 🧠 Recommendation Rules

- recommendations are advisory only
- must convert to workflow before execution
- NO direct execution

POST /api/v1/automation/strategies/recommendation


4. DB Schema

⸻

strategies

* id
* org_id
* name
* description
* category
* config (jsonb)
* difficulty
* created_at

⸻

strategy_recommendations

* id
* org_id
* strategy_id
* estimated_impact
* confidence_score
* created_at

⸻

⸻

⚙️ 5. Execution Logic

⸻

Strategy → Workflow Conversion

strategy → automation_workflow


Example:

Stop Loss Strategy

Trigger: spend > 50  
Condition: CPA > 12  
Action: pause ad set  

Flow:

1. user clicks "Use Strategy"
2. system converts to workflow
3. opens builder (optional edit)
4. user activates

⸻

⸻

🧠 6. AI Layer

⸻

## 🧠 AI LAYER (CONTROLLED)

- AI suggests strategies only

RULES:

- NO execution
- NO auto-activation

Recommendation Engine

Input:

* recent performance
* wasted spend
* platform mix

⸻

Output:

* best strategy
* expected savings
* confidence

⸻

⸻

💳 7. Credits System

* recommendation generation → LOW cost
* activating strategy → FREE

⸻

⸻

🧠 8. AI Usage Classification

* strategy_recommendation → LOW
* automation_generate → MEDIUM

⸻

⸻

📊 9. Marketing Rules

⸻

Stop Loss

if spend > threshold AND CPA high → pause

Scaling

if roas stable → increase budget

Creative Rotation

if frequency high → rotate creatives

🧾 10. Comments (FOR CLAUDE)

⸻

Replace static UI with:

GET /api/v1/automation/strategies

Requirements:

* filter by category
* filter by platform
* quick activate
* preview logic

⸻

Important:

* strategies are templates
* NOT executed directly
* must convert to workflow


## 🧬 SCHEMA CONTROL
- schema.sql is source of truth
- no runtime creation


AUTH: CLERK
- all requests must include org_id


- NO auto AI
- NO fallback AI


## 🔗 DECISION INTEGRATION

strategies MUST NOT run blindly

SOURCE:

- decision engine
- signals engine

---

RULE:

strategy trigger MUST come from:

- decisions
- alerts
- signals

NOT raw metrics only

## 🔁 STRATEGY LIFECYCLE

status:

- draft
- active
- paused
- archived

---

RULES:

- only active strategies can run
- paused = no triggers
- archived = read-only

## ⚠️ STRATEGY VERSIONING

- every strategy MUST have version

FIELDS:

- version_number
- updated_at
- change_log

---

RULE:

- running workflows MUST use frozen version
- edits create new version

## 🛑 STRATEGY SAFETY RULES

- strategy MUST pass validation BEFORE activation

VALIDATION:

- no conflicting actions
- no high-risk loops
- budget limits respected

---

BLOCK:

- if risk score > threshold

## ⚠️ LOOP PROTECTION

- strategy MUST NOT trigger repeatedly within short window

RULE:

- cooldown period required

EXAMPLE:

- same action cannot run twice within 30 min

## 🔴 REALTIME STRATEGY ENGINE

SOURCE: SUPABASE_REALTIME

CHANNEL:

strategy_triggers:{org_id}

EVENTS:

- decision_created
- alert_triggered
- metric_update

---

RULE:

- strategies MUST react to events
- NOT polling only

## 🧠 STRATEGY PERFORMANCE SCORE

score =

0.4 * impact +
0.3 * success_rate +
0.3 * consistency

---

USE:

- rank strategies
- recommend best ones

## ⚠️ ACTIVATION FLOW

1. validate strategy
2. convert → workflow
3. assign safeguards
4. activate

---

RULE:

NO direct activation without validation

## 🔒 EXECUTION GUARD

before any strategy runs:

- validate permissions
- validate risk
- validate constraints

BLOCK IF:

- high risk
- insufficient permissions


## ⚠️ FAILURE HANDLING

on failure:

- log error
- retry (max 3)
- fallback to safe state

## 🔁 ROLLBACK

IF action causes negative impact:

- revert last action
- notify user

## 📊 STRATEGY MONITORING

track:

- execution success rate
- impact delta
- error rate

## ⏱ COOLDOWN ENFORCEMENT

- enforce cooldown per strategy + entity

key:

org_id + strategy_id + entity_id

## ⚠️ MANUAL OVERRIDE

admin can:

- override blocked strategy
- approve high-risk execution

## 🧾 EXECUTION LOGGING

log:

- trigger source
- decision source
- action executed
- result


