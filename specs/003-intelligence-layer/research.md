# Research: Intelligence Layer — AI Decision Engine

## Decision 1: OpenRouter SDK Integration

**Decision**: Use the `openai` npm package (`openai@^4`) pointed at `https://openrouter.ai/api/v1` as a custom base URL. Do NOT install a separate `@openrouter/sdk` package.

**Rationale**: OpenRouter is fully OpenAI-API-compatible. The `openai` npm package's `OpenAI` client accepts a `baseURL` constructor option, requiring zero abstraction overhead. This keeps dependencies minimal and the pattern identical to calling OpenAI directly — important since the codebase may later switch providers.

**Required headers**: `Authorization: Bearer <key>` (standard), plus `HTTP-Referer: https://growthhub.app` and `X-Title: GrowthHub` for OpenRouter analytics attribution.

**Default model**: `google/gemini-2.0-flash-001` — sub-cent per call for 200-word explanations, consistently available, no waitlist. Configurable via `OPENROUTER_DEFAULT_MODEL` env var.

**BYOK path**: For `ltd` users, retrieve their stored key from Supabase Vault, instantiate a fresh `OpenAI` client per request with that key. Platform key never used.

**Alternatives considered**:
- `@openrouter/sdk` — introduces a dedicated dep for functionality the `openai` package already provides
- `anthropic` SDK — can't target OpenRouter's multi-model endpoint

---

## Decision 2: Anomaly Detection Algorithm

**Decision**: Compute rolling statistics using a single PostgreSQL query with window functions, not in-memory JavaScript loops.

**Rationale**: For orgs with 90 days × hundreds of campaigns, pulling all rows into Node.js memory is wasteful. A single SQL query with `AVG(metric) OVER (PARTITION BY campaign_id ORDER BY date ROWS BETWEEN 7 PRECEDING AND 1 PRECEDING)` returns pre-computed baselines per row. The backend receives only the anomaly candidates, not the full dataset.

**Query pattern**:
```sql
WITH rolling AS (
  SELECT
    campaign_id, platform, ad_account_id, date,
    roas, spend, conversions,
    AVG(roas)         OVER w AS roas_avg_7d,
    AVG(spend)        OVER w AS spend_avg_7d,
    AVG(conversions)  OVER w AS conv_avg_7d,
    COUNT(*)          OVER w AS data_points
  FROM campaign_metrics
  WHERE org_id = $orgId AND date >= now() - INTERVAL '30 days'
  WINDOW w AS (PARTITION BY campaign_id ORDER BY date ROWS BETWEEN 7 PRECEDING AND 1 PRECEDING)
),
latest AS (
  SELECT DISTINCT ON (campaign_id) * FROM rolling ORDER BY campaign_id, date DESC
)
SELECT * FROM latest WHERE data_points >= 3
```

**Anomaly thresholds** (from spec):
- ROAS_DROP: `roas < roas_avg_7d * 0.70` (30%+ below 7d avg)
- SPEND_SPIKE: `spend > spend_avg_7d * 3.0` (3× the 7d avg)
- CONVERSION_DROP: `conversions < conv_avg_7d * 0.60` (40%+ below 7d avg)
- SCALING_OPPORTUNITY: `roas > 3.5` for 5+ consecutive days (separate streak query)

**Alternatives considered**:
- Z-score normalization — more sophisticated but harder to explain to users; spec defines fixed thresholds
- Moving to a dedicated analytics DB — premature for Phase 3 scale

---

## Decision 3: Credit Deduction — Atomic Pattern

**Decision**: Add `credits_balance INTEGER NOT NULL DEFAULT 1000` to the `organizations` table. Deduct credits using a PostgreSQL `UPDATE ... RETURNING` that checks the balance atomically in a single statement: `UPDATE organizations SET credits_balance = credits_balance - 1 WHERE org_id = $1 AND credits_balance >= 1 AND plan_type = 'subscription' RETURNING credits_balance`. If the row count is 0, credits were insufficient.

**Rationale**: No advisory locks, no race conditions, no separate credits table to join. The atomic `WHERE credits_balance >= 1` prevents negative balances. The `plan_type = 'subscription'` guard ensures the query never deducts from `ltd` orgs even if called erroneously.

**Credit cost**: 1 credit per AI explanation generated (spec FR-008). Rule-based detection costs 0 credits.

**Zero-credit behavior**: Rule-based anomaly data is saved (type, trigger, data snapshot, recommended action). AI explanation field is set to `null` with a `ai_status` column set to `'credits_exhausted'`. Decision record still appears on the UI with a "Add credits to see AI analysis" prompt.

**Alternatives considered**:
- Separate `credits` table with debit rows — more auditable but adds a join on every AI call; Phase 7 billing phase can migrate to this
- Redis decrement — adds infrastructure; Supabase atomic update is sufficient

---

## Decision 4: Inngest Event-Driven Trigger

**Decision**: Extend Phase 2's `syncIntegration` Inngest function to send an `intelligence/decisions.requested` event after successful sync. Add a new `generateDecisions` Inngest function triggered by this event. Manual refresh from the API sends the same event with an `idempotency` key set to `${orgId}-${Date.now()}` to prevent duplicate queuing.

**Rationale**: Event-driven chaining keeps sync and intelligence decoupled. The manual refresh path reuses the same job function. Inngest handles deduplication naturally if the same event key is submitted within its dedup window.

**Duplicate run prevention**: Insert a `decision_runs` row with status `in_progress` before starting; use a Supabase unique constraint `UNIQUE (org_id, status) WHERE status = 'in_progress'` (partial index) to block concurrent runs. If insert fails with conflict → return 409. On job completion/failure, update status to `completed` or `failed`.

**Alternatives considered**:
- Separate cron job for decision generation — creates a separate execution path from manual refresh; event-driven reuse is cleaner
- In-process call from sync function — couples sync latency to AI generation latency; Inngest isolation is better

---

## Decision 5: Decision Priority Scoring

**Decision**: `priority_score = severity_weight × (confidence_score / 100)` where severity weights are: `ROAS_DROP = 90`, `CONVERSION_DROP = 85`, `SPEND_SPIKE = 70`, `SCALING_OPPORTUNITY = 40`.

**Rationale**: ROAS drops and conversion drops are the most impactful negative signals (direct revenue risk). Spend spikes are important but may be intentional. Scaling opportunities are positive signals with lower urgency. The confidence multiplier (0–1) scales each score proportionally.

**Confidence score calculation**:
- Base: `100 - (delta_percentage × 0.5)` capped at 100
- Boost: +10 if data_points ≥ 7 (more history = more confidence)
- Boost: +5 if the anomaly persists for 2+ consecutive days
- Result: integer 0–100

**Alternatives considered**:
- Machine learning ranking — not appropriate for Phase 3; heuristic is explainable and adjustable
- User-configurable weights — deferred to future phase

---

## Decision 6: AI Prompt Design

**Decision**: Use a structured system prompt + single user message per decision. Keep completion to ~150 words. Ask the model to produce: (1) plain-English explanation, (2) confidence rationale, (3) recommended action.

**Prompt template**:
```
System: You are a performance marketing analyst. Be concise and direct. 
Respond in valid JSON with keys: explanation (string), confidence_rationale (string), recommended_action (string).

User: Campaign "[name]" on [platform] shows [anomaly_type].
Trigger: [trigger_description]
Data: [data_snapshot_json]
Generate a brief analyst explanation (2-3 sentences), a one-sentence confidence rationale, and a specific recommended action.
```

**Model**: `google/gemini-2.0-flash-001` (default). Configurable via env var.

**Alternatives considered**:
- Streaming responses — unnecessary for background job context
- Tool use / function calling — adds latency and complexity for a simple text generation task
