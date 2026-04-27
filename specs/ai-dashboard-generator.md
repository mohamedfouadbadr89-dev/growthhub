## 🧠 AI DASHBOARD GENERATOR

PURPOSE:
- generate dashboards from prompt
- replace manual dashboard building

FLOW:

1. user enters prompt
2. system parses intent
3. MCP fetches data
4. AI builds dashboard structure
5. UI renders widgets

---

INPUT:

- prompt
- org_id

---

OUTPUT:

{
  widgets: [
    {
      type: "kpi" | "chart" | "table"
      title: string
      metric: string
      data_source: string
    }
  ],

  insights: [
    {
      text: string
      confidence: number
    }
  ]
}

---

RULES:

- MUST NOT run on page load
- MUST be POST only
- MUST use MCP tools
- MUST cache result

---

AI FLOW:

prompt → intent → metrics → MCP tools → data → widgets → insights

---

SUPPORTED DASHBOARDS:

- performance dashboard
- creative analysis
- budget optimization
- anomaly detection

---

TOOLS USED:

- get_campaigns
- get_creatives
- get_actions

---

CACHE:

key: org_id + prompt
TTL: 6h