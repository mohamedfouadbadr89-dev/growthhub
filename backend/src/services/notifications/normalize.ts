/**
 * Phase Ω.8A.1 — deterministic email-digest normalization pipeline.
 *
 * PURPOSE
 *   `email.send_digest` accepts an operator/AI-supplied STRUCTURED digest
 *   object. Before it reaches Resend it MUST be flattened into a single
 *   plain-text body. `normalizeForEmail()` is that flattening — and it is
 *   deliberately DETERMINISTIC and PURE:
 *
 *     - same input  → byte-identical output, always
 *     - no I/O, no env, no clock, no randomness
 *
 *   Determinism matters for the audit contract. The raw structured input is
 *   recorded verbatim in `decision_history.data_used.params`; the normalized
 *   text is recorded separately in `result_data.normalized_payload`. An
 *   operator can re-run this function on the raw input and reproduce exactly
 *   what was sent — raw and normalized never drift.
 *
 * OUTPUT IS text/plain ONLY. No HTML, no markdown rendering, no template
 * interpolation — every field is a sanitized literal string.
 *
 * SAFETY TRANSFORMS (applied to every string field)
 *   - line endings normalized (\r\n and \r → \n)
 *   - null bytes + C0/C1 control chars stripped (tab + newline preserved)
 *   - 3+ consecutive newlines collapsed to 2
 *   - 5+ consecutive spaces collapsed to 4
 *   - trimmed
 *   - per-field length cap, then a total-digest length cap — both applied
 *     Unicode-safely (code-point counted via Array.from), with an explicit
 *     `…[truncated]` marker so a clipped digest is never silently lossy.
 *
 * The function never throws on a malformed digest — unknown / wrong-typed
 * fields degrade to empty and are skipped. The handler decides whether an
 * empty result is a failure.
 */

/** Per-field maximum lengths, in Unicode code points. */
const MAX_LEN = {
  title: 200,
  subtitle: 300,
  heading: 200,
  body: 5000,
  metricLabel: 100,
  metricValue: 200,
} as const

/** Hard ceiling on the assembled digest body, in Unicode code points. */
export const TOTAL_DIGEST_CAP = 50_000

/** Appended whenever a field or the whole digest is clipped. */
const TRUNCATION_MARKER = "…[truncated]"

/** Code points kept even though they sit inside the C0 control block. */
const TAB = 9
const NEWLINE = 10

/** Structured digest input shapes. Fields are `unknown` — caller is untrusted. */
export interface EmailDigestMetric {
  label?: unknown
  value?: unknown
}

export interface EmailDigestSection {
  heading?: unknown
  body?: unknown
  metrics?: unknown
}

export interface EmailDigestInput {
  title?: unknown
  subtitle?: unknown
  sections?: unknown
}

export interface NormalizedEmail {
  /** The deterministic plain-text body, ready to hand to Resend as `text`. */
  text: string
  /** True iff ANY per-field cap OR the total cap clipped content. */
  truncated: boolean
  /** Code-point length of `text`. */
  total_chars: number
  /** Count of sections that produced any output. */
  sections_count: number
  /** Count of metric lines that produced any output. */
  metrics_count: number
}

/**
 * Drop control characters by code point. Removes C0 (0–31), DEL (127) and
 * C1 (128–159) — but deliberately keeps TAB (9) and NEWLINE (10). Implemented
 * as a numeric code-point scan so NO literal control byte appears in source.
 */
function stripControlChars(s: string): string {
  let out = ""
  for (const ch of s) {
    const cp = ch.codePointAt(0)
    if (cp === undefined) continue
    if (cp === TAB || cp === NEWLINE) {
      out += ch
      continue
    }
    // C0 block (0–31), DEL (127), C1 block (128–159) → drop.
    if (cp <= 31 || (cp >= 127 && cp <= 159)) continue
    out += ch
  }
  return out
}

/**
 * Sanitize one string field. Pure; never throws. Normalizes line endings,
 * strips control characters, collapses excessive whitespace, trims.
 */
function sanitize(raw: unknown): string {
  if (typeof raw !== "string") return ""
  // 1. Normalize line endings so a stray \r never survives into the body.
  let s = raw.replace(/\r\n?/g, "\n")
  // 2. Strip null bytes + C0 (except tab/newline) + DEL + C1 control chars.
  s = stripControlChars(s)
  // 3. Collapse excessive vertical whitespace (3+ newlines → 2).
  s = s.replace(/\n{3,}/g, "\n\n")
  // 4. Collapse excessive horizontal whitespace (5+ spaces → 4).
  s = s.replace(/ {5,}/g, "    ")
  // 5. Trim leading/trailing whitespace.
  return s.trim()
}

/**
 * Coerce a metric value (string OR finite number) to a sanitized string.
 * Non-finite numbers, booleans, objects → empty string.
 */
function coerceScalar(raw: unknown): string {
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? String(raw) : ""
  }
  return sanitize(raw)
}

/** Unicode-safe truncation to `max` code points with an explicit marker. */
function clip(value: string, max: number): { value: string; truncated: boolean } {
  const points = Array.from(value)
  if (points.length <= max) return { value, truncated: false }
  return {
    value: points.slice(0, max).join("") + TRUNCATION_MARKER,
    truncated: true,
  }
}

/**
 * Flatten a structured digest into a deterministic plain-text email body.
 *
 * @param input  Untrusted structured digest (operator- or AI-supplied).
 * @returns      The normalized body plus truncation + count metadata.
 */
export function normalizeForEmail(input: EmailDigestInput): NormalizedEmail {
  let truncated = false
  const blocks: string[] = []

  // ── Title ────────────────────────────────────────────────────────────────
  const titleClip = clip(sanitize(input?.title), MAX_LEN.title)
  truncated = truncated || titleClip.truncated
  if (titleClip.value) blocks.push(titleClip.value)

  // ── Subtitle ─────────────────────────────────────────────────────────────
  const subtitleClip = clip(sanitize(input?.subtitle), MAX_LEN.subtitle)
  truncated = truncated || subtitleClip.truncated
  if (subtitleClip.value) blocks.push(subtitleClip.value)

  // ── Sections ─────────────────────────────────────────────────────────────
  let sectionsCount = 0
  let metricsCount = 0
  const rawSections = Array.isArray(input?.sections) ? input.sections : []

  for (const rawSection of rawSections) {
    const section = (rawSection ?? {}) as EmailDigestSection
    const sectionLines: string[] = []

    const headingClip = clip(sanitize(section.heading), MAX_LEN.heading)
    truncated = truncated || headingClip.truncated
    if (headingClip.value) sectionLines.push(headingClip.value)

    const bodyClip = clip(sanitize(section.body), MAX_LEN.body)
    truncated = truncated || bodyClip.truncated
    if (bodyClip.value) sectionLines.push(bodyClip.value)

    const rawMetrics = Array.isArray(section.metrics) ? section.metrics : []
    for (const rawMetric of rawMetrics) {
      const metric = (rawMetric ?? {}) as EmailDigestMetric
      const labelClip = clip(sanitize(metric.label), MAX_LEN.metricLabel)
      const valueClip = clip(coerceScalar(metric.value), MAX_LEN.metricValue)
      truncated = truncated || labelClip.truncated || valueClip.truncated
      // A metric line needs at least one of label/value to be meaningful.
      if (labelClip.value || valueClip.value) {
        sectionLines.push(`  ${labelClip.value}: ${valueClip.value}`)
        metricsCount += 1
      }
    }

    if (sectionLines.length > 0) {
      blocks.push(sectionLines.join("\n"))
      sectionsCount += 1
    }
  }

  // ── Assemble + total cap ─────────────────────────────────────────────────
  // Blocks are joined with a blank line. The total cap is a final Unicode-safe
  // clip applied to the assembled body.
  let text = blocks.join("\n\n")
  const totalClip = clip(text, TOTAL_DIGEST_CAP)
  truncated = truncated || totalClip.truncated
  text = totalClip.value

  return {
    text,
    truncated,
    total_chars: Array.from(text).length,
    sections_count: sectionsCount,
    metrics_count: metricsCount,
  }
}
