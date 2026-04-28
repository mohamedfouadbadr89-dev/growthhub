## 🧠 AI BACKGROUND JOBS

PURPOSE:
- run AI outside user requests

JOBS:
- generate actions
- generate recommendations
- refresh insights
- detect anomalies

TRIGGERS:
- cron (every X hours)
- manual trigger

RULES:
- NO AI on GET
- NO AI per request
- ALL results cached

CACHE:
- key: org_id + entity_id + type
- TTL:
  insights → 24h
  recommendations → 12h

FLOW:
1. fetch data
2. run AI via OpenRouter
3. store result in DB/cache
4. reuse in UI

FAILSAFE:
- if AI fails → keep old data

## 🔗 SYSTEM INTEGRATION (CRITICAL)

AI jobs MUST feed:

- decision engine
- alerts engine
- actions engine

---

RULE:

- AI MUST NOT create final outputs directly for UI
- AI MUST create structured signals ONLY

FLOW:

AI → signals → decisions → actions → execution

## ⚠️ JOB IDEMPOTENCY

RULE:

- same job MUST NOT run twice for same org + type within window

KEY:

- org_id + job_type + time_window

---

IF already executed:
→ skip

## ⏱️ JOB PRIORITY

types:

- critical (alerts / anomalies) → near real-time
- standard (recommendations) → scheduled
- low (insights refresh) → batch

---

RULE:

- critical jobs MUST preempt others


## ⚡ EVENT-DRIVEN JOBS

TRIGGERS:

- decision_created
- alert_triggered
- campaign_updated

---

RULE:

- jobs MUST NOT rely on cron only
- MUST react to system events


