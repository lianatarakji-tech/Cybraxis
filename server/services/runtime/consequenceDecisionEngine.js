function normalizeString(value) {
  return String(value || "").trim();
}

function normalizeConsequenceBranch(value) {
  const clean = normalizeString(value).toLowerCase();

  if (clean.includes("correct")) return "correct";
  if (clean.includes("wrong")) return "wrong";
  if (clean.includes("timeout")) return "timeout";

  return clean || "none";
}

function buildConsequenceEffects({
  consequence,
  selectedNodeId,
  timestamp = null,
} = {}) {
  if (!consequence || !selectedNodeId) {
    return null;
  }

  let nodeRuntimePatch = null;

  if (consequence.node_effect) {
    nodeRuntimePatch = {
      status:
        consequence.node_effect === "stable"
          ? "normal"
          : consequence.node_effect,
      activity: consequence.log_message || null,
      interpretation:
        consequence.node_effect === "stable"
          ? "Control posture has stabilized after defensive action."
          : null,
    };
  }

  return {
    timestamp,
    mentorFeedback: consequence.mentor_feedback || null,
    actionLogMessage: consequence.log_message || null,
    nodeRuntimePatch,
  };
}

function normalizeEffectsForComparison(effects = null) {
  if (!effects) return null;

  return {
    mentorFeedback: effects.mentorFeedback || null,
    actionLogMessage: effects.actionLogMessage || null,
    nodeRuntimePatch: effects.nodeRuntimePatch
      ? {
          status: effects.nodeRuntimePatch.status || null,
          activity: effects.nodeRuntimePatch.activity || null,
          interpretation: effects.nodeRuntimePatch.interpretation || null,
        }
      : null,
  };
}

function decideConsequence({
  stage = {},
  selectedNodeId = null,
  requestedBranch = null,
  trigger = null,
  consequence = null,
  timestamp = null,
} = {}) {
  const branch =
    normalizeConsequenceBranch(requestedBranch) ||
    normalizeConsequenceBranch(trigger);

  const stageConsequences = stage?.consequences || {};

  const selectedConsequence =
    consequence ||
    stageConsequences[branch] ||
    null;

  const effects = buildConsequenceEffects({
    consequence: selectedConsequence,
    selectedNodeId,
    timestamp,
  });

  return {
    branch,
    selectedNodeId,
    trigger: trigger || null,
    hasConsequence: Boolean(selectedConsequence),
    effects,
  };
}

function compareConsequenceDecision({
  frontendAppliedBranch = null,
  frontendEffects = null,
  backendDecision = null,
} = {}) {
  const frontendBranch = normalizeConsequenceBranch(frontendAppliedBranch);
  const backendBranch = normalizeConsequenceBranch(backendDecision?.branch);

  const frontendComparableEffects =
    normalizeEffectsForComparison(frontendEffects);

  const backendComparableEffects =
    normalizeEffectsForComparison(backendDecision?.effects);

  const branchMatches = frontendBranch === backendBranch;

  const effectsMatch =
    JSON.stringify(frontendComparableEffects) ===
    JSON.stringify(backendComparableEffects);

  return {
    matches: branchMatches && effectsMatch,

    branchMatches,
    effectsMatch,

    frontend: {
      appliedBranch: frontendBranch,
      effects: frontendComparableEffects,
    },

    backend: {
      recommendedBranch: backendBranch,
      selectedNodeId: backendDecision?.selectedNodeId || null,
      hasConsequence: Boolean(backendDecision?.hasConsequence),
      effects: backendComparableEffects,
    },

    checkedAt: new Date().toISOString(),
  };
}

module.exports = {
  normalizeConsequenceBranch,
  buildConsequenceEffects,
  decideConsequence,
  compareConsequenceDecision,
};