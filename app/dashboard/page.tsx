import { redirect } from "next/navigation";

// Continuation #53 (2026-05-12) — root `/dashboard` route. Previously
// missing — bare /dashboard returned 404. Canonical dashboard landing
// page is `/dashboard/overview` per CLAUDE.md §5 routing map (also the
// Clerk `AFTER_SIGN_IN_URL` per §10 env). Server-side redirect is the
// cheapest fix; matches the `app/automation/page.tsx` pattern that
// redirects to /dashboard/automation/decision-center.
export default function DashboardRedirect() {
  redirect("/dashboard/overview");
}
