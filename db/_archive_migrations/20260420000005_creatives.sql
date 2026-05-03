-- Phase 5 — AI Creatives
-- Tables: brand_kits, creative_generations, creatives

-- ============================================================
-- Table: brand_kits (one per org — upsert pattern)
-- ============================================================
CREATE TABLE brand_kits (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          TEXT        NOT NULL UNIQUE,
  logo_url        TEXT,
  colors          JSONB       NOT NULL DEFAULT '[]',
  fonts           JSONB       NOT NULL DEFAULT '{}',
  tone_of_voice   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE brand_kits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_read_write" ON brand_kits
  USING  (org_id = auth.jwt()->>'org_id')
  WITH CHECK (org_id = auth.jwt()->>'org_id');

CREATE INDEX idx_brand_kits_org_id ON brand_kits(org_id);

-- ============================================================
-- Table: creative_generations (job record per request)
-- ============================================================
CREATE TABLE creative_generations (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id               TEXT        NOT NULL,
  generation_type      TEXT        NOT NULL CHECK (generation_type IN ('copy', 'image')),
  status               TEXT        NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  ad_account_id        UUID        REFERENCES ad_accounts(id) ON DELETE SET NULL,
  campaign_name        TEXT,
  source_roas          NUMERIC(14,4),
  prompt               TEXT,
  model                TEXT,
  error_message        TEXT,
  started_at           TIMESTAMPTZ,
  completed_at         TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE creative_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_read_write" ON creative_generations
  USING  (org_id = auth.jwt()->>'org_id')
  WITH CHECK (org_id = auth.jwt()->>'org_id');

CREATE INDEX idx_creative_generations_org_id    ON creative_generations(org_id);
CREATE INDEX idx_creative_generations_status    ON creative_generations(status);
CREATE INDEX idx_creative_generations_created   ON creative_generations(org_id, created_at DESC);

-- ============================================================
-- Table: creatives (individual generated outputs)
-- ============================================================
CREATE TABLE creatives (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            TEXT        NOT NULL,
  generation_id     UUID        NOT NULL REFERENCES creative_generations(id) ON DELETE CASCADE,
  type              TEXT        NOT NULL CHECK (type IN ('copy', 'image')),
  content_url       TEXT,
  content_text      JSONB,  -- {headline, body, cta} for copy type
  performance_score INTEGER     NOT NULL DEFAULT 0
                      CHECK (performance_score BETWEEN 0 AND 100),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE creatives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_read_write" ON creatives
  USING  (org_id = auth.jwt()->>'org_id')
  WITH CHECK (org_id = auth.jwt()->>'org_id');

CREATE INDEX idx_creatives_org_id       ON creatives(org_id);
CREATE INDEX idx_creatives_generation   ON creatives(generation_id);
CREATE INDEX idx_creatives_score        ON creatives(org_id, performance_score DESC);
CREATE INDEX idx_creatives_created      ON creatives(org_id, created_at DESC);
