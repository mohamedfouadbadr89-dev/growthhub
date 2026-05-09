import { createMiddleware } from 'hono/factory'
import { verifyToken } from '@clerk/backend'
import { supabaseAdmin } from '../lib/supabase.js'
import { fail } from '../utils/response.js'

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
  // requestId is populated by tracingMiddleware (mounted at app level in
  // index.ts) and is in scope before authMiddleware runs. Declaring it
  // in Variables makes c.get('requestId') type-safe so the [auth] stdout
  // emissions below can join the established `request_id=` correlator
  // chain ([req] / [err] / [exec] / [AI] / [clerk-webhook]) without an
  // `as never` cast at every call site.
  Variables: { userId: string; orgId: string; requestId: string }
}>(async (c, next) => {
  // Capture request_id once for the entire middleware lifecycle. Threading
  // it through every stdout emission below brings the [auth] surface in
  // line with the [req] / [err] / [exec] / [AI] / [clerk-webhook] envelopes
  // (all hardened in prior turns) — single grep on a request_id pivots
  // across every log line that an authenticated request produced.
  const request_id = c.get('requestId')
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    // Phase 1 envelope (utils/response.ts): canonical { success:false,
    // error:{ message, code }, request_id }. Replaces the legacy
    // { error, message } shape; tracingMiddleware has already minted
    // request_id by the time this rejection fires, so the helper can
    // populate it and the X-Request-ID header still correlates.
    return fail(c, 'Missing or invalid authentication token', 401, { code: 'UNAUTHORIZED' })
  }

  const token = authHeader.slice(7)
  try {
    const payload = (await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    })) as unknown as ClerkSessionPayload

    const userId = payload.sub
    const orgId = payload.org_id ?? payload.o?.id

    if (!orgId) {
      return fail(c, 'User has no organization assigned', 403, { code: 'FORBIDDEN' })
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

      // Phase 1 audit-column population — `created_by` recorded as the
      // first user who authenticated for this org via JIT (the Clerk
      // webhook is the canonical authoritative path; JIT is the
      // best-effort fallback per CLAUDE.md "JIT auto-provision" comment
      // above). `ignoreDuplicates: true` means existing rows are not
      // overwritten — so `created_by` only lands on rows the JIT path
      // genuinely creates, never on rows the webhook already provisioned.
      //
      // Phase 7 Sub-pass D Part C (continuation #21, 2026-05-09): the
      // `.select()` post-upsert returns the inserted row(s) when a NEW
      // org row was created and an empty array when the org already
      // existed. This lets us trigger a one-time `grant_credits` RPC
      // ONLY on first creation — never on every subsequent JIT-bound
      // login, never on rows already provisioned by the Clerk webhook.
      const { data: insertedOrgs, error: orgErr } = await supabaseAdmin
        .from('organizations')
        .upsert(
          { org_id: orgId, name: orgName, created_by: userId },
          { onConflict: 'org_id', ignoreDuplicates: true }
        )
        .select('org_id')
      if (orgErr) {
        console.error(`[auth] request_id=${request_id} JIT org upsert failed: ${orgErr.message}`)
        return fail(c, 'auth provision failed', 500, { code: 'AUTH_PROVISION_FAILED' })
      }

      // Phase 7 Sub-pass D Part C: one-time initial credits grant.
      // Fire-and-forget — failure of the grant MUST NOT fail the auth
      // provision (the org row is already created; the user can still
      // sign in; operator can grant credits manually if this RPC errors).
      // Amount is configurable via INITIAL_ORG_CREDITS_GRANT (default 100);
      // set to '0' to disable. Audit row is appended to credits_ledger
      // atomically inside the grant_credits RPC (continuation #18 substrate).
      if ((insertedOrgs ?? []).length > 0) {
        const initialGrantRaw = process.env.INITIAL_ORG_CREDITS_GRANT ?? '100'
        const initialGrant = parseInt(initialGrantRaw, 10)
        if (Number.isFinite(initialGrant) && initialGrant > 0) {
          await supabaseAdmin
            .rpc('grant_credits', {
              p_org_id: orgId,
              p_amount: initialGrant,
              p_reason: 'initial_grant',
              p_ref_type: 'jit_auto_provision',
              p_ref_id: null,
            })
            .then(
              () => null,
              (grantErr) => {
                console.error(
                  `[auth] request_id=${request_id} JIT initial grant_credits failed for org=${orgId}: ${(grantErr as Error)?.message ?? 'unknown'}`,
                )
              },
            )
        }
      }

      const { data: existingUser, error: lookupErr } = await supabaseAdmin
        .from('users')
        .select('id, org_id')
        .eq('clerk_id', userId)
        .maybeSingle()
      if (lookupErr) {
        console.error(`[auth] request_id=${request_id} JIT user lookup failed: ${lookupErr.message}`)
        return fail(c, 'auth provision failed', 500, { code: 'AUTH_PROVISION_FAILED' })
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

        // Phase 1 audit-column population — for the JIT path the user
        // self-creates their own row at first authentication, so
        // created_by === clerk_id. The Clerk webhook handler (canonical
        // path) records the same identity from the membership event.
        const { error: insertErr } = await supabaseAdmin
          .from('users')
          .insert({ clerk_id: userId, org_id: orgId, email, role, created_by: userId })
        if (insertErr) {
          // Race-safe: another concurrent first-request may have inserted
          // the same clerk_id between our SELECT and INSERT. Treat unique
          // violation as success and continue.
          const code = (insertErr as { code?: string }).code
          if (code !== '23505') {
            console.error(`[auth] request_id=${request_id} JIT user insert failed: ${insertErr.message}`)
            // Canonical Phase 1 envelope (utils/response.ts). Pre-fix this
            // path emitted the legacy `{ error: 'Internal', message }` shape
            // — the only same-function asymmetry left after the org-upsert
            // and user-lookup branches above were migrated to fail() in
            // prior turns. Aligning the four auth-provision-failure paths
            // to a single envelope restores body-level request_id and
            // exposes `error.code === 'AUTH_PROVISION_FAILED'` uniformly,
            // so the discriminator is coherent for all auth-provision
            // failure modes (CONSTITUTION §3 "Fail Loudly" + the
            // request_id correlator-chain invariant).
            return fail(c, 'auth provision failed', 500, { code: 'AUTH_PROVISION_FAILED' })
          }
        }
      } else if (existingUser.org_id !== orgId) {
        // User switched orgs in Clerk — keep the FK in sync; preserve
        // email/role exactly (do NOT overwrite with placeholders).
        // Phase 1 audit-column population — re-stamp updated_by on every
        // org-switch sync. `created_by` is preserved (partial UPDATE).
        const { error: updateErr } = await supabaseAdmin
          .from('users')
          .update({ org_id: orgId, updated_by: userId })
          .eq('clerk_id', userId)
        if (updateErr) {
          console.error(`[auth] request_id=${request_id} JIT user org update failed: ${updateErr.message}`)
          // Same canonical-envelope rationale as the JIT user insert
          // failure branch above — see comment there for full context.
          return fail(c, 'auth provision failed', 500, { code: 'AUTH_PROVISION_FAILED' })
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
      `[auth] request_id=${request_id} verifyToken failed: name=${e?.name} message=${e?.message}`,
    )
    return fail(c, 'Missing or invalid authentication token', 401, { code: 'UNAUTHORIZED' })
  }
})
