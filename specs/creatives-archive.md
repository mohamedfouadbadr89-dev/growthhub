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