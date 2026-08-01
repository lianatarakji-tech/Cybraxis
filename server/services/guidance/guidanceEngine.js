function normalizeString(value) {
  return String(value || "").trim();
}

function getStageMentor(stage = {}) {
  return stage.mentor || {};
}

function getCoverageStatusKey(coverageResult = {}) {
  return (
    coverageResult.coverageStatus?.status ||
    coverageResult.status ||
    "unknown"
  );
}

function getActionClassification(actionEvaluation = {}) {
  return actionEvaluation.classification || "unknown";
}

function buildGuidanceMessage({
  stage = {},
  actionEvaluation = null,
  coverageResult = null,
  fallbackText = null,
} = {}) {
  const mentor = getStageMentor(stage);
  const classification = getActionClassification(actionEvaluation || {});
  const coverageStatus = getCoverageStatusKey(coverageResult || {});

  if (fallbackText) {
    return {
      trigger: "fallback",
      severity: "info",
      title: "Advisor Note",
      message: fallbackText,
      reasonCode: "fallback_text",
    };
  }

  if (classification === "correct_with_warning") {
    return {
      trigger: "action_sequence_warning",
      severity: "warning",
      title: "Valid Action, Sequence Warning",
      message:
        actionEvaluation?.message ||
        mentor.wrong_order ||
        "This action is valid, but it was taken out of the preferred investigation sequence.",
      reasonCode: actionEvaluation?.reasonCode || "action_out_of_sequence",
    };
  }

  if (classification === "premature") {
    return {
      trigger: "premature_action",
      severity: "warning",
      title: "Premature Response",
      message:
        actionEvaluation?.message ||
        mentor.coverage_incomplete ||
        "This response is premature. Complete the required investigation coverage first.",
      reasonCode: actionEvaluation?.reasonCode || "premature_action",
    };
  }

  if (classification === "wrong_target") {
    return {
      trigger: "wrong_target",
      severity: "warning",
      title: "Wrong Target",
      message:
        actionEvaluation?.message ||
        "The selected node or target does not match the current stage objective.",
      reasonCode: actionEvaluation?.reasonCode || "wrong_target",
    };
  }

  if (classification === "wrong") {
    return {
      trigger: "wrong_action",
      severity: "danger",
      title: "Wrong Action",
      message:
        actionEvaluation?.message ||
        "That action does not match the evidence or current stage objective.",
      reasonCode: actionEvaluation?.reasonCode || "wrong_action",
    };
  }

  if (classification === "repeated") {
    return {
      trigger: "repeated_action",
      severity: "info",
      title: "Repeated Action",
      message:
        actionEvaluation?.message ||
        "This action has already been completed for the current stage.",
      reasonCode: actionEvaluation?.reasonCode || "repeated_action",
    };
  }

  if (classification === "irrelevant") {
    return {
      trigger: "irrelevant_action",
      severity: "warning",
      title: "Action Not Expected",
      message:
        actionEvaluation?.message ||
        "This action is not part of the expected response set for the current stage.",
      reasonCode: actionEvaluation?.reasonCode || "action_not_expected_for_stage",
    };
  }

  if (coverageStatus === "complete") {
    return {
      trigger: "coverage_complete",
      severity: "success",
      title: "Coverage Complete",
      message:
        coverageResult?.guidanceHint ||
        "Required investigation coverage is complete. Response actions can now be considered.",
      reasonCode: "coverage_complete",
    };
  }

  if (coverageStatus === "partial") {
    return {
      trigger: "coverage_partial",
      severity: "warning",
      title: "Coverage Partial",
      message:
        coverageResult?.guidanceHint ||
        mentor.coverage_incomplete ||
        "Investigation coverage is partially complete. Review missing evidence before response.",
      reasonCode: "coverage_partial",
    };
  }

  if (coverageStatus === "missing") {
    return {
      trigger: "coverage_missing",
      severity: "warning",
      title: "Coverage Missing",
      message:
        coverageResult?.guidanceHint ||
        "Required investigation coverage has not been completed.",
      reasonCode: "coverage_missing",
    };
  }

  return {
    trigger: "advisor_general",
    severity: "info",
    title: "SOC Advisor",
    message:
      mentor.stage_hint ||
      stage.mentor_hint ||
      "Review the alert, inspect relevant evidence, and choose actions based on the current stage objective.",
    reasonCode: "general_guidance",
  };
}

function buildStageHint({
  stage = {},
  coverageResult = null,
} = {}) {
  const mentor = getStageMentor(stage);

  if (coverageResult && !coverageResult.allRequiredCoverageComplete) {
    return buildGuidanceMessage({
      stage,
      coverageResult,
    });
  }

  return {
    trigger: "stage_hint",
    severity: "info",
    title: "Stage Hint",
    message:
      mentor.stage_hint ||
      stage.mentor_hint ||
      stage.learning_objective ||
      "Inspect the relevant alert, node, and log evidence before taking response action.",
    reasonCode: "stage_hint",
  };
}

function buildTimeoutGuidance({
  stage = {},
} = {}) {
  const mentor = getStageMentor(stage);

  return {
    trigger: "timeout",
    severity: "danger",
    title: "Stage Escalated",
    message:
      mentor.timeout ||
      stage.timeout_feedback ||
      "The stage timer expired. The incident escalated because the required response was not completed in time.",
    reasonCode: "stage_timeout",
  };
}

function buildFinalGuidance({
  totalScore,
  primaryWeakness = null,
  progression = null,
} = {}) {
  const score = Number(totalScore);

  if (Number.isFinite(score) && score >= 85) {
    return {
      trigger: "final_strong",
      severity: "success",
      title: "Strong Scenario Performance",
      message:
        progression?.reason ||
        "Strong performance. You are ready for a harder investigation path when available.",
      reasonCode: "final_strong",
    };
  }

  if (Number.isFinite(score) && score >= 60) {
    return {
      trigger: "final_moderate",
      severity: "info",
      title: "Moderate Scenario Performance",
      message:
        progression?.reason ||
        `Moderate performance. Review weaker areas${primaryWeakness ? `, especially ${primaryWeakness}` : ""}, before moving to harder scenarios.`,
      reasonCode: "final_moderate",
    };
  }

  return {
    trigger: "final_remediation",
    severity: "warning",
    title: "Remediation Recommended",
    message:
      progression?.reason ||
      `Replay or remediation is recommended${primaryWeakness ? `, especially for ${primaryWeakness}` : ""}.`,
    reasonCode: "final_remediation",
  };
}

function buildGuidanceResult(input = {}) {
  const guidance = buildGuidanceMessage(input);

  return {
    ...guidance,
    generatedAt: new Date().toISOString(),
  };
}

module.exports = {
  buildGuidanceMessage,
  buildGuidanceResult,
  buildStageHint,
  buildTimeoutGuidance,
  buildFinalGuidance,
};