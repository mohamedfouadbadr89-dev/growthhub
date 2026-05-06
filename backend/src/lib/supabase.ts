import { createClient } from '@supabase/supabase-js'

/**
 * Supabase service-role client.
 *
 * SOURCE OF TRUTH:
 *  - CONSTITUTION.md §3 "Fail Loudly" — misconfiguration at startup MUST
 *    surface at startup, never silently degrade to a broken client.
 *  - CLAUDE.md §3 "service_role_key lives on Backend only — never exposed
 *    to frontend".
 *
 * Behavior change vs. prior version: previously this module fell back to
 * `https://placeholder.supabase.co` / `placeholder-key` when env was unset,
 * letting the server boot with a fake client. Every subsequent DB call
 * then surfaced cryptic supabase-js DNS/network errors to end-users
 * instead of a clear startup failure. That fallback is removed.
 *
 * Effect of the throw below:
 *  - 20+ files import from this module (auth middleware, every route,
 *    every service, every Inngest job). ES module loading is synchronous,
 *    so a missing env var here aborts module evaluation BEFORE
 *    `serve()` is reached, BEFORE Inngest registers any cron, BEFORE
 *    any route is mounted. There is no "partial boot" with this module
 *    in a broken state.
 */

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  const missing = [
    !supabaseUrl ? 'SUPABASE_URL' : null,
    !supabaseKey ? 'SUPABASE_SERVICE_ROLE_KEY' : null,
  ].filter((v): v is string => v !== null)
  throw new Error(
    `[STARTUP][FATAL] Missing required Supabase env var(s): ${missing.join(', ')}. ` +
      `Set them in backend/.env (see backend/.env.example) or your deploy environment.`,
  )
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseKey)
