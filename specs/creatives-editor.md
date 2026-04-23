creatives-editor.md

PAGE: dashboard/creatives/editor/page.tsx

⸻

🧩 1. UI → Data Mapping

⸻

Editor Inputs

* headline
* description
* cta
* media_url

⸻

Canvas

* preview_state
* device_mode (mobile | tablet | desktop)
* zoom_level

⸻

Elements

* text_blocks[]
* images[]
* logos[]
* buttons[]

⸻

Right Panel (AI)

* suggestions[]
* predicted_metrics
    * ctr
    * engagement

⸻

Actions

* save
* publish
* export
* push_to_campaign

⸻

⸻

🧱 2. Data Shape

type CreativeDraft = {
id: string

content: {
headline: string
description: string
cta: string
}

media_url: string

elements: {
type: "text" | "image" | "logo" | "cta"
value: string
position?: { x: number; y: number }
}[]

preview: {
device: "mobile" | "tablet" | "desktop"
zoom: number
}
}

⸻

🌐 3. API Contracts

GET /api/v1/creatives/:id

PUT /api/v1/creatives/:id

POST /api/v1/creatives/:id/publish

POST /api/v1/creatives/:id/export

⸻

⸻

🗄️ 4. DB Schema

creative_drafts

* id
* org_id
* content (jsonb)
* media_url
* elements (jsonb)
* created_at
* updated_at

⸻

⸻

⚙️ 5. Execution Logic

1. load creative
2. update in real-time
3. apply AI suggestions
4. preview update
5. save draft / publish

⸻

⸻

🧠 6. AI Layer

* copy optimization
* CTA improvement
* layout suggestion
* performance prediction

⸻

⸻

💳 7. Credits System

* AI suggestion → LOW
* optimization → MEDIUM

⸻

⸻

🧠 8. AI Usage Classification

* copy_improvement → LOW
* performance_prediction → MEDIUM

⸻

⸻

📊 9. Marketing Rules

* strong hook in first 3 sec
* CTA clarity mandatory
* mobile-first layout

⸻

⸻

🧾 10. Comments (FOR CLAUDE)

Use:

GET /api/v1/creatives/:id

Requirements:

* real-time preview
* drag & drop elements
* device switch

⸻

📄 creatives-brand-kit.md

PAGE: dashboard/creatives/brand-kit/page.tsx

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