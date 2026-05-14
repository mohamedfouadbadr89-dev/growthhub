import { redirect } from "next/navigation";

// Continuation #108 (2026-05-13) — drift cleanup mirroring #53/#86 pattern.
// Pre-fix: this route rendered a 368-line mock-shell duplicating the
// canonical decision-history surface at `/automation/history`. Operators
// landing here from older nav links saw stale MOCK_HISTORY data with no
// connection to the real automation_runs / decision_history pipeline.
// Now: server-side redirect to the canonical surface — single source of
// truth, zero mock drift, matches the closed `/dashboard` (#53) and
// `/automation` (#86) redirect patterns. Removes a parallel concept that
// confused operators about which history view was authoritative.
export default function DecisionsHistoryRedirect() {
  redirect("/automation/history");
}
