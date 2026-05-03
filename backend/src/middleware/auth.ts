console.log('🔥🔥🔥 AUTH FILE IS RUNNING 🔥🔥🔥');
import { createMiddleware } from 'hono/factory'
import { verifyToken } from '@clerk/backend'
import { supabaseAdmin } from '../lib/supabase.js'

/**
 * Clerk session-token payload shape we read from. Only the claims we
 * actually consume are typed — the rest is ignored. We avoid `any` so
 * the read sites are explicit (CONSTITUTION §7).
 */
interface ClerkSessionPayload {
  sub: string
  org_id?: string
  o?: { id?: string; slg?: string; rol?: string }
  email?: string
  role?: string
}

export const authMiddleware = createMiddleware<{
  Variables: { userId: string; orgId: string }
}>(async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json(
      { error: 'Unauthorized', message: 'Missing or invalid authentication token' },
      401
    )
  }

  const token = authHeader.slice(7)
  try {
    const payload = (await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    })) as unknown as ClerkSessionPayload

    const userId = payload.sub
    const orgId = payload.org_id ?? payload.o?.id

    if (!orgId) {
      return c.json(
        { error: 'Forbidden', message: 'User has no organization assigned' },
        403
      )
    }

    // ── JIT auto-provision (Clerk → DB) ─────────────────────────────────
    //
    // Inputs come ONLY from the verified JWT payload — never from the
    // request body. service_role bypasses RLS by design (CLAUDE.md §3
    // "service_role_key lives on Backend only").
    //
    // organizations: insert if missing; never overwrite an existing name
    //                that may have been set by a webhook or admin.
    //
    // users: insert if missing (with placeholder email/role only when
    //        the JWT carries no claim); update org_id only on existing
    //        rows so a real email/role from prior `organizationMembership.created`
    //        is NEVER clobbered by JIT placeholders.
    //
    // Errors fail loud (500) per CONSTITUTION §3 — they do not bypass
    // auth, do not silently 200, and surface to the existing errorHandler.
    {
      const orgName =
        typeof payload.o?.slg === 'string' && payload.o.slg.length > 0
          ? payload.o.slg
          : orgId

      const { error: orgErr } = await supabaseAdmin
        .from('organizations')
        .upsert(
          { org_id: orgId, name: orgName },
          { onConflict: 'org_id', ignoreDuplicates: true }
        )
      if (orgErr) {
        console.error(`[auth] JIT org upsert failed: ${orgErr.message}`)
        return c.json(
          { error: 'Internal', message: 'auth provision failed' },
          500
        )
      }

      const { data: existingUser, error: lookupErr } = await supabaseAdmin
        .from('users')
        .select('id, org_id')
        .eq('clerk_id', userId)
        .maybeSingle()
      if (lookupErr) {
        console.error(`[auth] JIT user lookup failed: ${lookupErr.message}`)
        return c.json(
          { error: 'Internal', message: 'auth provision failed' },
          500
        )
      }

      if (!existingUser) {
        const jwtEmail = payload.email
        const email =
          typeof jwtEmail === 'string' && jwtEmail.length > 0
            ? jwtEmail
            : `${userId}@placeholder.local`

        // Clerk roles arrive as "org:admin" / "org:member"; strip prefix.
        // Default to 'admin' (matches existing seeded rows + webhook handler).
        let role = 'admin'
        const rawRole =
          typeof payload.role === 'string'
            ? payload.role
            : typeof payload.o?.rol === 'string'
              ? payload.o.rol
              : null
        if (rawRole) {
          const stripped = rawRole.replace(/^org:/, '')
          if (stripped === 'admin' || stripped === 'member') role = stripped
        }

        const { error: insertErr } = await supabaseAdmin
          .from('users')
          .insert({ clerk_id: userId, org_id: orgId, email, role })
        if (insertErr) {
          // Race-safe: another concurrent first-request may have inserted
          // the same clerk_id between our SELECT and INSERT. Treat unique
          // violation as success and continue.
          const code = (insertErr as { code?: string }).code
          if (code !== '23505') {
            console.error(`[auth] JIT user insert failed: ${insertErr.message}`)
            return c.json(
              { error: 'Internal', message: 'auth provision failed' },
              500
            )
          }
        }
      } else if (existingUser.org_id !== orgId) {
        // User switched orgs in Clerk — keep the FK in sync; preserve
        // email/role exactly (do NOT overwrite with placeholders).
        const { error: updateErr } = await supabaseAdmin
          .from('users')
          .update({ org_id: orgId })
          .eq('clerk_id', userId)
        if (updateErr) {
          console.error(`[auth] JIT user org update failed: ${updateErr.message}`)
          return c.json(
            { error: 'Internal', message: 'auth provision failed' },
            500
          )
        }
      }
      // else: user exists with matching org_id — no DB write.
    }
    // ── /JIT auto-provision ──────────────────────────────────────────────

    c.set('userId', userId)
    c.set('orgId', orgId)
    await next()
  } catch (err) {
    // Diagnostic: surface the actual reason verifyToken rejected the JWT.
    // Without this, the 401 looks identical whether the cause is an
    // expired token, a key/instance mismatch, a JWKS fetch failure, or a
    // signature error — the audit trail must distinguish them.
    // CONSTITUTION §3 "Fail Loudly" + Phase 0 patch (centralized logging).
    const e = err as Error
    console.error(
      `[auth] verifyToken failed: name=${e?.name} message=${e?.message}`,
    )
    return c.json(
      { error: 'Unauthorized', message: 'Missing or invalid authentication token' },
      401
    )
  }
})
