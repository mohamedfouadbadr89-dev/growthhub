📄 team-management.md

## 🔒 SYSTEM ENFORCEMENT LAYER

AI_GATEWAY: REQUIRED
AI_SOURCE: API_GATEWAY_ONLY

RULES:
- ❌ NO direct AI calls from frontend
- ❌ NO AI generation on GET requests
- ❌ NO "if missing → generate"
- ✅ AI only triggered via POST endpoints
- ✅ ALL AI responses must be cached

CACHE:
- required for all AI outputs
- key: org_id + entity_id + type

RATE LIMIT:
- per user
- per org
- prevent duplicate execution within 60s

---

## 🧱 DATABASE SOURCE

DB_PROVIDER: SUPABASE_ONLY

RULES:
- ❌ NO local database
- ❌ NO prisma migrations
- ❌ NO mock data in production
- ✅ ALL tables must exist in Supabase
- ✅ ALL writes go through Supabase API / RPC

---

## 🔐 SECRETS MANAGEMENT

VAULT: SUPABASE_VAULT

USE:
- OpenRouter keys
- BYOK users
- external APIs

RULES:
- ❌ NEVER expose keys to frontend
- ❌ NEVER log secrets
- ✅ fetch at runtime only

---

## ⚡ AI EXECUTION RULE

- AI must NEVER run on page load
- AI must be triggered ONLY by user action
- AI must be cached after execution



PAGE: /settings/team

⸻

🧩 1. UI → Data Mapping

⸻

🔍 Search

* search_query

⸻

👥 Team Table

* user_id
* name
* email
* role (admin | manager | viewer)
* status (active | invited | pending)
* joined_date

⸻

⚡ Actions

* invite_member
* edit_role
* remove_member

⸻

📊 Stats Cards

* total_members
* admin_count
* pending_invites

⸻

📄 Pagination

* page
* per_page
* total

⸻

⸻

🧱 2. Data Shape

type TeamMember = {
id: string
name: string
email: string
role: "admin" | "manager" | "viewer"
status: "active" | "invited" | "pending"
joined_at?: string
}

type TeamPage = {
members: TeamMember[]

summary: {
total: number
admins: number
pending: number
}

search: string

pagination: {
page: number
per_page: number
total: number
}
}

3. API Contracts

POST /api/v1/team/approve

Body:

* action_id

RULES:

- admin only

## 🧾 AUDIT LOGGING

log all:

- role changes
- member removal
- invite actions
- approvals

RULE:

- logs immutable

GET /api/v1/team

Query:

* search
* page

⸻

POST /api/v1/team/invite

body:

* email
* role

⸻

PUT /api/v1/team/:id

body:

* role

⸻

DELETE /api/v1/team/:id

⸻

⸻

🗄️ 4. DB Schema

team_permissions

* id
* role
* permissions (jsonb)

audit_logs

* id
* org_id
* user_id
* action
* entity
* entity_id
* metadata (jsonb)
* created_at

team_members

* id
* org_id
* name
* email
* role
* status
* created_at

⸻

team_invites

* id
* email
* role
* status
* expires_at

⸻

⸻

⚙️ 5. Execution Logic

* fetch members
* filter + search
* update roles
* manage invites


## ⚡ PERFORMANCE

- cache team members
- invalidate on change
⸻
## 🔐 RBAC SYSTEM

ROLES:

- admin → full access
- manager → execute + edit
- viewer → read-only

RULES:

- all endpoints MUST check role
- no privilege escalation

## ⚠️ APPROVAL SYSTEM

REQUIRED FOR:

- high-risk actions
- automation activation
- budget changes

FLOW:

1. user triggers action
2. system checks role
3. if requires approval:
   → create approval request
   → wait admin approval
⸻

🧠 6. AI Layer

* detect role misconfiguration
* suggest least-privilege roles

⸻
## 🧠 AI LAYER (ADVISORY ONLY)

- role recommendations are suggestions only

RULES:

- NO auto role assignment
- MUST require manual confirmation
⸻

💳 7. Credits System

* NONE

⸻

🧠 8. AI Usage Classification

* role_recommendation → LOW

⸻

📊 9. Marketing Rules

* too many admins → risk
* inactive users → cleanup

⸻

🧾 10. Comments

* RBAC required
* org isolation
* audit logs


## 🧬 SCHEMA CONTROL
- schema.sql is source of truth
- no runtime creation

AUTH: CLERK
- all requests must include org_id


- NO auto AI
- NO fallback AI


## 🔒 SECURITY

- strict org isolation
- no cross-org access
- validate org_id on every request