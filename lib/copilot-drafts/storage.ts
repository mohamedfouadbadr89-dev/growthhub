// Continuation #124 (2026-05-15) — Phase Ω.6 Bundle 2 Step 1.
// Typed localStorage helpers for Copilot drafts. Single source of
// truth for the storage key + (de)serialization. NO BACKEND
// PERSISTENCE — drafts are FE-only ideation state.

import type { CopilotDraft, CopilotDraftSummary } from "./types";

const STORAGE_KEY = "growthhub.copilot.drafts.v1";

/**
 * Generate a stable client-side uuid v4. Uses the crypto API when
 * available, falls back to a non-cryptographic id for SSR + ancient
 * browsers (uniqueness is the only requirement; this id never reaches
 * a security-sensitive boundary).
 */
export function newDraftId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 10);
  return `draft-${t}-${r}`;
}

interface StoredEnvelope {
  version: 1;
  drafts: CopilotDraft[];
}

/**
 * Safe localStorage read. Returns an empty envelope on:
 *   - SSR (window undefined)
 *   - missing key
 *   - parse error
 *   - version mismatch
 */
function readEnvelope(): StoredEnvelope {
  if (typeof window === "undefined") return { version: 1, drafts: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { version: 1, drafts: [] };
    const parsed = JSON.parse(raw) as Partial<StoredEnvelope>;
    if (parsed?.version !== 1 || !Array.isArray(parsed.drafts)) {
      return { version: 1, drafts: [] };
    }
    return { version: 1, drafts: parsed.drafts };
  } catch {
    // Corrupt JSON or quota error — degrade gracefully to empty.
    return { version: 1, drafts: [] };
  }
}

function writeEnvelope(env: StoredEnvelope): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(env));
  } catch {
    // Quota exceeded or browser private mode — silent fail is acceptable.
    // The operator can still continue working with in-memory state.
  }
}

export function listDrafts(): CopilotDraftSummary[] {
  const { drafts } = readEnvelope();
  return drafts
    .map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      step_count: d.steps.length,
      source: d.source,
      template_slug: d.template_slug,
      updated_at: d.updated_at,
    }))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export function getDraft(id: string): CopilotDraft | null {
  const { drafts } = readEnvelope();
  return drafts.find((d) => d.id === id) ?? null;
}

export function saveDraft(draft: CopilotDraft): void {
  const env = readEnvelope();
  const idx = env.drafts.findIndex((d) => d.id === draft.id);
  const updated: CopilotDraft = { ...draft, updated_at: new Date().toISOString() };
  if (idx >= 0) {
    env.drafts[idx] = updated;
  } else {
    env.drafts.unshift(updated);
  }
  writeEnvelope(env);
}

export function deleteDraft(id: string): void {
  const env = readEnvelope();
  env.drafts = env.drafts.filter((d) => d.id !== id);
  writeEnvelope(env);
}

export function duplicateDraft(id: string): CopilotDraft | null {
  const original = getDraft(id);
  if (!original) return null;
  const now = new Date().toISOString();
  const copy: CopilotDraft = {
    ...original,
    id: newDraftId(),
    name: `${original.name} (copy)`,
    created_at: now,
    updated_at: now,
  };
  saveDraft(copy);
  return copy;
}

/**
 * Convenience: storage key exported for tests + cross-tab event listeners
 * (future enhancement; not used in v1).
 */
export const COPILOT_DRAFTS_STORAGE_KEY = STORAGE_KEY;
