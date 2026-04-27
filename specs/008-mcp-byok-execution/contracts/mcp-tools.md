# MCP Tool Schema Contracts

**Implementation file**: `backend/src/services/ai/mcp-tools.ts`

---

## Tool: get_campaigns

```json
{
  "name": "get_campaigns",
  "description": "Fetch the org's active campaigns with their current performance metrics (ROAS, spend, revenue, status).",
  "input_schema": {
    "type": "object",
    "properties": {
      "status": {
        "type": "string",
        "enum": ["active", "paused", "learning", "all"],
        "description": "Filter by campaign status. Default: 'all'."
      },
      "limit": {
        "type": "integer",
        "minimum": 1,
        "maximum": 50,
        "description": "Maximum number of campaigns to return. Default: 10."
      }
    },
    "required": []
  }
}
```

**Handler behaviour**: Queries `campaigns` table filtered by `org_id`. Returns `id`, `name`, `status`, `platform`, `budget`, `spend`, `roas` fields only.

---

## Tool: get_creatives

```json
{
  "name": "get_creatives",
  "description": "Fetch the org's generated creatives including their performance scores and status.",
  "input_schema": {
    "type": "object",
    "properties": {
      "campaign_id": {
        "type": "string",
        "description": "Filter creatives by campaign ID. Optional."
      },
      "limit": {
        "type": "integer",
        "minimum": 1,
        "maximum": 50,
        "description": "Maximum number of creatives to return. Default: 10."
      }
    },
    "required": []
  }
}
```

**Handler behaviour**: Queries `creatives` table filtered by `org_id`. Returns `id`, `headline`, `body`, `cta`, `score`, `status`, `campaign_id`.

---

## Tool: get_actions

```json
{
  "name": "get_actions",
  "description": "Fetch available executable actions from the actions library, optionally filtered by platform or action type.",
  "input_schema": {
    "type": "object",
    "properties": {
      "platform": {
        "type": "string",
        "enum": ["meta", "google", "tiktok", "all"],
        "description": "Filter by ad platform. Default: 'all'."
      },
      "action_type": {
        "type": "string",
        "description": "Filter by action type (e.g., 'pause_campaign', 'increase_budget'). Optional."
      }
    },
    "required": []
  }
}
```

**Handler behaviour**: Queries `actions_library` table filtered by `org_id`. Returns `id`, `name`, `platform`, `action_type`, `description`.

---

## Common Handler Contract

All tool handlers implement this signature:

```typescript
type ToolHandler = (
  params: Record<string, unknown>,
  orgId: string
) => Promise<unknown>
```

All handlers:
- MUST scope queries to `orgId`
- MUST return an empty array (`[]`) rather than an error if no data found
- MUST NOT return sensitive fields (vault IDs, raw keys, internal UUIDs not needed by AI)
- MUST resolve within 5 seconds or throw a timeout error
