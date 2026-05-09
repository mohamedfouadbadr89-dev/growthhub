import Stripe from 'stripe'

/**
 * Stripe SDK thin wrapper — Phase 7 Sub-pass D (continuation #21).
 *
 * SOURCE OF TRUTH:
 *   - CLAUDE.md TECH STACK — "Payments | Stripe"
 *   - Phases.md §Phase 7 — monetization backend
 *   - SYSTEM_CONTROL.md — A1c authorization scope already wired the inbound
 *     webhook receive surface; this pass adds the outbound API surface
 *     (Checkout Session creation, Customer Portal session creation)
 *
 * BOUNDARY:
 *   - Single shared Stripe client instance (constructed lazily on first
 *     access — defers env validation to request time, matching the Phase 2
 *     OAuth env runtime-check pattern; does NOT fail backend startup if
 *     STRIPE_SECRET_KEY is absent in dev).
 *   - NO outbound retry layer, NO event-bus, NO billing abstraction.
 *   - Routes that need Stripe import `getStripeClient()` and call directly
 *     against `stripe.checkout.sessions.create` / `stripe.billingPortal
 *     .sessions.create` — minimal SDK usage; no provider-unification
 *     framework.
 */

let cached: Stripe | null = null

export function getStripeClient(): Stripe {
  if (cached) return cached
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    // Per CONSTITUTION §3 "Fail Loudly". The runtime check here is the
    // sole gate; routes that consume the client will surface this as a
    // canonical 500 envelope to the caller.
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  // Pin a major API version so a future Stripe SDK upgrade does not
  // silently change wire shapes. Operator can review and re-pin during
  // SDK upgrade passes. The Stripe type for `apiVersion` is a strict
  // string-literal union; we cast through `as never` so future SDK
  // versions don't break this type-check while preserving the runtime
  // pin.
  cached = new Stripe(key, {
    apiVersion: '2024-12-18.acacia' as never,
  })
  return cached
}
