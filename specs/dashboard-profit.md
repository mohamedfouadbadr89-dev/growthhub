📄 dashboard-profit.md

PAGE: dashboard/profit/page.tsx

⸻

🧩 1. UI → Data Mapping

Profit Overview:

* total_revenue
* total_cost
* total_profit
* profit_margin (%)

⸻

Profit Breakdown:

* product_cost
* ad_spend
* operational_cost
* other_cost

⸻

Profit Trends:

* date
* revenue
* cost
* profit

⸻

Unit Economics:

* cpa (cost per acquisition)
* cac (customer acquisition cost)
* aov
* ltv

⸻

Top Profitable Channels:

* channel_name
* revenue
* cost
* profit
* profit_margin

⸻

Filters:

* date_range
* channel
* product

⸻

🧱 2. Data Shape (Normalized)

type ProfitOverview = {
  revenue: number
  cost: number
  profit: number
  margin: number
}

type ProfitTrend = {
  date: string
  revenue: number
  cost: number
  profit: number
}

type UnitEconomics = {
  cpa: number
  cac: number
  aov: number
  ltv: number
}

type ChannelProfit = {
  channel: string
  revenue: number
  cost: number
  profit: number
  margin: number
}

type ProfitResponse = {
  overview: ProfitOverview
  trends: ProfitTrend[]
  unit_economics: UnitEconomics
  channels: ChannelProfit[]
}

⸻

🌐 3. API Contracts

GET /api/v1/dashboard/profit

Query:

* date_range
* channel
* product

Response:
ProfitResponse

⸻

🗄️ 4. DB Schema (Initial)

profit_daily

* id
* org_id
* date
* revenue
* cost
* profit
* margin

⸻

cost_breakdown

* id
* org_id
* date
* ad_spend
* product_cost
* operational_cost
* other_cost

⸻

channel_profit

* id
* org_id
* channel
* revenue
* cost
* profit
* margin
* date

⸻

⚙️ 5. Execution Logic

Profit:

profit = revenue - cost

⸻

Profit Margin:

margin = (profit / revenue) * 100

⸻

CAC:

cac = total_ad_spend / total_customers

⸻

CPA:

cpa = ad_spend / conversions

⸻

LTV:

ltv = total_revenue / total_customers

⸻

AOV:

aov = total_revenue / total_orders

⸻

💳 6. Credits System

No credits used

⸻

🧠 7. AI Usage Classification

Future:

* profit prediction
* cost anomaly detection
* margin optimization recommendations

⸻

📊 8. Marketing Rules (Not AI)

If:

* profit margin dropping

Then:

* reduce spend OR increase pricing

⸻

If:

* CAC > LTV

Then:

* stop scaling immediately

⸻

If:

* channel highly profitable

Then:

* increase budget allocation

⸻

🧾 9. Comments (FOR CLAUDE)

Replace static UI with:

GET /api/v1/dashboard/profit

⸻

Important:

* all calculations in backend
* frontend only displays

⸻

Security:

* filter by org_id

⸻

Performance:

* cache profit aggregates

⸻

Future:

feeds:

* finance dashboard
* decision engine

⸻

✅ DONE