export const REMEDY_SCENARIO_IDS = {
  PREMATURE_CONTAINMENT: "remedy_premature_containment_01",
  EVIDENCE_COMPLETION: "remedy_evidence_completion_01",
};

export const REMEDY_SCENARIO_LABELS = {
  [REMEDY_SCENARIO_IDS.PREMATURE_CONTAINMENT]: "Evidence Before Response",
  [REMEDY_SCENARIO_IDS.EVIDENCE_COMPLETION]: "Complete the Evidence Set",
};

export function normalizeRemedyText(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean).join(" ").toLowerCase();
  }

  if (value && typeof value === "object") {
    return Object.values(value).filter(Boolean).join(" ").toLowerCase();
  }

  return String(value || "").toLowerCase();
}

export function resolveRemedyScenarioId(input = {}) {
  const text = normalizeRemedyText([
    input,
    input?.focus,
    input?.weakness,
    input?.primaryWeakness,
    input?.reason,
    input?.scenario,
    input?.sourceFocus,
    input?.hint,
  ]);

  const prematureContainmentPattern =
    /(premature_containment|premature containment|evidence_before_response|early containment|early response|response timing|action order|wrong order|sequence|containment before evidence|responded too early|isolated too early|blocked too early|isolate before|block before|readiness before response)/i;

  const evidenceCompletionPattern =
    /(evidence_completion|complete evidence|complete_the_evidence_set|complete the evidence set|evidence set|evidence coverage|investigation coverage|incomplete evidence|missing evidence|required evidence|coverage|one clue|not enough evidence|evidence-to-response|node evidence|identity|connectivity|controls|activity|interpretation)/i;

  if (prematureContainmentPattern.test(text)) {
    return REMEDY_SCENARIO_IDS.PREMATURE_CONTAINMENT;
  }

  if (evidenceCompletionPattern.test(text)) {
    return REMEDY_SCENARIO_IDS.EVIDENCE_COMPLETION;
  }

  return REMEDY_SCENARIO_IDS.PREMATURE_CONTAINMENT;
}

export function getRemedyScenarioLabel(remedyScenarioId) {
  return REMEDY_SCENARIO_LABELS[remedyScenarioId] || REMEDY_SCENARIO_LABELS[REMEDY_SCENARIO_IDS.PREMATURE_CONTAINMENT];
}
