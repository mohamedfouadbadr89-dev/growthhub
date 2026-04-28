## ⚙️ CENTRAL EXECUTION ENGINE

PURPOSE:
- single entry point for ALL executions

RULES:
- NO execution from pages
- NO execution from AI
- ONLY via /api/v1/execution

FLOW:
1. receive action request
2. validate:
   - org_id
   - permissions
   - risk level
   - platform constraints
3. decision:
   - approved → execute
   - blocked → log
   - pending → require approval
4. execute via provider API
5. log result

RISK CONTROL:
- HIGH → block or require override
- MEDIUM → require confirmation
- LOW → allow

LOGGING:
- ALL executions logged
- include risk + validation + result

DEPENDENCIES:
- actions
- campaigns
- automations

IMPORTANT:
- this is the ONLY execution authority

## 🧬 SCHEMA CONTROL
- schema.sql is source of truth
- no runtime creation

AUTH: CLERK
- all requests must include org_id


- NO auto AI
- NO fallback AI
