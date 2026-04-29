- ================================

-- AI LOGS TABLE

-- ================================

CREATE TABLE IF NOT EXISTS ai_logs (

  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  org_id UUID NOT NULL,

  model TEXT NOT NULL,

  prompt TEXT NOT NULL,

  response TEXT,

  latency_ms INTEGER,

  status TEXT CHECK (status IN ('success', 'error')),

  error_message TEXT,

  created_at TIMESTAMP DEFAULT NOW()

);

ALTER TABLE ai_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_isolation_ai_logs" ON ai_logs;

CREATE POLICY "org_isolation_ai_logs"

ON ai_logs

USING (org_id = (auth.jwt() ->> 'org_id')::uuid);

CREATE INDEX IF NOT EXISTS idx_ai_logs_org_id ON ai_logs(org_id);

-- ================================

-- DECISIONS TABLE (CREATE IF MISSING)

-- ================================

CREATE TABLE IF NOT EXISTS decisions (

  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  org_id UUID NOT NULL,

  campaign_id TEXT,

  type TEXT,

  title TEXT,

  description TEXT,

  status TEXT DEFAULT 'active',

  confidence_score NUMERIC(5,2),

  reasoning_steps JSONB,

  suggested_action_id UUID,

  metadata JSONB,

  created_at TIMESTAMP DEFAULT NOW()

);

-- ================================

-- DECISIONS SAFE EXTENSIONS

-- ================================

ALTER TABLE decisions

ADD COLUMN IF NOT EXISTS reasoning_steps JSONB;

ALTER TABLE decisions

ADD COLUMN IF NOT EXISTS suggested_action_id UUID;

ALTER TABLE decisions

ADD COLUMN IF NOT EXISTS metadata JSONB;

ALTER TABLE decisions

ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(5,2);

-- ================================

-- STATUS CONSTRAINT (SAFE RESET)

-- ================================

ALTER TABLE decisions

DROP CONSTRAINT IF EXISTS decisions_status_check;

ALTER TABLE decisions

ADD CONSTRAINT decisions_status_check CHECK (

  status IN ('active', 'stale', 'dismissed', 'needs_review', 'executed')

);

-- ================================

-- OPTIONAL (BUT IMPORTANT) RLS

-- ================================

ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_isolation_decisions" ON decisions;

CREATE POLICY "org_isolation_decisions"

ON decisions

USING (org_id = (auth.jwt() ->> 'org_id')::uuid);

CREATE INDEX IF NOT EXISTS idx_decisions_org_id ON decisions(org_id);