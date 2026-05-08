-- =====================================================================
-- Phase 5 — AI Creatives (canonical migration; 2026-05-07)
-- =====================================================================
-- Authority chain (in order):
--   1. specs/SYSTEM_CONTROL.md → Phase 5 unlock authorized 2026-05-07
--   2. specs/005-ai-creatives/spec.md → functional + entity authority
--   3. specs/creatives-{brand-kit,editor,results,archive}.md → page-level spec
--      authority (column shape consumed by frontend)
--   4. Backend runtime code in:
--        backend/src/routes/v1/{creatives,brand-kit}.ts
--        backend/src/services/creatives/{brand-kit,creative-generator,
--                                       copy-generation,image-generation,
--                                       storage}.ts
--      → runtime-evidence authority (column names + value shapes)
--
-- NOT referenced (per CLAUDE.md MIGRATION SOURCE OF TRUTH):
--   /db/_archive_migrations/20260420000005_creatives.sql
--   /db/_archive_migrations/20260420000006_creatives_hardening.sql
--   — archive only; never executed.
--
-- Schema scope (additive only):
--   - 3 new tables: brand_kits, creative_generations, creatives
--   - 2 new columns on organizations: plan_type, vault_byok_openrouter_secret_id
--     (Phase 7 substrate required by Phase 5 FR-011 BYOK gate; documented
--     in resolveApiKey runtime comment as the source of currently-active
--     42703 schema drift)
--   - 1 storage bucket: 'creatives' (private; signed-URL access)
--
-- Phase locks preserved:
--   - Phase 4 minimal slice (actions_library, decision_history): UNTOUCHED
--   - Phase 4 Part 2 (automation_rules, automation_runs): UNTOUCHED
--   - Phase 3 (ai_decisions, ai_logs, campaigns): UNTOUCHED
--   - Phase 2 (integrations, ad_accounts, campaign_metrics, sync_logs):
--     UNTOUCHED at column level; FK references added (creative_generations
--     references campaigns and ad_accounts as upstream context).
--   - Legacy `decisions` table: UNTOUCHED (still DEPRECATED)
--
-- Phase 7 boundary (governance-locked):
--   This migration adds the MINIMAL Phase 7 substrate columns
--   (plan_type, vault_byok_openrouter_secret_id) that Phase 5 code at
--   `backend/src/services/creatives/creative-generator.ts:19-22`
--   already SELECTs. It does NOT implement Phase 7 monetization:
--     - no Stripe integration
--     - no plan upgrade flow
--     - no billing UI
--     - no credits ledger
--   It simply provides the read-substrate that Phase 5 BYOK gate
--   (FR-011) cannot ship without.
--
-- Architecture invariants preserved:
--   - org_id present on every new table
--   - RLS enabled on every new table
--   - service_role bypasses RLS by design (backend single writer)
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. organizations — Phase 7 substrate columns required by Phase 5 FR-011
-- ---------------------------------------------------------------------
-- These two columns are READ by `creative-generator.ts:resolveApiKey()`.
-- Their absence is the documented "currently-active 42703" referenced
-- in the resolveApiKey defensive-comment block. Adding them here
-- unblocks Phase 5 BYOK gate WITHOUT implementing Phase 7 monetization.
--
-- `plan_type` defaults to 'subscription' so all existing organizations
-- keep using the platform OpenRouter key (matches pre-Phase-7 behavior).
-- `vault_byok_openrouter_secret_id` is NULLABLE; only populated when an
-- LTD user adds their BYOK key (Phase 7 UI; not in this migration).
-- ---------------------------------------------------------------------
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS plan_type TEXT NOT NULL DEFAULT 'subscription'
    CHECK (plan_type IN ('subscription', 'ltd'));

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS vault_byok_openrouter_secret_id UUID;


-- ---------------------------------------------------------------------
-- 2. brand_kits
-- ---------------------------------------------------------------------
-- Per spec FR-001, FR-002. One brand kit per organization.
-- Logo image is stored in Supabase Storage as a path; the brand kit
-- column holds that path string. Backend signs URLs at read time
-- (1-hour expiry) per `services/creatives/brand-kit.ts` + `storage.ts`.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brand_kits (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        TEXT NOT NULL UNIQUE REFERENCES organizations(org_id),
  logo_url      TEXT,
  colors        TEXT[] NOT NULL DEFAULT '{}',
  fonts         JSONB NOT NULL DEFAULT '{}'::jsonb,
  tone_of_voice TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE brand_kits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brand_kits_org_isolation" ON brand_kits
  FOR ALL
  USING (org_id = (auth.jwt() ->> 'org_id'));

CREATE INDEX IF NOT EXISTS idx_brand_kits_org_id ON brand_kits(org_id);


-- ---------------------------------------------------------------------
-- 3. creative_generations
-- ---------------------------------------------------------------------
-- Per spec FR-003, FR-004, FR-005, FR-008, FR-013. One row per
-- generation request; a single generation produces 1..N creatives
-- (3 copy variations or 2 image creatives per spec assumptions).
--
-- Source context: at most one of (source_ad_account_id, source_campaign_name)
-- is required for ROAS-based performance scoring (FR-006); both nullable
-- to permit "no campaign context" generation per Edge Cases.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS creative_generations (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                   TEXT NOT NULL REFERENCES organizations(org_id),
  source_ad_account_id     UUID REFERENCES ad_accounts(id),
  source_campaign_name     TEXT,
  generation_type          TEXT NOT NULL
                             CHECK (generation_type IN ('copy', 'image')),
  status                   TEXT NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  model                    TEXT,
  source_roas              NUMERIC,
  error_message            TEXT,
  started_at               TIMESTAMPTZ,
  completed_at             TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE creative_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creative_generations_org_isolation" ON creative_generations
  FOR ALL
  USING (org_id = (auth.jwt() ->> 'org_id'));

CREATE INDEX IF NOT EXISTS idx_creative_generations_org_id
  ON creative_generations(org_id);
CREATE INDEX IF NOT EXISTS idx_creative_generations_status
  ON creative_generations(org_id, status, created_at DESC);


-- ---------------------------------------------------------------------
-- 4. creatives
-- ---------------------------------------------------------------------
-- Per spec FR-007, FR-009, FR-010. The "Creative" entity. Each row is
-- one generated output (one image or one copy variation). Linked to
-- its parent generation_id for traceability.
--
-- - For type='image': content_url stores the Supabase Storage path
--   (org_id/generation_id/filename). Read-side serves a signed URL.
-- - For type='copy':  content_text JSONB stores {headline, body, cta}.
--
-- performance_score (0–100) is set at generation time per FR-006.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS creatives (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            TEXT NOT NULL REFERENCES organizations(org_id),
  generation_id     UUID NOT NULL REFERENCES creative_generations(id) ON DELETE CASCADE,
  type              TEXT NOT NULL CHECK (type IN ('copy', 'image')),
  content_url       TEXT,
  content_text      JSONB,
  performance_score INTEGER NOT NULL DEFAULT 0
                      CHECK (performance_score BETWEEN 0 AND 100),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Exactly one of content_url / content_text must be present (matches
  -- frontend Results gallery + Editor expectations).
  CHECK (
    (type = 'image' AND content_url IS NOT NULL)
    OR (type = 'copy'  AND content_text IS NOT NULL)
  )
);

ALTER TABLE creatives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creatives_org_isolation" ON creatives
  FOR ALL
  USING (org_id = (auth.jwt() ->> 'org_id'));

CREATE INDEX IF NOT EXISTS idx_creatives_org_id
  ON creatives(org_id);
CREATE INDEX IF NOT EXISTS idx_creatives_generation_id
  ON creatives(generation_id);
CREATE INDEX IF NOT EXISTS idx_creatives_org_perf
  ON creatives(org_id, performance_score DESC, created_at DESC);


-- ---------------------------------------------------------------------
-- 5. Storage bucket — `creatives`
-- ---------------------------------------------------------------------
-- Per CLAUDE.md TECH STACK + spec FR-007. Backend services already
-- reference a 'creatives' bucket via `SUPABASE_STORAGE_BUCKET` env
-- (default 'creatives') in `services/creatives/storage.ts`.
--
-- Bucket is PRIVATE — backend serves time-limited signed URLs (1h)
-- via storage.from('creatives').createSignedUrl(path, 3600). This
-- preserves CLAUDE.md "service_role_key lives on Backend only" rule;
-- the frontend never receives a permanent public URL.
--
-- INSERT … ON CONFLICT keeps this idempotent on re-deploy.
-- ---------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('creatives', 'creatives', false)
ON CONFLICT (id) DO NOTHING;


-- =====================================================================
-- End of Phase 5 — AI Creatives canonical migration.
--
-- Post-migration verification (run in Supabase SQL editor or psql):
--   SELECT tablename FROM pg_tables
--    WHERE schemaname='public'
--      AND tablename IN ('brand_kits', 'creative_generations', 'creatives');
--   -- expect 3 rows.
--
--   SELECT column_name FROM information_schema.columns
--    WHERE table_name='organizations'
--      AND column_name IN ('plan_type', 'vault_byok_openrouter_secret_id');
--   -- expect 2 rows.
--
--   SELECT polname FROM pg_policy
--    WHERE polrelid::regclass::text IN
--      ('brand_kits', 'creative_generations', 'creatives');
--   -- expect 3 RLS policies.
--
--   SELECT id, public FROM storage.buckets WHERE id='creatives';
--   -- expect: creatives | f
--
-- Next governed steps (require subsequent authorization or operator):
--   1. supabase db push — deploy this migration.
--   2. Lift /creatives/* + /brand-kit/* 503 gates in
--      backend/src/routes/v1/index.ts (only AFTER deploy verified).
--   3. NOTE: Phase 5 routes (`creatives.ts`, `brand-kit.ts`) currently
--      use legacy envelope shapes. Canonicalization to the Phase 1
--      ok()/fail() envelope is tracked alongside PHASE2_ENVELOPE_FOLLOWUP
--      as a future Phase-1-cross-cutting patch — frontend pages are
--      currently mocked-shells (no apiClient coupling), so canonicalization
--      could land in a future pass without breaking anything.
--   4. Operator-side env: SILICONFLOW_API_KEY (image generation),
--      SUPABASE_STORAGE_BUCKET=creatives (default), OPENROUTER_DEFAULT_MODEL
--      already present from Phase 3 + Phase 2.
-- =====================================================================
