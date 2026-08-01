function getAiMetadata(stage = {}) {
  return stage?.ai_metadata || null;
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function getSupportLevel({
  hintPolicy = {},
  wrongActionCount = 0,
  repeatedActionCount = 0,
} = {}) {
  const defaultSupportLevel = hintPolicy.default_support_level || "light";
  const increaseAfterWrongAttempts =
    Number(hintPolicy.increase_after_wrong_attempts ?? 2);

  const attempts = Math.max(
    Number(wrongActionCount) || 0,
    Number(repeatedActionCount) || 0
  );

  if (attempts >= increaseAfterWrongAttempts + 1) {
    return "strong";
  }

  if (attempts >= increaseAfterWrongAttempts) {
    return "medium";
  }

  return defaultSupportLevel;
}

function getAllowExactGuidance({
  hintPolicy = {},
  wrongActionCount = 0,
  repeatedActionCount = 0,
} = {}) {
  if (hintPolicy.allow_exact_guidance === true) {
    return true;
  }

  const threshold = Number(hintPolicy.allow_exact_guidance_after_attempts ?? 3);
  const attempts = Math.max(
    Number(wrongActionCount) || 0,
    Number(repeatedActionCount) || 0
  );

  return attempts >= threshold;
}

function getMissingEvidenceCategories({
  stage = {},
  coverageResult = null,
  actionEvaluation = null,
} = {}) {
  const metadata = getAiMetadata(stage);

  if (!metadata) return [];

  const requiredCategories = Array.isArray(metadata.evidence_categories)
    ? metadata.evidence_categories
    : [];

  if (
    actionEvaluation?.classification === "premature" ||
    actionEvaluation?.reasonCode === "coverage_incomplete_before_response"
  ) {
    return requiredCategories.slice(0, 2);
  }

  if (coverageResult?.allRequiredCoverageComplete === false) {
    return requiredCategories.slice(0, 2);
  }

  return [];
}

function getAllowedFactIds(stage = {}) {
  const metadata = getAiMetadata(stage);

  return Array.isArray(metadata?.facts)
    ? metadata.facts
        .filter(fact => fact?.safe_for_hint !== false)
        .map(fact => fact.id)
        .filter(Boolean)
    : [];
}

function getSafeFacts(stage = {}) {
  const metadata = getAiMetadata(stage);

  return Array.isArray(metadata?.facts)
    ? metadata.facts
        .filter(fact => fact?.safe_for_hint !== false)
        .map(fact => ({
          id: fact.id,
          label: fact.label,
          category: fact.category,
        }))
        .filter(fact => fact.id && fact.label)
    : [];
}

function buildMentorFactPack({
  scenario = {},
  stage = {},
  actionId = null,
  actionLabel = null,
  selectedNodeId = null,
  selectedTargetId = null,
  trigger = null,
  actionEvaluation = null,
  coverageResult = null,
  runtime = {},
} = {}) {
  const metadata = getAiMetadata(stage);

  if (!metadata) {
    return {
      ready: false,
      reason: "stage_ai_metadata_missing",
      scenarioId: scenario?.scenario_id || scenario?.id || null,
      stageId: stage?.id || null,
    };
  }

  const hintPolicy = metadata.hint_policy || {};
  const factPackRules = metadata.fact_pack_rules || {};

  const resolvedTrigger =
    trigger ||
    actionEvaluation?.classification ||
    actionEvaluation?.reasonCode ||
    "general_guidance";

  const allowedFactIds = getAllowedFactIds(stage);
  const maxFactsToExpose = Number(factPackRules.max_facts_to_expose ?? 3);

  return {
    ready: true,
    useCase: "mentor_hint",

    scenarioId: scenario?.scenario_id || scenario?.id || null,
    stageId: stage?.id || null,
    objective: metadata.stage_objective || stage?.learning_objective || null,

    trigger: resolvedTrigger,
    supportLevel: getSupportLevel({
      hintPolicy,
      wrongActionCount: runtime?.wrongActionCount,
      repeatedActionCount: runtime?.repeatedActionCount,
    }),

    selectedNode: selectedNodeId,
    selectedTarget: selectedTargetId,
    attemptedAction: actionLabel || actionId,

    missingEvidence: getMissingEvidenceCategories({
      stage,
      coverageResult,
      actionEvaluation,
    }),

    allowedFactIds: allowedFactIds.slice(0, maxFactsToExpose),
    facts: getSafeFacts(stage).slice(0, maxFactsToExpose),

    allowExactGuidance: getAllowExactGuidance({
      hintPolicy,
      wrongActionCount: runtime?.wrongActionCount,
      repeatedActionCount: runtime?.repeatedActionCount,
    }),

    constraints: {
      allowRawLogs: Boolean(factPackRules.allow_raw_logs),
      requireGroundedFactIds:
        factPackRules.require_grounded_fact_ids !== false,
      maxFactsToExpose,
      aiMayDecideGameplay: false,
    },

    weaknessCode:
      metadata.weakness_codes?.[resolvedTrigger] ||
      metadata.weakness_codes?.general_guidance ||
      null,

    remedyScenarioId: null,
  };
}

module.exports = {
  buildMentorFactPack,
  getAiMetadata,
  getAllowedFactIds,
  getSafeFacts,
};
