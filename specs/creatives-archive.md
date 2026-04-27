PAGE: app/creatives/archive/page.tsx

---

## 🧩 1. UI → Data Mapping

### 🎯 Creative Cards (Grid)

Each card MUST include:

- id
- name
- thumbnail (gradient / image)
- platform (Meta / Google / TikTok)
- format (Image / Video / UGC)
- performance_score (0–100)
- performance_tier ("high" | "medium" | "low")
- status ("active" | "paused" | "archived")

---

### 📊 Performance Display

- score bar (visual)
- tier label:
  - High → green
  - Medium → yellow
  - Low → red

---

### 📈 Metrics (UI only)

- CTR (mock)
- ROAS (mock)

---

## 🔍 2. Filters (MATCH UI)

- search (by name)
- platform
- format
- status
- performance_tier

---

## ⚡ 3. Bulk Actions (UI STATE)

VISIBLE ONLY IF selection > 0

- reuse_selected
- duplicate_selected
- relaunch_selected

UI RULES:

- show selected count
- show loading state (simulated)
- support partial selection (no blocking UI)

---

## 🎬 4. Card Actions

Each card MUST include:

- reuse
- duplicate
- edit
- relaunch

---

### 🎯 ACTION PRIORITY RULES

- IF status = archived  
  → highlight "Reuse" as primary CTA

- IF performance = low  
  → show warning badge (red)

---

## ⚠️ 5. Relaunch Safety (UI Only)

Display warning badge IF:

- performance = low
- OR status = archived

(NO blocking in frontend)

---

## 🧱 6. Data Shape (UPDATED)

```ts
type CreativeArchive = {
  id: string
  name: string
  thumbnail: string

  tags: {
    platform: string
    format: string
  }

  performance_score: number
  performance_tier: "high" | "medium" | "low"

  status: "active" | "paused" | "archived"
}

7. API Contracts (FUTURE READY)

GET /api/v1/creatives/archive
→ returns CreativeArchive[]

POST /api/v1/creatives/:id/reuse
POST /api/v1/creatives/:id/duplicate

POST /api/v1/creatives/bulk/reuse

RULES:

* validate each creative
* support partial success
* no UI blocking

⸻

⚙️ 8. Execution Logic (FRONT SIMULATION)

* filter locally
* search locally
* simulate actions (1–1.5s delay)
* update UI state only

⸻

📊 9. Performance Logic (UI SIDE)

performance_tier derived:

* score ≥ 80 → high
* 50–79 → medium
* < 50 → low

⸻

🎯 10. UX STATES

Loading (future)

* skeleton cards

Empty State

* “No creatives found”
* show “Clear Filters” CTA

Selection Mode

* checkbox per card
* hover reveal checkbox

⸻

⚡ 11. Realtime (FUTURE HOOK)

CHANNEL:
creatives_archive:{org_id}

EVENTS:

* creative_archived
* creative_reused
* performance_updated

UI:

* optimistic update ready
* fallback → refetch

⸻

🧠 12. AI Layer (STRICT)

* NO AI in frontend
* NO AI on GET
* AI only affects:
    * performance_score (precomputed)
    * reuse suggestions (future)

⸻

💳 13. Credits

* reuse → FREE (UI only placeholder)

⸻

🧬 14. Schema Control

* schema.sql is source of truth
* no runtime schema creation

⸻

🔐 AUTH

* org_id required on all requests (future)

⸻

🚫 HARD RULES

* NO API calls in current implementation
* NO AI execution
* NO backend dependency
* UI must be fully functional with mock data
* 
* ## 🎯 SELECTION STATE

- MUST support multi-select via checkbox
- selection state MUST persist across filters (optional future)
- MUST show selection count
- MUST allow clear selection

UI RULES:

- checkbox visible on hover OR selected
- selected card MUST have visual highlight
- bulk bar MUST appear ONLY when selection > 0

## ⚡ ACTION PRIORITY

PRIMARY ACTION:

- IF status = archived → highlight "Reuse"

SECONDARY:

- duplicate
- edit

TERTIARY:

- relaunch (only if valid)

RULE:

- only ONE primary CTA per card
- primary must be visually dominant


## ⚠️ RELAUNCH VALIDATION (EXTENDED)

CHECK:

- creative must NOT be archived long ago (recency threshold)
- performance trend must NOT be declining
- must match campaign objective

OUTPUT:

- valid → allow relaunch
- risky → show warning
- invalid → block action


## 📊 PERFORMANCE UI RULES

SCORE → VISUAL:

- 75–100 → GREEN (High)
- 50–74 → YELLOW (Medium)
- <50 → RED (Low)

RULES:

- MUST show score as progress bar
- MUST show label (High / Medium / Low)
- LOW performance MUST trigger warning badge

## 🧩 CREATIVE CARD STRUCTURE

EACH CARD MUST INCLUDE:

- thumbnail (visual)
- format badge (image/video/ugc)
- platform tag
- status tag
- performance score + bar
- CTR + ROAS
- actions (reuse / duplicate / edit / relaunch)

OPTIONAL:

- warning badge (low performance)
- selection checkbox

## 🔄 STATE MANAGEMENT

UI STATE:

- filters state
- selection state
- loading state (actions)
- empty state

RULES:

- filtering MUST be instant (client-side for now)
- actions MUST show loading feedback
- MUST prevent double action click

## ⚡ ACTION FEEDBACK

ON ACTION:

- show loading state (button level)
- show success feedback (temporary)
- revert button to normal

RULE:

- feedback MUST be instant (optimistic UI later)

## 🚫 FRONTEND HARD RULES

- NO API calls in current implementation
- NO backend dependency
- MUST use mock data
- MUST be fully interactive

## 🔗 FUTURE INTEGRATION

CREATIVE → CAMPAIGN FLOW:

- reuse → push to campaign builder
- relaunch → create new campaign variant
- duplicate → create editable version

NOTE:

- archive is NOT isolated
- it feeds execution layer


## 🧠 INTELLIGENCE LAYER

SYSTEM SHOULD:

- highlight top reusable creatives
- flag declining creatives
- detect evergreen creatives

RULE:

- insights MUST be precomputed (no AI on load)


## 🔄 CREATIVE LIFECYCLE

active → paused → archived

RULES:

- archived creatives = reusable pool
- active creatives = in execution
- paused = testing / optimization

GOAL:

- archive = memory layer for performance


## 🔗 FRONTEND ↔ BACKEND BRIDGE

CURRENT MODE:

- mock data (local state)
- no API calls

FUTURE MODE:

- replace mock with apiClient

RULES:

- UI must NOT change when backend is connected
- data shape MUST match API response exactly
- actions MUST map 1:1 with API endpoints

MAPPING:

- reuse → POST /creatives/:id/reuse
- duplicate → POST /creatives/:id/duplicate
- relaunch → POST /creatives/:id/relaunch (future)

IMPORTANT:

- DO NOT refactor UI when backend is added
- ONLY replace data source layer


## 🧱 DATA ADAPTER LAYER

PURPOSE:

- isolate UI from backend shape changes

RULE:

- UI consumes normalized shape only

EXAMPLE:

API → adapter → UI

adapter responsibilities:

- map API response → CreativeArchive type
- derive performance_tier
- sanitize missing fields

RESULT:

- backend can change
- UI remains stable

## ⚡ ACTION HANDLER STRUCTURE

CURRENT:

- simulateAction()

FUTURE:

- actionHandler(actionType, payload)

FLOW:

1. trigger UI loading
2. call API
3. optimistic update (optional)
4. handle success / error
5. update state

RULE:

- all actions MUST go through unified handler


## ⚠️ ERROR HANDLING (FUTURE)

- failed action → show toast
- failed fetch → show retry state

RULE:

- UI MUST NOT break on API failure
- fallback to last known state

## 📦 SCALING STRATEGY

IF creatives > 50:

- enable pagination OR infinite scroll

RULE:

- do NOT render large lists fully
- optimize grid performance