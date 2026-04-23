creatives-archive.md

PAGE: dashboard/creatives/archive/page.tsx

⸻

🧩 1. UI → Data Mapping

⸻

Creative List

* creative_id
* thumbnail
* platform
* format
* performance_score
* status

⸻

Filters

* platform
* format
* performance
* status

⸻

Actions

* reuse
* duplicate
* edit
* relaunch

⸻

⸻

🧱 2. Data Shape

type CreativeArchive = {
id: string
thumbnail: string

tags: {
platform: string
format: string
}

performance_score: number

status: "active" | "paused" | "archived"
}

⸻

🌐 3. API Contracts

GET /api/v1/creatives/archive

POST /api/v1/creatives/:id/reuse

POST /api/v1/creatives/:id/duplicate

⸻

⸻

🗄️ 4. DB Schema

creative_archive

* id
* org_id
* creative_id
* status
* performance_score
* created_at

⸻

⸻

⚙️ 5. Execution Logic

1. fetch archived creatives
2. filter + search
3. allow reuse / relaunch

⸻

⸻

🧠 6. AI Layer

* detect top reusable creatives
* identify evergreen creatives

⸻

⸻

💳 7. Credits System

* reuse → FREE

⸻

⸻

🧠 8. AI Usage Classification

* reuse_recommendation → LOW

⸻

⸻

📊 9. Marketing Rules

* reuse high performers
* archive low performers

⸻

⸻

🧾 10. Comments (FOR CLAUDE)

Use:

GET /api/v1/creatives/archive

Requirements:

* fast filtering
* search
* bulk actions