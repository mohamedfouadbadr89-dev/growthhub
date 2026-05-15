/**
 * Phase Ω.8A.1 — Slack incoming-webhook HTTP wrapper.
 *
 * v1 connection model (per ACTION_ECOSYSTEM_PLAN.md §10 risk register):
 * per-org Slack INCOMING WEBHOOK URL only. NO bot token, NO Slack OAuth,
 * NO `chat.postMessage` API. The webhook URL itself binds the destination
 * channel — it is chosen by the operator when they create the webhook in
 * their Slack workspace.
 *
 * Credential storage: the webhook URL is a single-value non-OAuth secret.
 * It lives in Supabase Vault, referenced by `integrations.provider_secret_id`
 * (NEVER stored raw in a DB column). The action handler resolves it through
 * `shape-registry.ts` `assertCredentialShape()` + `readSecret()`.
 *
 * This module is a thin HTTP wrapper: URL-shape validation + the POST.
 * It performs NO Vault access and NO DB access — the handler owns those.
 */

/** Slack incoming webhooks are always served from this host + path prefix. */
const SLACK_WEBHOOK_PREFIX = "https://hooks.slack.com/services/"

/**
 * Validate that a string is a well-formed Slack incoming-webhook URL.
 *
 * Slack incoming webhooks are ALWAYS `https://hooks.slack.com/services/...`.
 * Rejecting anything else is a defense-in-depth guard: it prevents a
 * misconfigured / tampered Vault secret from turning the handler into a
 * generic outbound-POST primitive against an arbitrary host (SSRF surface).
 */
export function isValidSlackWebhookUrl(url: unknown): url is string {
  return (
    typeof url === "string" &&
    url.startsWith(SLACK_WEBHOOK_PREFIX) &&
    // Reject the bare prefix — a real webhook has the per-workspace path.
    url.length > SLACK_WEBHOOK_PREFIX.length
  )
}

export interface SlackPostResult {
  /** True iff Slack accepted the post (HTTP 200 + literal "ok" body). */
  ok: boolean
  /** HTTP status code from the webhook response. */
  http_status: number
  /**
   * Slack's response body, trimmed. On success this is the literal "ok";
   * on failure it carries Slack's diagnostic (e.g. "no_text", "invalid_payload").
   * Safe to record in the audit row — it never contains the webhook URL.
   */
  body: string
}

/**
 * POST a plain-text message to a Slack incoming webhook.
 *
 * The payload is the minimal `{ text }` shape — NO Block Kit, NO attachments,
 * NO markdown directives. `text` is sent verbatim; the caller is responsible
 * for having sanitized it.
 *
 * Throws ONLY on transport failure (DNS, connection reset, fetch rejection).
 * An HTTP-level Slack error (non-200) is returned as `{ ok: false, ... }` so
 * the handler can record it on the audit row rather than crash.
 *
 * @param webhookUrl  A validated Slack incoming-webhook URL (caller MUST have
 *                    passed it through `isValidSlackWebhookUrl` first).
 * @param text        The message body. Sent verbatim as `{ text }`.
 */
export async function postToSlackWebhook(
  webhookUrl: string,
  text: string,
): Promise<SlackPostResult> {
  const resp = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  })
  const body = (await resp.text().catch(() => "")).trim()
  // Slack incoming webhooks reply HTTP 200 with the literal body "ok" on
  // success; any other status / body is a failure.
  return {
    ok: resp.ok && body === "ok",
    http_status: resp.status,
    body,
  }
}
