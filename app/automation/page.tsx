import { redirect } from "next/navigation";

// Continuation #86 (2026-05-12) — root `/automation` redirect retargeted
// from `/dashboard/automation/decision-center` (mocked-shell page that
// expects a non-existent /api/v1/automation/decision-center endpoint) to
// `/automation/history` (real wired surface backed by Phase 4 Part 2
// `GET /api/v1/automation/runs`). Operators hitting `/automation` in
// the URL bar previously landed on a mocked dashboard that misrepresents
// the system; now they land on real automation run audit history. The
// Sidebar's "Decision Center" child link (#54) still points directly to
// the Stitch decision-center page for those who want to see the mocked
// visualization layout.
export default function AutomationRedirect() {
  redirect("/automation/history");
}