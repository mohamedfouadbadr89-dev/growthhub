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


