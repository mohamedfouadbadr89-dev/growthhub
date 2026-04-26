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