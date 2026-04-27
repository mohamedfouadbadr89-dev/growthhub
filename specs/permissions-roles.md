

📄 permissions-roles.md

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



PAGE: app/settings/page.tsx

⸻

🧩 1. UI → Data Mapping

⸻

📊 Summary Cards

* total_roles
* custom_roles
* admin_users
* roles_growth

⸻

👥 Roles Table

* role_id
* name
* description
* users_count
* type (system | custom)
* is_locked
* created_at

⸻

⚡ Role Actions

* edit_role
* duplicate_role
* delete_role

⸻

🔍 Search

* search_query

⸻

🧠 AI Actions

* suggest_permissions

⸻

🔐 Permissions Matrix

Selected Role

* role_id

Modules

* module_name
* permissions:
    * view
    * edit
    * execute
    * approve

⸻

💾 Matrix Actions

* save_permissions
* discard_changes

⸻

🧱 2. Data Shape

type Role = {
id: string
name: string
description: string
type: "system" | "custom"
is_locked: boolean
users_count: number
created_at: string
}

type Permission = {
view: boolean
edit: boolean
execute: boolean
approve: boolean
}

type RolePermissions = {
role_id: string
modules: {
module: string
permissions: Permission
}[]
}

type PermissionsPage = {
summary: {
total_roles: number
custom_roles: number
admin_users: number
roles_growth: number
}

roles: Role[]

selected_role: RolePermissions
}

⸻

🌐 3. API Contracts

⚠️ IMPORTANT: Clerk handles authentication only

Get Roles (Internal)

GET /api/v1/internal/roles

⸻

Create Role

POST /api/v1/internal/roles

⸻

Update Role

PUT /api/v1/internal/roles/:id

⸻

Delete Role

DELETE /api/v1/internal/roles/:id

⸻

Get Role Permissions

GET /api/v1/internal/roles/:id/permissions

⸻

Update Permissions

PUT /api/v1/internal/roles/:id/permissions

⸻

Sync Clerk User Role

POST /api/v1/internal/users/:clerk_user_id/role

⸻

🗄️ 4. DB Schema

roles

* id
* org_id
* name
* description
* type
* is_locked
* created_at

⸻

role_permissions

* id
* role_id
* module
* can_view
* can_edit
* can_execute
* can_approve

⸻

user_roles

* id
* clerk_user_id
* role_id

⸻

⚙️ 5. Execution Logic

1. user logs in via Clerk
2. fetch clerk_user_id
3. map → user_roles table
4. load role + permissions
5. inject permissions into app context

⸻

Permission Check Example

if (!permissions.campaigns.edit) {
throw new Error("Unauthorized")
}

⸻

Rules:

* Clerk handles identity only
* roles & permissions stored internally
* every request must validate permissions

⸻

🧠 6. AI Layer

* suggest role templates
* detect over-permission risks
* recommend least-privilege access

⸻

## 🧠 AI LAYER (STRICT)

- suggest roles only

RULES:

- NO auto permission change
- must require admin approval


💳 7. Credits System

* ai_suggestions → LOW

⸻

🧠 8. AI Usage Classification

* permission_suggestion → LOW
* risk_detection → MEDIUM

⸻

📊 9. Security Rules

* NEVER trust frontend permissions
* always validate on backend
* map Clerk user → internal role
* enforce org isolation

⸻

🧾 10. Comments (FOR CLAUDE)

Replace static UI with:

GET /api/v1/internal/roles

⸻

Requirements:

* integrate Clerk user_id
* middleware permission guard
* role-based rendering
* cache permissions (performance)

⸻

Important:

* Clerk ≠ RBAC system
* permissions must be enforced server-side
* UI is only visualization, not security


## 🧬 SCHEMA CONTROL
- schema.sql is source of truth
- no runtime creation
AUTH: CLERK
- all requests must include org_id


- NO auto AI
- NO fallback AI

## 🔐 PERMISSION MIDDLEWARE

- every API request MUST pass permission check

FLOW:

1. get clerk_user_id
2. map → role
3. load permissions
4. validate action

## ⚠️ DENY PRIORITY

- explicit deny overrides allow

EXAMPLE:

- role allows edit
- but module denies edit
→ final = DENY

## ⚡ PERFORMANCE

- cache permissions per user
- invalidate on role change

## 🔒 PERMISSION SCOPE

permissions apply per:

- org_id
- module
- action

## ⚠️ APPROVAL PERMISSION

only roles with:

can_approve = true

→ can approve:

- actions
- automation
- decisions

