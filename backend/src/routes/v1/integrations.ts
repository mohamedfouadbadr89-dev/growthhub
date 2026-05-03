import { Hono } from 'hono'
import { supabaseAdmin } from '../../lib/supabase.js'
import { deleteSecret } from '../../lib/vault.js'
import { inngest } from '../../jobs/inngest.js'

type Variables = { userId: string; orgId: string }
export const integrationsRouter = new Hono<{ Variables: Variables }>()

// GET /api/v1/integrations
integrationsRouter.get('/', async (c) => {
  const orgId = c.get('orgId')

  const { data, error } = await supabaseAdmin
    .from('integrations')
    .select('id, platform, status, last_synced_at, created_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  if (error) return c.json({ error: 'Internal Server Error' }, 500)

  return c.json(
    (data ?? []).map((row) => ({
      id: row.id,
      platform: row.platform,
      status: row.status,
      lastSyncedAt: row.last_synced_at,
      createdAt: row.created_at,
    }))
  )
})

// DELETE /api/v1/integrations/:id
integrationsRouter.delete('/:id', async (c) => {
  const orgId = c.get('orgId')
  const id = c.req.param('id')

  const { data: integration, error: fetchError } = await supabaseAdmin
    .from('integrations')
    .select('id, vault_refresh_token_secret_id')
    .eq('id', id)
    .eq('org_id', orgId)
    .single()

  if (fetchError || !integration) return c.json({ error: 'Not Found' }, 404)

  if (integration.vault_refresh_token_secret_id) {
    try {
      await deleteSecret(integration.vault_refresh_token_secret_id as string)
    } catch (err) {
      console.error('Failed to delete Vault secret:', err)
    }
  }

  const { error } = await supabaseAdmin
    .from('integrations')
    .update({ status: 'disconnected', vault_refresh_token_secret_id: null })
    .eq('id', id)
    .eq('org_id', orgId)

  if (error) return c.json({ error: 'Internal Server Error' }, 500)

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

  if (fetchError || !integration) return c.json({ error: 'Not Found' }, 404)
  if (integration.status !== 'connected') {
    return c.json({ error: 'Not Found', message: 'Integration is not connected' }, 404)
  }

  const { data: inProgress } = await supabaseAdmin
    .from('sync_logs')
    .select('id')
    .eq('integration_id', id)
    .eq('status', 'in_progress')
    .maybeSingle()

  if (inProgress) {
    return c.json({ error: 'Conflict', message: 'A sync is already in progress for this integration' }, 409)
  }

  const result = await inngest.send({
    name: 'integration/sync.requested',
    data: { integrationId: id, orgId },
  })

  return c.json({ jobId: result.ids[0] ?? id, message: 'Sync queued' }, 202)
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

  if (fetchError || !integration) return c.json({ error: 'Not Found' }, 404)

  const { data, error } = await supabaseAdmin
    .from('sync_logs')
    .select('id, started_at, completed_at, status, records_written, error_message')
    .eq('integration_id', id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return c.json({ error: 'Internal Server Error' }, 500)

  return c.json(
    (data ?? []).map((row) => ({
      id: row.id,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      status: row.status,
      recordsWritten: row.records_written,
      errorMessage: row.error_message,
    }))
  )
})
