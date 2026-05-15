// Continuation #123 (2026-05-15) — Phase Ω.6 Phase B barrel.
// Single import point for the workflow-template manifest + helpers.

export type {
  WorkflowTemplate,
  TemplateStep,
  TemplateStepKind,
  TemplateOutput,
  TemplateTrigger,
  TemplateCategoryId,
  TemplateCategoryMeta,
  TemplateComplexity,
  IntegrationProviderId,
} from "./types";

export {
  WORKFLOW_TEMPLATES,
  getTemplateBySlug,
  getRelatedTemplates,
} from "./templates";

export {
  TEMPLATE_CATEGORIES,
  getCategoryMeta,
} from "./categories";

export {
  INTEGRATION_PROVIDERS,
  getProviderMeta,
} from "./integrations";

export type { IntegrationProviderMeta } from "./integrations";

// Continuation #125 (2026-05-15) — Phase Ω.7 cross-references.
export {
  getTemplatesUsingActionType,
  getActionTypesInTemplate,
  getTemplatesByOperationCategory,
  getOperationCategoryCounts,
} from "./cross-refs";
