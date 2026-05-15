// Continuation #124 (2026-05-15) — Phase Ω.6 Bundle 2 barrel.

export type { CopilotDraft, CopilotDraftStep, CopilotDraftSummary } from "./types";
export {
  newDraftId, listDrafts, getDraft, saveDraft, deleteDraft, duplicateDraft,
  COPILOT_DRAFTS_STORAGE_KEY,
} from "./storage";
export { buildCopilotPrompt, parseAIResponseToDraft, EXAMPLE_PROMPTS } from "./prompt";
export { activationHrefForDraft, draftIsActivatable } from "./activation";
