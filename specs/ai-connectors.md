## 🤖 AI CONNECTORS LAYER

PURPOSE:
- unify all AI providers (Claude / OpenAI / Open-source)
- enable MCP + function calling hybrid

---

## 🔌 PROVIDERS

providers:

- claude (MCP native)
- openai (function calling)
- openrouter (multi-model)
- open_source (custom agent runtime)

---

## 🔑 AUTH MODE

AUTH_MODE: BYOK_ONLY

RULES:
- user MUST provide API key
- NO platform credits usage
- keys stored in Supabase Vault
- NEVER exposed to frontend

SUPPORTED KEYS:

- anthropic_key
- openai_key
- openrouter_key

---

## ⚙️ EXECUTION ENGINE

IF provider = claude
→ use MCP server

IF provider = openai
→ convert tools → function calling

IF provider = open_source
→ agent runtime

---

## 🧠 TOOL REGISTRY (UNIFIED)

ALL tools must follow:

{
  name: string
  description: string
  input_schema: object
}

---

## 🔄 EXECUTION FLOW

User → AI → Tool Call → API → DB → Response → AI → UI

---

## ⚠️ RULES

- NO AI execution on GET
- AI triggered ONLY via POST
- ALL responses cached
- rate limit per org + user