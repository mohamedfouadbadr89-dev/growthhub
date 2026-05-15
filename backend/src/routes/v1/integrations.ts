import { Hono } from 'hono'
import { supabaseAdmin } from '../../lib/supabase.js'
import { deleteSecret } from '../../lib/vault.js'
import { inngest } from '../../jobs/inngest.js'
import { ok, fail } from '../../utils/response.js'

// Continuation #31 (2026-05-12) — PHASE2_ENVELOPE_FOLLOWUP item M resolution.
// Canonicalized onto Phase 1 envelope per ADJACENT CONTINUATION AUTHORITY.
// FE apiClient detection-unwrap (#13) absorbs the change transparently.
// 204 No Content response (DELETE) intentionally preserved as raw Response —
// canonical envelope is JSON-only; HTTP 204 has no body by spec.
type Variables = { userId: string; orgId: string; requestId: string }
export const integrationsRouter = new Hono<{ Variables: Variables }>()

// GET /api/v1/integrations
integrationsRouter.get('/', async (c) => {
  const orgId = c.get('orgId')

  const { data, error } = await supabaseAdmin
    .from('integrations')
    .select('id, platform, status, last_synced_at, created_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`integrations list lookup failed: ${error.message}`)
  }

  return ok(c, (data ?? []).map((row) => ({
    id: row.id,
    platform: row.platform,
    status: row.status,
    lastSyncedAt: row.last_synced_at,
    createdAt: row.created_at,
  })))
})

// DELETE /api/v1/integrations/:id
integrationsRouter.delete('/:id', async (c) => {
  const orgId = c.get('orgId')
  const id = c.req.param('id')

  const { data: integration, error: fetchError } = await supabaseAdmin
    .from('integrations')
    .select('id, vault_refresh_token_secret_id, provider_secret_id')
    .eq('id', id)
    .eq('org_id', orgId)
    .single()

  if (fetchError || !integration) return fail(c, 'Integration not found', 404, { code: 'NOT_FOUND' })

  // Clean up BOTH credential columns from Vault. An integrations row
  // carries exactly one (OAuth providers → vault_refresh_token_secret_id;
  // non-OAuth providers like Slack → provider_secret_id), but the disconnect
  // path deletes whichever is present so no Vault secret is orphaned.
  // Continuation #48 — request_id correlation for grep parity with the
  // [req]/[err]/[exec]/[AI] chain. Vault deletion failure is
  // observability-only (the integration is still soft-disconnected), so
  // each warn lands here instead of throwing.
  const secretIdsToDelete = [
    integration.vault_refresh_token_secret_id,
    integration.provider_secret_id,
  ].filter((s): s is string => typeof s === 'string' && s.length > 0)

  for (const secretId of secretIdsToDelete) {
    try {
      await deleteSecret(secretId)
    } catch (err) {
      console.error(
        `[integrations-disconnect][req=${c.get('requestId') ?? 'no-request-id'}] ` +
          `Failed to delete Vault secret (integration_id=${id}, org=${orgId}):`,
        err,
      )
    }
  }

  const { error } = await supabaseAdmin
    .from('integrations')
    .update({
      status: 'disconnected',
      vault_refresh_token_secret_id: null,
      provider_secret_id: null,
    })
    .eq('id', id)
    .eq('org_id', orgId)

  if (error) {
    throw new Error(`integration disconnect failed: ${error.message}`)
  }

  // 204 No Content preserved as raw Response — canonical envelope is JSON-only;
  // HTTP 204 has no body by spec; FE apiClient handles 204 without unwrap.
  return new Response(null, { status: 204 })
})

// POST /api/v1/integrations/:id/sync
integrationsRouter.post('/:id/sync', async (c) => {
  const orgId = c.get('orgId')
  const id = c.req.param('id')

  const { data: integration, error: fetchError } = await supabaseAdmin
    .from('integrations')
    .select('id, status')
    .eq('id', id)
    .eq('org_id', orgId)
    .single()

  if (fetchError || !integration) return fail(c, 'Integration not found', 404, { code: 'NOT_FOUND' })
  if (integration.status !== 'connected') {
    return fail(c, 'Integration is not connected', 404, { code: 'NOT_CONNECTED' })
  }

  // Continuation #104 (2026-05-12) — runtime safety hardening on the
  // in-progress sync lookup. Pre-fix: (a) `error` was discarded — a DB
  // lookup failure (network/RLS/schema) silently returned `data=null`
  // and the code treated it as "no in-progress sync" → ALLOWED a
  // duplicate Inngest queue. False-negative safety hole when the
  // dedupe path is the most critical (it's the ONLY thing preventing
  // duplicate sync work). Now: capture error + throw → errorHandler
  // emits sanitized 500 with request_id (CONSTITUTION §3 "Fail Loudly").
  // (b) `.maybeSingle()` errors PGRST116 if 2+ rows exist (pre-existing
  // duplicate in_progress rows from a prior bug). Switched to
  // .limit(1) array select — backfill-safe, mirrors the #101 pattern.
  const { data: inProgressRows, error: inProgressErr } = await supabaseAdmin
    .from('sync_logs')
    .select('id')
    .eq('integration_id', id)
    .eq('status', 'in_progress')
    .limit(1)

  if (inProgressErr) {
    throw new Error(`integrations sync: in_progress lookup failed: ${inProgressErr.message}`)
  }
  if (inProgressRows && inProgressRows.length > 0) {
    return fail(c, 'A sync is already in progress for this integration', 409, { code: 'SYNC_IN_PROGRESS' })
  }

  const result = await inngest.send({
    name: 'integration/sync.requested',
    data: { integrationId: id, orgId },
  })

  return ok(c, { jobId: result.ids[0] ?? id, message: 'Sync queued' }, 202)
})

// GET /api/v1/integrations/:id/sync-logs
integrationsRouter.get('/:id/sync-logs', async (c) => {
  const orgId = c.get('orgId')
  const id = c.req.param('id')
  const limit = Math.min(Number(c.req.query('limit') ?? '20'), 100)
  const offset = Number(c.req.query('offset') ?? '0')

  const { data: integration, error: fetchError } = await supabaseAdmin
    .from('integrations')
    .select('id')
    .eq('id', id)
    .eq('org_id', orgId)
    .single()

  if (fetchError || !integration) return fail(c, 'Integration not found', 404, { code: 'NOT_FOUND' })

  const { data, error } = await supabaseAdmin
    .from('sync_logs')
    .select('id, started_at, completed_at, status, records_written, error_message')
    .eq('integration_id', id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    throw new Error(`sync_logs lookup failed: ${error.message}`)
  }

  return ok(c, (data ?? []).map((row) => ({
    id: row.id,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    status: row.status,
    recordsWritten: row.records_written,
    errorMessage: row.error_message,
  })))
})
