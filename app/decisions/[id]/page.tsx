import { redirect } from "next/navigation";

// Continuation #119 (2026-05-14) — Phase β Decisions surface repair per
// `specs/operator-intelligence.md` (D, page mapping) + `specs/ai-operator-center.md`.
// Pre-fix: this route fetched the 503-gated legacy `/api/v1/decisions/:id`
// endpoint (#61 surfaced the 503 as an actionable error, but the page was
// still inert) and rendered against the legacy `decisions` table shape with
// fields like `trigger_condition`, `data_snapshot`, `recommended_action`,
// `priority_score`, `ai_status` that DO NOT EXIST on the canonical
// `ai_decisions` table. It also carried a hardcoded `DECISION_ACTION_MAP`
// of fictional UUIDs (audit item #4, dormant defect) that would have
// failed at execute if Phase 3 ever unlocked.
//
// Phase β fix: redirect to the new canonical AI decision deep view at
// `/operator/ai/:decision_id` which consumes the additive read-only
// `GET /api/v1/ai/decisions/:id` endpoint (this turn). Single source of
// truth, zero legacy-schema dependence, no fictional UUIDs.
//
// Matches the closed #108 / #109 drift-cleanup redirect pattern. The
// Phase 3 anomaly engine + legacy `/decisions/*` router remain DEFERRED
// per SYSTEM_CONTROL.md — this redirect explicitly does NOT reactivate
// them.

export default async function DecisionDetailRedirect({
  params,
}: {
  // Next.js 16 delivers dynamic-route `params` as a Promise to Server
  // Components — await it. Reading `params.id` synchronously yielded
  // `undefined`, producing a redirect to `/operator/ai/undefined`.
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/operator/ai/${id}`);
}
