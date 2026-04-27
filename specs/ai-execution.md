## ⚙️ AI EXECUTION ENGINE

ENDPOINTS:

POST /api/v1/ai/execute
POST /api/v1/mcp/execute
GET /api/v1/mcp/tools

---

## EXECUTION LOGIC

if provider = claude:
  → MCP

if provider = openai:
  → function calling

if provider = open_source:
  → agent runtime

---

## RULES:

- NO AI on GET
- MUST use cache
- MUST validate org_id


## 🎯 DASHBOARD MODE

IF prompt contains:

- dashboard
- performance
- report

THEN:

- switch to dashboard_generator mode
- return widgets instead of text