/**
 * Phase Ω.8A.1 — per-platform credential-shape registry.
 *
 * PURPOSE
 *   An `integrations` row carries a per-org credential as a Supabase Vault
 *   secret id. There are TWO credential columns:
 *
 *     - vault_refresh_token_secret_id : OAuth refresh token (meta/google/shopify)
 *     - provider_secret_id            : non-OAuth credential — currently the
 *                                       Slack incoming-webhook URL (slack)
 *
 *   Each platform owns EXACTLY ONE of those columns. A row that populates the
 *   wrong column — or both — is a credential-confusion bug: a Slack handler
 *   could otherwise read an OAuth refresh token, or a Meta handler a webhook
 *   URL. Either mistake leaks the wrong secret into the wrong provider call.
 *
 *   `assertCredentialShape()` is the handler-layer enforcement point. It runs
 *   BEFORE any handler resolves a Vault secret. It throws (Fail Loudly —
 *   CONSTITUTION §3) on any ownership violation, so a misconfigured row
 *   produces an audited `result='failed'` row rather than a wrong-secret call.
 *
 * This is enforcement code, NOT documentation. The migration
 * `20260515120000_phase_omega8_a1_actions_and_slack_platform.sql` documents
 * the same invariant in the `provider_secret_id` column comment; this module
 * makes it executable.
 *
 * Pure module: no I/O, no DB, no env. Safe to unit test in isolation.
 */

/** The two credential columns an `integrations` row may carry. */
export type CredentialColumn =
  | 'vault_refresh_token_secret_id'
  | 'provider_secret_id'

/**
 * Minimal shape of the `integrations` row fields this module inspects.
 * Callers pass the row as selected from the DB; extra columns are ignored.
 */
export interface IntegrationCredentialRow {
  platform: string
  vault_refresh_token_secret_id?: string | null
  provider_secret_id?: string | null
}

/**
 * Canonical per-platform credential ownership. Each platform maps to the
 * SINGLE `integrations` column that legitimately carries its credential.
 *
 * Adding a new connectable provider REQUIRES adding it here — an unlisted
 * platform throws `UNKNOWN_PLATFORM` rather than silently guessing a column.
 */
const CREDENTIAL_OWNERSHIP: Readonly<Record<string, CredentialColumn>> = {
  meta: 'vault_refresh_token_secret_id',
  google: 'vault_refresh_token_secret_id',
  shopify: 'vault_refresh_token_secret_id',
  slack: 'provider_secret_id',
}

/** Every credential column known to the schema — used for the cross-fill check. */
const ALL_CREDENTIAL_COLUMNS: readonly CredentialColumn[] = [
  'vault_refresh_token_secret_id',
  'provider_secret_id',
]

export interface AssertedCredential {
  /** The Vault secret id to resolve for this platform. */
  secretId: string
  /** Which column it came from — useful as `result_data.token_source` audit metadata. */
  column: CredentialColumn
}

function shapeError(message: string, code: string): Error & { code: string } {
  const err = new Error(message) as Error & { code: string }
  err.code = code
  return err
}

/**
 * Validate an `integrations` row against the credential-ownership registry
 * and return the Vault secret id the platform's handler must resolve.
 *
 * Throws (Fail Loudly) when:
 *   - the platform is not in the registry          → code 'UNKNOWN_PLATFORM'
 *   - the owning credential column is empty/NULL    → code 'CREDENTIAL_MISSING'
 *   - any NON-owning credential column is populated → code 'CREDENTIAL_SHAPE_VIOLATION'
 *
 * The thrown `code` bubbles into the canonical executor catch block and lands
 * on the `decision_history` row as `error_message`; the secret value itself is
 * never read, logged, or returned on the failure path.
 */
export function assertCredentialShape(
  row: IntegrationCredentialRow,
): AssertedCredential {
  const owningColumn = CREDENTIAL_OWNERSHIP[row.platform]
  if (!owningColumn) {
    throw shapeError(
      `assertCredentialShape: no credential-ownership rule for platform '${row.platform}'`,
      'UNKNOWN_PLATFORM',
    )
  }

  const secretId = row[owningColumn]
  if (typeof secretId !== 'string' || secretId.length === 0) {
    throw shapeError(
      `assertCredentialShape: platform '${row.platform}' integration is missing its ${owningColumn}`,
      'CREDENTIAL_MISSING',
    )
  }

  // Cross-fill check: no OTHER credential column may be populated. This is the
  // mutual-exclusion invariant — it prevents a handler from ever reaching a
  // credential that belongs to a different auth model.
  for (const col of ALL_CREDENTIAL_COLUMNS) {
    if (col === owningColumn) continue
    const stray = row[col]
    if (typeof stray === 'string' && stray.length > 0) {
      throw shapeError(
        `assertCredentialShape: platform '${row.platform}' integration unexpectedly populates ${col} ` +
          `(only ${owningColumn} is permitted for this platform)`,
        'CREDENTIAL_SHAPE_VIOLATION',
      )
    }
  }

  return { secretId, column: owningColumn }
}
