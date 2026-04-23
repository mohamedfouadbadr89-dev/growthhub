creatives-brand-kit.md

PAGE: creatives/brand-kit/page.tsx

⸻

🧩 1. UI → Data Mapping

⸻

Brand Assets

* colors[]
* fonts[]
* logos[]

⸻

Rules

* allowed_colors
* allowed_fonts
* restrictions

⸻

State

* locked (boolean)

⸻

⸻

🧱 2. Data Shape

type BrandKit = {
id: string
org_id: string

colors: string[]
fonts: string[]
logos: string[]

rules: {
enforce_colors: boolean
enforce_fonts: boolean
}

locked: boolean
}

⸻

🌐 3. API Contracts

GET /api/v1/brand-kit

PUT /api/v1/brand-kit

⸻

⸻

🗄️ 4. DB Schema

brand_kits

* id
* org_id
* colors (jsonb)
* fonts (jsonb)
* logos (jsonb)
* rules (jsonb)
* locked
* updated_at

⸻

⸻

⚙️ 5. Execution Logic

1. load brand kit
2. enforce rules on editor
3. block invalid styles

⸻

⸻

🧠 6. AI Layer

* auto-apply brand styles
* reject off-brand creatives

⸻

⸻

💳 7. Credits System

* none

⸻

⸻

🧠 8. AI Usage Classification

* brand_enforcement → LOW

⸻

⸻

📊 9. Marketing Rules

* consistency across creatives
* brand recognition priority

⸻

⸻

🧾 10. Comments (FOR CLAUDE)

Apply brand rules inside editor automatically