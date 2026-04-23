automation-strategies.md

PAGE: dashboard/automation/strategies/page.tsx

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

Generate AI Recommendation

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