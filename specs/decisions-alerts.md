decisions-alerts.md (FIXED)

🔒 SYSTEM ENFORCEMENT LAYER

AI_GATEWAY: REQUIRED
AI_SOURCE: API_GATEWAY_ONLY

RULES:

* ❌ NO direct AI calls from frontend
* ❌ NO AI generation on GET requests
* ❌ NO “if missing → generate”
* ✅ AI only triggered via POST endpoints
* ✅ ALL AI responses must be cached

CACHE:

* required for all AI outputs
* key: org_id + entity_id + type

RATE LIMIT:

* per user
* per org
* prevent duplicate execution within 60s

⸻

⚡ AI EXECUTION RULE

* AI must NEVER run on page load
* AI must be triggered ONLY by user action
* AI must be cached after execution

⸻

📄 PAGE

decisions/alerts/page.tsx

⸻

🌐 3. API Contracts (FIXED)

GET /api/v1/decisions/alerts

Query:

* severity
* platform
* mode

Response:
AlertsResponse

⸻

POST /api/v1/decisions/alerts/:id/execute

Purpose:

* execute suggested action

⸻

POST /api/v1/decisions/alerts/:id/ignore

Purpose:

* ignore alert

⸻

🧾 9. Comments (FOR CLAUDE) (FIXED)

Replace static UI with:

GET /api/v1/decisions/alerts

⸻

🔴 REALTIME STRATEGY

FALLBACK:

* GET /api/v1/decisions/alerts every 15s

⸻

⚠️ NOTES (IMPORTANT FIX)

* route is now fully aligned:
    * page → decisions/alerts
    * api → /api/v1/decisions/alerts
* no mismatch
* Claude Code will not hallucinate endpoints
* consistent with system architecture

⸻

✅ DONE