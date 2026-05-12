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


## ⚡ RUNTIME TRUTH

TEAM SYSTEMS ARE:

- organization-scoped

- permission-sensitive

- audit-critical

- approval-dependent

- identity-linked

RULES:

- Clerk handles identity ONLY

- internal RBAC controls authorization

- org membership changes dynamically

- invites may expire or become stale

- role updates must propagate safely

- permissions are eventually consistent

- approvals may outlive sessions

SYSTEM TRUTH PRIORITY:

1. Clerk identity

2. internal RBAC

3. org membership

4. approval system

5. audit logs

6. UI session state

NEVER:

- trust frontend permissions

- allow cross-org visibility

- treat UI role state as source of truth

- bypass audit logging

- infer permissions client-side

---

## 🔗 CLERK INTEGRATION BOUNDARY

CLERK RESPONSIBILITY:

- authentication

- sessions

- identity

- org membership

INTERNAL SYSTEM RESPONSIBILITY:

- RBAC

- approvals

- execution permissions

- audit governance

- feature access

- role hierarchy enforcement

RULES:

- Clerk MUST NOT be treated as authorization engine

- internal APIs MUST validate org permissions

- all execution actions require RBAC validation

- org isolation enforced internally

---

## 🔄 COMPETITOR LIFECYCLE SEMANTICS

TEAM FLOW:

invite

→ membership validation

→ role assignment

→ approval routing

→ execution authorization

→ audit logging

→ permission updates

→ session refresh

→ governance monitoring

RULES:

- role transitions are auditable

- approvals are immutable historically

- org membership affects permissions dynamically

- access propagation may lag briefly

- execution authority separate from membership

---

## ⚠️ MISSING SEMANTICS

CURRENT SPEC DOES NOT DEFINE:

- invite expiration policy

- role inheritance model

- org ownership transfer

- temporary permissions

- approval escalation rules

- approval timeout handling

- concurrent role edits

- member suspension behavior

- inactive member lifecycle

- multi-org membership rules

- seat enforcement semantics

- invite revocation behavior

- session invalidation after role changes

- delegated admin permissions

- audit retention policy

- approval replay prevention

REQUIRED BEFORE SCALE:

- canonical RBAC model

- approval governance policy

- org hierarchy model

- permission propagation strategy

---

## ⚠️ DANGEROUS ASSUMPTIONS

NEVER ASSUME:

- Clerk org membership equals authorization

- admins are always trusted

- role updates propagate instantly

- invited users will accept invitations

- viewers cannot escalate indirectly

- frontend permission checks are sufficient

- pending users are harmless

- approval requests remain valid forever

RISKS:

- privilege escalation

- cross-org exposure

- stale permission abuse

- approval spoofing

- orphaned admin state

- unauthorized execution

- broken audit chains

- inconsistent RBAC enforcement

---

## 🧩 SPEC GAPS

MISSING API CONTRACTS:

- GET /api/v1/team/roles

- GET /api/v1/team/permissions

- GET /api/v1/team/audit

- GET /api/v1/team/approvals

- POST /api/v1/team/approvals/:id/approve

- POST /api/v1/team/approvals/:id/reject

- POST /api/v1/team/invite/resend

- DELETE /api/v1/team/invite/:id

- POST /api/v1/team/member/:id/suspend

- POST /api/v1/team/member/:id/reactivate

MISSING STATES:

- invite_expired

- approval_pending

- role_conflict

- stale_permissions

- org_access_revoked

- suspended_member

- orphaned_org

- approval_timeout

- approval_rejected

- permission_sync_pending

---

## 🌐 REQUIRED BACKEND CONTRACTS

RBAC CONTRACT:

INPUT:

- user_id

- org_id

- action

OUTPUT:

- allowed

- role

- permissions

- approval_required

RULES:

- backend-only enforcement

- org-scoped validation mandatory

- immutable permission snapshots required

---

APPROVAL CONTRACT:

INPUT:

- action_type

- requester_id

- org_id

OUTPUT:

- approval_id

- approval_status

- approvers[]

- expires_at

RULES:

- approvals immutable historically

- admin validation required

- replay prevention mandatory

---

INVITE CONTRACT:

INPUT:

- email

- role

- org_id

OUTPUT:

- invite_id

- status

- expires_at

RULES:

- invites org-scoped only

- duplicate invite prevention required

- invite expiration enforced

---

AUDIT CONTRACT:

INPUT:

- action

- actor_id

- target_id

- org_id

OUTPUT:

- audit_log

- timestamp

- risk_level

RULES:

- immutable logs required

- all permission changes logged

---

## 🗄️ REQUIRED TABLES

team_roles

team_role_permissions

team_permission_snapshots

team_approvals

team_approval_history

team_invite_tokens

team_invite_audit

team_member_history

team_access_reviews

team_security_events

team_session_permissions

org_role_hierarchy

approval_policies

approval_execution_logs

team_permission_cache

---

## ⚡ EXECUTION BOUNDARIES

CLAUDE MAY IMPLEMENT:

- team tables

- member cards

- invite forms

- approval queues

- audit history rendering

- filters

- pagination

- export actions

- loading/error/empty states

CLAUDE MUST NOT IMPLEMENT:

- RBAC engine

- approval engine

- permission propagation

- auth validation

- org isolation enforcement

- security scoring

- privilege escalation detection

- execution authorization logic

---

## 🛡️ GOVERNANCE BOUNDARIES

TEAM GOVERNANCE:

- role changes auditable

- approvals immutable historically

- org ownership protected

- permission snapshots reproducible

- invite lifecycle traceable

SECURITY:

- strict org isolation mandatory

- execution permissions server-side only

- RBAC centrally enforced

- session permissions revocable

COMPLIANCE:

- audit logs immutable

- approval history retained

- removed member history preserved

- access reviews reproducible

---

## ⏸️ WHAT MUST REMAIN DEFERRED

DEFER:

- AI-generated permissions

- autonomous role assignment

- predictive insider-risk scoring

- automatic permission escalation

- AI approval routing

- adaptive RBAC

- autonomous org governance

RULE:

- permissions must remain deterministic initially

---

## 🚫 WHAT SHOULD NEVER EXIST

NEVER:

- frontend RBAC enforcement only

- localStorage permissions

- hidden admin bypasses

- direct Clerk role trust

- browser-side approval logic

- uncached permission mutation

- automatic role escalation

- silent org switching

- direct cross-org queries

- frontend execution authorization

---