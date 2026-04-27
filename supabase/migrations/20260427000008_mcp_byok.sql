-- Migration: MCP BYOK support
-- Adds two columns to organizations for storing AI provider key references.
-- Additive only — no existing columns modified, no RLS changes.

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS vault_byok_mcp_provider TEXT
    CHECK (vault_byok_mcp_provider IN ('openai', 'anthropic', 'openrouter')),
  ADD COLUMN IF NOT EXISTS vault_byok_mcp_secret_id UUID;
