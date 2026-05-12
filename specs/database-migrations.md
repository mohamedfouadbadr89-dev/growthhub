## 🧬 DATABASE MIGRATION ENGINE

SOURCE_OF_TRUTH: SQL_FILES_ONLY

FILES:
- /db/schema.sql
- /db/migrations/*.sql

RULES:
- ALL schema MUST be written in SQL
- NO runtime table creation
- NO "create if not exists" inside app code

EXECUTION:
- migrations executed via Supabase CLI ONLY
- NEVER via frontend
- NEVER via API

FLOW:
1. update schema.sql
2. create migration file
3. run:
   supabase db push

VALIDATION:
- Claude MUST read schema.sql before writing queries
- MUST NOT assume tables
- MUST match exact column names

ENV:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE

FAIL SAFE:
- if table not found → STOP (do not create)

## 🧬 SCHEMA CONTROL
- schema.sql is source of truth
- no runtime creation


## ⚠️ SCHEMA VERSIONING

FIELDS:

- schema_version

RULE:

- backend MUST check schema version before queries
- mismatch → block execution

## 🔁 BACKWARD COMPATIBILITY

RULE:

- migrations MUST be additive first
- DO NOT break existing queries

EXAMPLE:

- add column → OK
- rename column → NOT allowed without migration plan

## 🛑 ROLLBACK STRATEGY

- every migration MUST have rollback

RULE:

- failed migration → revert immediately
- system MUST remain operational

## 🌍 ENVIRONMENTS

- dev
- staging
- production

RULE:

- migrations MUST be tested on staging first
- NEVER apply directly to production


# ⚡ RUNTIME TRUTH

DATABASE SYSTEMS ARE:

- schema-driven

- migration-controlled

- environment-sensitive

- backward-compatible

- operationally critical

- audit-sensitive

RULES:

- schema.sql is the single source of truth

- runtime schema mutation is forbidden

- migrations are append-first

- staging validation required before production

- schema drift is system risk

- rollback capability mandatory

- schema version mismatch blocks execution

SYSTEM TRUTH PRIORITY:

1. schema.sql

2. migration history

3. applied schema version

4. Supabase runtime schema

5. backend query layer

6. frontend assumptions

NEVER:

- assume tables exist

- generate runtime migrations

- mutate schema from app code

- create hidden columns dynamically

- bypass migration validation

- rename columns without compatibility strategy

---

## 🔄 COMPETITOR LIFECYCLE SEMANTICS

SCHEMA FLOW:

schema update

→ migration creation

→ staging validation

→ compatibility checks

→ rollback validation

→ Supabase migration execution

→ schema version sync

→ backend validation

→ production rollout

RULES:

- schema evolution is controlled

- migrations are versioned

- rollback readiness mandatory

- production rollout gated

- schema drift monitored continuously

---

## ⚠️ MISSING SEMANTICS

CURRENT SPEC DOES NOT DEFINE:

- migration naming convention

- schema version format

- rollback execution ownership

- migration dependency rules

- failed deployment recovery SLA

- multi-region schema consistency

- migration batching

- migration lock strategy

- schema drift detection

- migration checksum validation

- data backfill procedures

- partial deployment handling

- deprecated column lifecycle

- hotfix migration policy

- shadow migration testing

- long-running migration handling

REQUIRED BEFORE SCALE:

- canonical migration governance

- schema compatibility framework

- rollback orchestration model

- deployment sequencing standards

---

## ⚠️ DANGEROUS ASSUMPTIONS

NEVER ASSUME:

- staging equals production

- migrations are instantly safe

- additive changes are risk-free

- schema cache always fresh

- rollback always succeeds

- Supabase schema fully synchronized

- old queries are automatically compatible

- all services use latest schema version

RISKS:

- schema drift

- production downtime

- broken APIs

- invalid cached queries

- data corruption

- incompatible deployments

- failed rollbacks

- partial environment mismatch

---

## 🧩 SPEC GAPS

MISSING API CONTRACTS:

- GET /api/v1/internal/schema/version

- GET /api/v1/internal/schema/health

- GET /api/v1/internal/migrations/history

- POST /api/v1/internal/schema/validate

- POST /api/v1/internal/schema/check-compatibility

- POST /api/v1/internal/schema/drift-check

- POST /api/v1/internal/migrations/rollback

- POST /api/v1/internal/migrations/validate

- POST /api/v1/internal/migrations/lock

- POST /api/v1/internal/migrations/unlock

MISSING STATES:

- schema_mismatch

- migration_pending

- rollback_required

- schema_locked

- incompatible_query

- partial_migration

- stale_schema_cache

- failed_validation

- drift_detected

- migration_conflict

---

## 🌐 REQUIRED BACKEND CONTRACTS

SCHEMA VALIDATION CONTRACT:

INPUT:

- schema_version

- environment

- migration_state

OUTPUT:

- compatible

- missing_tables[]

- invalid_columns[]

- drift_detected

RULES:

- backend-only validation

- exact column matching required

- execution blocked on mismatch

---

MIGRATION EXECUTION CONTRACT:

INPUT:

- migration_id

- target_environment

OUTPUT:

- execution_status

- applied_version

- rollback_reference

RULES:

- Supabase CLI only

- no frontend execution

- no API-triggered migration execution

---

ROLLBACK CONTRACT:

INPUT:

- migration_id

- rollback_target

OUTPUT:

- rollback_status

- restored_version

RULES:

- rollback mandatory for every migration

- operational continuity required

---

QUERY VALIDATION CONTRACT:

INPUT:

- query

- schema_version

OUTPUT:

- valid

- missing_dependencies[]

- compatibility_status

RULES:

- schema.sql validation mandatory

- exact column references required

---

## 🗄️ REQUIRED TABLES

schema_versions

migration_history

migration_rollbacks

migration_checksums

schema_validation_logs

schema_drift_logs

environment_schema_state

migration_dependencies

schema_compatibility_matrix

migration_execution_logs

rollback_execution_logs

schema_health

query_compatibility_logs

schema_lock_state

migration_failures

---

## ⚡ EXECUTION BOUNDARIES

CLAUDE MAY IMPLEMENT:

- SQL schema files

- migration SQL files

- query generation

- schema-aware APIs

- compatibility-safe changes

- additive migrations

- schema validation checks

- rollback scripts

- migration documentation

CLAUDE MUST NOT IMPLEMENT:

- runtime schema mutation

- automatic migration execution

- frontend schema creation

- hidden schema patching

- direct production migration execution

- destructive migrations without plan

- schema inference without validation

- dynamic table generation

---

## 🛡️ GOVERNANCE BOUNDARIES

SCHEMA GOVERNANCE:

- schema.sql authoritative

- migration history immutable

- rollback history auditable

- schema versions tracked

- compatibility enforcement centralized

SECURITY:

- service role keys backend-only

- no frontend DB admin access

- migration execution restricted

- environment isolation mandatory

COMPLIANCE:

- migration audit logs retained

- rollback history immutable

- schema drift traceable

- deployment sequencing documented

---

## ⏸️ WHAT MUST REMAIN DEFERRED

DEFER:

- AI-generated schema design

- autonomous migrations

- self-healing schemas

- automatic rollback orchestration

- runtime schema optimization

- AI-generated DB normalization

- autonomous index optimization

RULE:

- schema evolution must remain deterministic initially

---

## 🚫 WHAT SHOULD NEVER EXIST

NEVER:

- runtime CREATE TABLE logic

- frontend migration execution

- automatic schema generation

- "create if not exists" in app code

- hidden fallback tables

- silent schema mutation

- destructive migrations without rollback

- direct production schema patching

- schema inference from frontend

- uncached schema validation bypass

---