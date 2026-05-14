import { redirect } from "next/navigation";

// Continuation #109 (2026-05-13) — drift cleanup mirroring #108/#53/#86.
// Pre-fix: this route rendered a 334-line mock-shell catalog with
// hardcoded providers (Meta/Google/Shopify/TikTok/Snapchat/GA4) and
// fabricated API health metrics. The catalog included unsupported
// platforms — backend `connect.ts:55` only accepts ('meta','google',
// 'shopify') — and the connect/disconnect handlers were setTimeout
// simulations with no real `/connect/start` invocation. Operators
// arriving here from the sidebar saw fake "Connected" states that
// disagreed with `/integrations` (the canonical real-wired surface).
// Now: server-side redirect to `/integrations` which renders real
// connection state from `GET /integrations` and the real Connect CTA
// invokes `POST /connect/start` per #105 hardening. Single source of
// truth, zero mock drift. Removes a parallel concept that misrepresented
// runtime state.
export default function IntegrationsConnectRedirect() {
  redirect("/integrations");
}
