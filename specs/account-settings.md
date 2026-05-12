📄 account-settings.md


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

PAGE :  app/settings/page.tsx

-----


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

👤 Profile

* name
* email
* avatar

⸻

🔐 Security

* password
* 2FA_status

⸻

🏢 Organization

* org_name
* plan
* seats

⸻

⚙️ Preferences

* theme
* notifications

⸻

⚡ Actions

* update_profile
* change_password
* enable_2fa

⸻

⸻

🧱 2. Data Shape

type AccountSettings = {
profile: {
name: string
email: string
avatar?: string
}

security: {
two_factor: boolean
}

organization: {
name: string
plan: string
seats: number
}

preferences: {
theme: string
notifications: boolean
}
}

3. API Contracts

GET /api/v1/account

PUT /api/v1/account

POST /api/v1/account/password

POST /api/v1/account/2fa

⸻

🗄️ 4. DB Schema

users

* id
* name
* email
* password_hash

⸻
sessions

* id
* user_id
* ip_address
* device
* last_active
* created_at

security_logs

* id
* user_id
* action
* ip
* device
* created_at

organizations

* id
* name
* plan

⸻

⸻

⚙️ 5. Execution Logic

* update user data
* validate security
* handle preferences

⸻
## 🔐 SECURITY LAYER

- track all login sessions
- allow user to revoke sessions

RULES:

- password change → invalidate all sessions
- suspicious activity → force logout

## 🔐 2FA RULES

IF 2FA enabled:

- require verification on login
- require verification on sensitive actions:
  - password change
  - API key access
  - billing updates

  ## 🔑 API KEYS MANAGEMENT

- users can add BYOK keys
- stored in Supabase Vault

RULES:

- NEVER exposed to frontend
- masked in UI


## 🧾 ACCOUNT AUDIT

log:

- password change
- email change
- 2FA enable/disable
- API key updates
⸻

🧠 6. AI Layer

* detect weak security
* recommend upgrades


## 🧠 AI LAYER (SAFE)

- security suggestions only

RULES:

- NO automatic changes
- MUST require user confirmation



## 🧬 SCHEMA CONTROL
- schema.sql is source of truth
- no runtime creation

AUTH: CLERK
- all requests must include org_id


- NO auto AI
- NO fallback AI


## ⚡ PERFORMANCE

- cache profile data
- refresh on update only

## 🔑 AI KEYS (BYOK)

fields:

- anthropic_key
- openai_key
- openrouter_key

RULES:

- encrypted storage (Supabase Vault)
- never exposed to frontend
- fetched server-side only


## ⚡ RUNTIME TRUTH

ACCOUNT SYSTEMS ARE:

- identity-sensitive

- security-critical

- organization-scoped

- session-dependent

- audit-dependent

RULES:

- Clerk is the identity provider ONLY

- authorization must remain internal

- sessions may briefly lag revocation

- org membership can change dynamically

- API keys are high-risk assets

- frontend session state is NOT trusted

- email ownership may change over time

- security events must be immutable

SYSTEM TRUTH PRIORITY:

1. Clerk identity

2. internal RBAC

3. organization membership

4. security audit logs

5. active session registry

6. dashboard session state

NEVER:

- trust frontend authorization

- expose API keys to frontend

- treat Clerk as full authorization engine

- store secrets in browser storage

- bypass audit logging

---

## 🔗 CLERK INTEGRATION BOUNDARY

CLERK RESPONSIBILITY:

- authentication

- session management

- identity management

- organization membership

- MFA verification

INTERNAL SYSTEM RESPONSIBILITY:

- RBAC

- feature permissions

- AI permissions

- execution authorization

- BYOK governance

- audit governance

- security monitoring

RULES:

- Clerk MUST NOT be treated as authorization source

- internal APIs MUST validate org permissions

- all sensitive actions require internal authorization checks

- org isolation enforced internally

---

## ⚠️ MISSING SEMANTICS

CURRENT SPEC DOES NOT DEFINE:

- session expiration policy

- concurrent session limits

- trusted device lifecycle

- account recovery workflow

- API key rotation lifecycle

- API key validation process

- org ownership transfer

- email verification flow

- deleted account handling

- suspended org behavior

- RBAC inheritance rules

- notification preference granularity

- audit retention policy

- forced logout behavior

- compromised account handling

- login anomaly thresholds

- session risk scoring

REQUIRED BEFORE SCALE:

- canonical authorization model

- session governance policy

- secrets lifecycle management

- account recovery governance

---

## ⚠️ DANGEROUS ASSUMPTIONS

NEVER ASSUME:

- Clerk RBAC is sufficient

- frontend session state is trusted

- revoked sessions terminate instantly

- masked keys are safe if leaked server-side

- org owner always exists

- API keys remain valid forever

- email identity never changes

- users belong to one organization only

- 2FA guarantees account safety

- browser state reflects backend truth

RISKS:

- privilege escalation

- unauthorized org access

- leaked API credentials

- stale session abuse

- broken audit trails

- orphaned organizations

- security bypasses

- cross-org exposure

---

## 🧩 SPEC GAPS

MISSING API CONTRACTS:

- GET /api/v1/account/sessions

- POST /api/v1/account/sessions/revoke

- GET /api/v1/account/security

- POST /api/v1/account/verify-email

- POST /api/v1/account/recovery

- POST /api/v1/account/api-keys

- DELETE /api/v1/account/api-keys/:id

- POST /api/v1/account/api-keys/validate

- GET /api/v1/account/audit

- GET /api/v1/account/devices

MISSING STATES:

- session_expired

- session_revoked

- org_access_revoked

- key_validation_failed

- suspicious_activity

- email_unverified

- recovery_pending

- account_locked

- stale_permissions

- security_review_required

---

## 🌐 REQUIRED BACKEND CONTRACTS

SESSION CONTRACT:

INPUT:

- session_id

- user_id

- org_id

OUTPUT:

- valid

- revoked

- expires_at

- risk_level

RULES:

- backend validation only

- org-scoped validation required

- revoked sessions blocked globally

---

API KEY CONTRACT:

INPUT:

- provider

- encrypted_key

OUTPUT:

- validation_status

- provider_access

- scopes

RULES:

- validation server-side only

- raw keys NEVER returned

- encrypted storage mandatory

---

SECURITY EVENT CONTRACT:

INPUT:

- action

- ip_address

- device

- org_id

OUTPUT:

- audit_event

- risk_score

- security_status

RULES:

- immutable logs required

- all sensitive actions logged

---

ORG ACCESS CONTRACT:

INPUT:

- user_id

- org_id

OUTPUT:

- role

- permissions

- access_status

RULES:

- internal RBAC required

- Clerk org membership alone insufficient

---

## 🗄️ REQUIRED TABLES

user_preferences

api_keys

api_key_audit

session_revocations

account_audit_logs

org_membership_history

security_events

trusted_devices

notification_preferences

login_attempts

account_recovery_requests

permission_snapshots

security_reviews

api_key_validations

---

## ⚡ EXECUTION BOUNDARIES

CLAUDE MAY IMPLEMENT:

- settings UI

- profile forms

- preferences UI

- session tables

- audit history rendering

- API key forms

- device lists

- loading/error/empty states

CLAUDE MUST NOT IMPLEMENT:

- auth engine

- session validation engine

- token issuance

- vault encryption

- RBAC enforcement

- security scoring

- anomaly detection

- MFA verification

- secrets management runtime

---

## 🛡️ GOVERNANCE BOUNDARIES

ACCOUNT GOVERNANCE:

- org ownership changes auditable

- all key updates logged

- all security actions immutable

- account recovery controlled

- email changes require verification

- session revocations tracked

SECURITY:

- org isolation mandatory

- secrets server-side only

- RBAC enforced internally

- device trust controlled centrally

COMPLIANCE:

- audit logs immutable

- recovery history retained

- security actions reproducible

- deleted account handling traceable

---

## ⏸️ WHAT MUST REMAIN DEFERRED

DEFER:

- adaptive authentication

- AI fraud detection

- behavioral security scoring

- autonomous account lockdown

- AI permission management

- automatic risk remediation

- predictive compromise detection

RULE:

- security actions must remain deterministic initially

---

## 🚫 WHAT SHOULD NEVER EXIST

NEVER:

- frontend API key validation

- localStorage secrets

- raw API key exposure

- direct vault access from frontend

- browser-side RBAC

- auth decisions in UI

- hidden admin bypasses

- silent org switching

- frontend permission enforcement only

- uncached session mutation

- direct Clerk token trust without backend validation

---