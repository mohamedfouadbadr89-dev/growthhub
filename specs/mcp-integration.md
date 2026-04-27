## 🔌 MCP INTEGRATION

PURPOSE:
- expose system tools to AI via MCP

---

## 🌐 MCP SERVER ENDPOINTS

GET /api/v1/mcp/tools
POST /api/v1/mcp/execute

---

## 🧠 TOOL SCHEMA

example:

{
  "name": "get_campaigns",
  "description": "Fetch campaign performance",
  "input_schema": {
    "type": "object",
    "properties": {
      "date_range": { "type": "string" }
    }
  }
}

---

## 🔄 EXECUTION FLOW

Claude → MCP Client → MCP Server → API → DB → Response

---

## 🔐 SECURITY

- allowlist tools only
- validate input
- no dynamic execution
- rate limit per tool

---

## ⚠️ IMPORTANT

- MCP = TOOL ACCESS ONLY
- NOT execution engine