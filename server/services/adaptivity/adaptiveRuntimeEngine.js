function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function clampNumber(value, min, max, fallback = 0) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) return fallback;

  return Math.max(min, Math.min(max, numeric));
}

function getClassification(actionEvaluation = {}) {
  return actionEvaluation.classification || "unknown";
}

function getCoveragePercent(coverageResult = {}) {
  return clampNumber(coverageResult.coveragePercent, 0, 100, 0);
}

function getCoverageComplete(coverageResult = {}) {
  return Boolean(
    coverageResult.allRequiredCoverageComplete ||
      coverageResult.coverageStatus?.status === "complete"
  );
}

function getNetworkRiskLevel(networkRisk = {}) {
  return networkRisk.selectedNodeRisk?.riskLevel || "unknown";
}

function getNetworkRelevant(networkRisk = {}) {
  return Boolean(networkRisk.selectedNodeRisk?.relevant);
}

function getWrongActionCount(runtime = {}) {
  return clampNumber(runtime.wrongActionCount, 0, 999, 0);
}

function getRepeatedActionCount(runtime = {}) {
  return clampNumber(runtime.repeatedActionCount, 0, 999, 0);
}

function getPrematureActionCount(runtime = {}, actionEvaluation = {}) {
  const base = clampNumber(runtime.prematureActionCount, 0, 999, 0);

  if (getClassification(actionEvaluation) === "premature") {
    return base + 1;
  }

  return base;
}

function getWrongTargetCount(runtime = {}, actionEvaluation = {}) {
  const base = clampNumber(runtime.wrongTargetCount, 0, 999, 0);

  if (getClassification(actionEvaluation) === "wrong_target") {
    return base + 1;
  }

  return base;
}

function getHintsRequested(runtime = {}) {
  return clampNumber(runtime.hintsRequested, 0, 999, 0);
}

function getTimeRemaining(runtime = {}) {
  if (runtime.timeRemaining == null) return null;
  return clampNumber(runtime.timeRemaining, 0, 99999, 0);
}

function getTimeLimitSeconds(runtime = {}) {
  if (runtime.timeLimitSeconds == null) return null;
  return clampNumber(runtime.timeLimitSeconds, 0, 99999, 0);
}

function getTimeRemainingPercent(runtime = {}) {
  const remaining = getTimeRemaining(runtime);
  const limit = getTimeLimitSeconds(runtime);

  if (remaining == null || limit == null || limit <= 0) {
    return null;
  }

  return Math.round((remaining / limit) * 100);
}

function getStageScoreTrend(runtime = {}) {
  const scores = normalizeArray(runtime.recentStageScores)
    .map(Number)
    .filter(Number.isFinite);

  if (scores.length < 2) {
    return "unknown";
  }

  const latest = scores[scores.length - 1];
  const previous = scores[scores.length - 2];

  if (latest >= previous + 10) return "improving";
  if (latest <= previous - 10) return "declining";
  return "stable";
}

function addReason(reasons, code, detail = null) {
  reasons.push({
    code,
    detail,
  });
}

function calculateStruggleScore({
  runtime = {},
  coverageResult = {},
  actionEvaluation = {},
  networkRisk = {},
} = {}) {
  const reasons = [];

  let score = 0;

  const classification = getClassification(actionEvaluation);
  const wrongActionCount = getWrongActionCount(runtime);
  const repeatedActionCount = getRepeatedActionCount(runtime);
  const prematureActionCount = getPrematureActionCount(runtime, actionEvaluation);
  const wrongTargetCount = getWrongTargetCount(runtime, actionEvaluation);
  const hintsRequested = getHintsRequested(runtime);
  const coveragePercent = getCoveragePercent(coverageResult);
  const coverageComplete = getCoverageComplete(coverageResult);
  const timeRemainingPercent = getTimeRemainingPercent(runtime);
  const networkRelevant = getNetworkRelevant(networkRisk);
  const networkRiskLevel = getNetworkRiskLevel(networkRisk);
  const trend = getStageScoreTrend(runtime);

  if (classification === "wrong") {
    score += 25;
    addReason(reasons, "wrong_action", "The latest action was classified as wrong.");
  }

  if (classification === "wrong_target") {
    score += 20;
    addReason(reasons, "wrong_target", "The latest action targeted the wrong node or network point.");
  }

  if (classification === "premature") {
    score += 18;
    addReason(reasons, "premature_response", "The learner attempted response before the required evidence was complete.");
  }

  if (classification === "repeated") {
    score += 10;
    addReason(reasons, "repeated_action", "The learner repeated an action in the current stage.");
  }

  if (wrongActionCount >= 2) {
    score += 20;
    addReason(reasons, "multiple_wrong_actions", `${wrongActionCount} wrong actions recorded.`);
  } else if (wrongActionCount === 1) {
    score += 10;
    addReason(reasons, "one_wrong_action", "One wrong action recorded.");
  }

  if (prematureActionCount >= 2) {
    score += 18;
    addReason(reasons, "repeated_premature_response", `${prematureActionCount} premature response attempts detected.`);
  } else if (prematureActionCount === 1) {
    score += 8;
    addReason(reasons, "one_premature_response", "One premature response attempt detected.");
  }

  if (wrongTargetCount >= 2) {
    score += 16;
    addReason(reasons, "repeated_wrong_target", `${wrongTargetCount} wrong target selections detected.`);
  } else if (wrongTargetCount === 1) {
    score += 8;
    addReason(reasons, "one_wrong_target", "One wrong target selection detected.");
  }

  if (repeatedActionCount >= 2) {
    score += 10;
    addReason(reasons, "repeated_actions", `${repeatedActionCount} repeated actions detected.`);
  }

  if (!coverageComplete && coveragePercent < 40) {
    score += 18;
    addReason(reasons, "low_coverage", `Investigation coverage is low (${coveragePercent}%).`);
  } else if (!coverageComplete && coveragePercent < 80) {
    score += 10;
    addReason(reasons, "partial_coverage", `Investigation coverage is partial (${coveragePercent}%).`);
  }

  if (hintsRequested >= 5) {
  score += 45;
  addReason(reasons, "very_high_hint_dependency", `${hintsRequested} hints requested.`);
} else if (hintsRequested >= 3) {
  score += 30;
  addReason(reasons, "high_hint_dependency", `${hintsRequested} hints requested.`);
} else if (hintsRequested >= 1) {
  score += 10;
  addReason(reasons, "some_hint_dependency", `${hintsRequested} hint requested.`);
}

  if (timeRemainingPercent !== null && timeRemainingPercent <= 15) {
    score += 18;
    addReason(reasons, "critical_time_pressure", `${timeRemainingPercent}% of stage time remaining.`);
  } else if (timeRemainingPercent !== null && timeRemainingPercent <= 30) {
    score += 10;
    addReason(reasons, "time_pressure", `${timeRemainingPercent}% of stage time remaining.`);
  }

  if (!networkRelevant && networkRisk.selectedNodeRisk?.selectedNodeId) {
    score += 12;
    addReason(reasons, "irrelevant_network_selection", "Selected node is not relevant to the current stage path.");
  }

  if (networkRiskLevel === "high" && classification === "wrong_target") {
    score += 8;
    addReason(reasons, "high_risk_wrong_target", "Wrong target selection touched a high-risk network context.");
  }

  if (trend === "declining") {
    score += 10;
    addReason(reasons, "declining_score_trend", "Recent stage score trend is declining.");
  }

  if (classification === "correct" && coverageComplete && wrongActionCount === 0 && hintsRequested === 0) {
    score -= 20;
    addReason(reasons, "strong_current_performance", "Correct action with complete coverage and no support dependency.");
  }

  return {
    struggleScore: clampNumber(Math.round(score), 0, 100, 0),
    reasonCodes: reasons,
  };
}

function getSupportLevel(struggleScore) {
  if (struggleScore >= 70) return "high";
  if (struggleScore >= 40) return "medium";
  if (struggleScore >= 20) return "low";
  return "minimal";
}

function getHintSpecificity(supportLevel) {
  if (supportLevel === "high") return "directed";
  if (supportLevel === "medium") return "targeted";
  if (supportLevel === "low") return "light";
  return "minimal";
}

function getMentorFrequency(supportLevel) {
  if (supportLevel === "high") {
    return {
      level: "frequent",
      cooldownSeconds: 20,
      allowUnsolicitedHints: true,
    };
  }

  if (supportLevel === "medium") {
    return {
      level: "normal",
      cooldownSeconds: 35,
      allowUnsolicitedHints: true,
    };
  }

  if (supportLevel === "low") {
    return {
      level: "reduced",
      cooldownSeconds: 50,
      allowUnsolicitedHints: false,
    };
  }

  return {
    level: "minimal",
    cooldownSeconds: 70,
    allowUnsolicitedHints: false,
  };
}

function getEscalationPressure({
  supportLevel,
  runtime = {},
} = {}) {
  const timeRemainingPercent = getTimeRemainingPercent(runtime);

  if (supportLevel === "high") {
    return {
      level: "reduced",
      timerMultiplier: 1.2,
      escalationWarningThresholdPercent: 35,
      reason: "Learner is struggling, so escalation pressure is slightly reduced within allowed bounds.",
    };
  }

  if (supportLevel === "medium") {
    return {
      level: "normal",
      timerMultiplier: 1.0,
      escalationWarningThresholdPercent: 30,
      reason: "Learner needs support, but normal pressure is preserved.",
    };
  }

  if (supportLevel === "minimal" && timeRemainingPercent !== null && timeRemainingPercent > 60) {
    return {
      level: "normal_high_confidence",
      timerMultiplier: 1.0,
      escalationWarningThresholdPercent: 25,
      reason: "Learner is performing well, so normal pressure is maintained.",
    };
  }

  return {
    level: "normal",
    timerMultiplier: 1.0,
    escalationWarningThresholdPercent: 30,
    reason: "Default scenario escalation pressure.",
  };
}

function getLogPacing({
  supportLevel,
  runtime = {},
} = {}) {
  const wrongActionCount = getWrongActionCount(runtime);
  const hintsRequested = getHintsRequested(runtime);

  if (supportLevel === "high") {
    return {
      level: "reduced_noise",
      revealMode: "prioritize_relevant",
      maxNewLogsPerTick: 1,
      reason: "Learner is struggling, so log noise should be reduced and relevant evidence prioritized.",
    };
  }

  if (supportLevel === "medium" || wrongActionCount > 0 || hintsRequested > 0) {
    return {
      level: "guided",
      revealMode: "relevant_first",
      maxNewLogsPerTick: 2,
      reason: "Learner needs moderate support, so relevant evidence should appear before distractors.",
    };
  }

  return {
    level: "normal",
    revealMode: "scenario_default",
    maxNewLogsPerTick: 3,
    reason: "Learner is handling the current stage without extra log pacing support.",
  };
}

function getWarningIntensity({
  actionEvaluation = {},
  coverageResult = {},
} = {}) {
  const classification = getClassification(actionEvaluation);
  const coverageComplete = getCoverageComplete(coverageResult);

  if (classification === "premature") {
    return {
      level: "strong",
      showRiskLabel: true,
      blockOrWarn: "warn",
      message: "Response action is risky because investigation coverage is incomplete.",
    };
  }

  if (classification === "wrong_target" || classification === "wrong") {
    return {
      level: "strong",
      showRiskLabel: true,
      blockOrWarn: "warn",
      message: "The selected action or target conflicts with the current stage objective.",
    };
  }

  if (!coverageComplete) {
    return {
      level: "medium",
      showRiskLabel: true,
      blockOrWarn: "allow_with_warning",
      message: "Investigation coverage is incomplete. Response actions may reduce score.",
    };
  }

  return {
    level: "normal",
    showRiskLabel: false,
    blockOrWarn: "allow",
    message: "No additional response-risk warning required.",
  };
}

function getRemediationMode({
  struggleScore,
  runtime = {},
} = {}) {
  const wrongActionCount = getWrongActionCount(runtime);
  const hintsRequested = getHintsRequested(runtime);

  if (struggleScore >= 80 || wrongActionCount >= 3 || hintsRequested >= 4) {
    return {
      active: true,
      level: "strong",
      reason: "Learner shows repeated difficulty and may need remediation-style support.",
    };
  }

  if (struggleScore >= 55) {
    return {
      active: true,
      level: "light",
      reason: "Learner shows moderate difficulty and may benefit from targeted support.",
    };
  }

  return {
    active: false,
    level: "off",
    reason: "No remediation mode needed for current performance.",
  };
}

function buildAdaptiveRuntimeState({
  runtime = {},
  coverageResult = {},
  actionEvaluation = {},
  networkRisk = {},
} = {}) {
  const struggle = calculateStruggleScore({
    runtime,
    coverageResult,
    actionEvaluation,
    networkRisk,
  });

  const supportLevel = getSupportLevel(struggle.struggleScore);

  return {
    supportLevel,
    struggleScore: struggle.struggleScore,
    reasonCodes: struggle.reasonCodes,

    hintSpecificity: getHintSpecificity(supportLevel),
    mentorFrequency: getMentorFrequency(supportLevel),

    escalationPressure: getEscalationPressure({
      supportLevel,
      runtime,
    }),

    logPacing: getLogPacing({
      supportLevel,
      runtime,
    }),

    warningIntensity: getWarningIntensity({
      actionEvaluation,
      coverageResult,
    }),

    remediationMode: getRemediationMode({
      struggleScore: struggle.struggleScore,
      runtime,
    }),

    generatedAt: new Date().toISOString(),
  };
}

module.exports = {
  buildAdaptiveRuntimeState,
  calculateStruggleScore,
  getSupportLevel,
  getHintSpecificity,
  getMentorFrequency,
  getEscalationPressure,
  getLogPacing,
  getWarningIntensity,
  getRemediationMode,
};