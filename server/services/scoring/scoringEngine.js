function clampScore(value) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) return 0;

  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function average(values = []) {
  const cleanValues = values
    .map(Number)
    .filter(Number.isFinite);

  if (cleanValues.length === 0) return 0;

  return cleanValues.reduce((sum, value) => sum + value, 0) / cleanValues.length;
}

function percentage(part, total) {
  const cleanPart = Number(part);
  const cleanTotal = Number(total);

  if (!Number.isFinite(cleanPart) || !Number.isFinite(cleanTotal) || cleanTotal <= 0) {
    return 0;
  }

  return clampScore((cleanPart / cleanTotal) * 100);
}

function getScoreBand(score) {
  const cleanScore = clampScore(score);

  if (cleanScore >= 85) {
    return {
      key: "strong",
      label: "Strong",
      description: "Performance is strong enough to support progression into harder investigations.",
    };
  }

  if (cleanScore >= 60) {
    return {
      key: "moderate",
      label: "Moderate",
      description: "Performance is usable, but weaker dimensions should be reviewed before harder scenarios.",
    };
  }

  return {
    key: "needs_improvement",
    label: "Needs Improvement",
    description: "Performance indicates remediation or replay is recommended before progressing.",
  };
}

function getDimensionLabel(score) {
  return getScoreBand(score).label;
}

function getDimensionStatus(score) {
  return getScoreBand(score).key;
}

function getStageScore(stageResult = {}) {
  if (typeof stageResult.score === "number") {
    return clampScore(stageResult.score);
  }

  if (typeof stageResult.totalStageScore === "number") {
    return clampScore(stageResult.totalStageScore);
  }

  if (typeof stageResult.scoring?.totalStageScore === "number") {
    return clampScore(stageResult.scoring.totalStageScore);
  }

  if (typeof stageResult.scoreSummary?.totalStageScore === "number") {
    return clampScore(stageResult.scoreSummary.totalStageScore);
  }

  return 0;
}

function getStageEvaluation(stageResult = {}) {
  return (
    stageResult.evaluation ||
    stageResult.scoring?.evaluation ||
    stageResult.scoreSummary?.evaluation ||
    {}
  );
}

function getStageOutcome(stageResult = {}) {
  return stageResult.outcome || {};
}

function normalizeStageResult(stageResult = {}, index = 0) {
  const evaluation = getStageEvaluation(stageResult);
  const outcome = getStageOutcome(stageResult);

  const score = getStageScore(stageResult);

  const stageId =
    stageResult.stageId ||
    stageResult.stage?.id ||
    stageResult.id ||
    `stage-${index + 1}`;

  const stageName =
    stageResult.stageName ||
    stageResult.stage?.name ||
    stageResult.name ||
    stageId;

  const passed =
    Boolean(stageResult.passed) ||
    Boolean(outcome.passed) ||
    Boolean(stageResult.scoreSummary?.passed);

  const timedOut =
    Boolean(stageResult.timedOut) ||
    Boolean(outcome.timedOut) ||
    Boolean(stageResult.scoreSummary?.timedOut);

  const coverageComplete =
    Boolean(stageResult.coverageComplete) ||
    Boolean(evaluation.coverageComplete);

  const sequenceComplete =
    Boolean(stageResult.sequenceComplete) ||
    Boolean(evaluation.sequenceComplete);

  const wrongActionCount =
    Number(stageResult.wrongActionCount) ||
    Number(stageResult.performance?.wrongActionCount) ||
    Number(evaluation.wrongActionCount) ||
    0;

  const hintsRequested =
    Number(stageResult.hintsRequested) ||
    Number(stageResult.performance?.hintsRequested) ||
    Number(evaluation.hintsRequested) ||
    0;

  const timeLimitSeconds =
    Number(stageResult.timeLimitSeconds) ||
    Number(stageResult.performance?.timeLimitSeconds) ||
    Number(evaluation.timeLimitSeconds) ||
    0;

  const timeRemaining =
    Number(stageResult.timeRemaining) ||
    Number(stageResult.performance?.timeRemaining) ||
    Number(evaluation.timeRemaining) ||
    0;

  return {
    stageId,
    stageName,
    index,

    score,
    scoreBand: getScoreBand(score),

    passed,
    timedOut,
    coverageComplete,
    sequenceComplete,

    wrongActionCount,
    hintsRequested,

    timeLimitSeconds,
    timeRemaining,
  };
}

function buildStageNarrative(stage) {
  const issues = [];

  if (stage.timedOut) {
    issues.push("timed out");
  }

  if (!stage.coverageComplete) {
    issues.push("incomplete investigation coverage");
  }

  if (!stage.sequenceComplete) {
    issues.push("sequence needed review");
  }

  if ((stage.wrongActionCount || 0) > 0) {
    issues.push(`${stage.wrongActionCount} wrong action${stage.wrongActionCount === 1 ? "" : "s"}`);
  }

  if (issues.length === 0) {
    return "Secured with strong investigation flow.";
  }

  return `Needs review: ${issues.join(", ")}.`;
}

function buildStageBreakdown(stageResults = []) {
  return stageResults.map((stageResult, index) => {
    const normalized = normalizeStageResult(stageResult, index);

    return {
      ...normalized,
      narrative: buildStageNarrative(normalized),
    };
  });
}

function countStages(stageBreakdown, predicate) {
  return stageBreakdown.filter(predicate).length;
}

function sumStages(stageBreakdown, selector) {
  return stageBreakdown.reduce((sum, stage) => sum + (selector(stage) || 0), 0);
}

function buildScenarioDimensions(stageBreakdown = []) {
  const totalStages = stageBreakdown.length;

  const completedStages = countStages(stageBreakdown, stage => stage.passed);
  const timedOutStages = countStages(stageBreakdown, stage => stage.timedOut);
  const coverageCompleteCount = countStages(stageBreakdown, stage => stage.coverageComplete);
  const sequenceCompleteCount = countStages(stageBreakdown, stage => stage.sequenceComplete);

  const wrongActionTotal = sumStages(stageBreakdown, stage => stage.wrongActionCount);
  const hintsRequestedTotal = sumStages(stageBreakdown, stage => stage.hintsRequested);

  const completionScore = percentage(completedStages, totalStages);
  const timingScore = percentage(totalStages - timedOutStages, totalStages);
  const coverageScore = percentage(coverageCompleteCount, totalStages);
  const sequenceScore = percentage(sequenceCompleteCount, totalStages);

  const responseQualityScore = clampScore(100 - wrongActionTotal * 15);
  const guidanceDependencyScore = clampScore(100 - hintsRequestedTotal * 10);

  return {
    timingEfficiency: {
      label: "Timing Efficiency",
      value: getDimensionLabel(timingScore),
      status: getDimensionStatus(timingScore),
      score: timingScore,
      detail:
        timedOutStages === 0
          ? "No stage timed out."
          : `${timedOutStages}/${totalStages} stage${timedOutStages === 1 ? "" : "s"} timed out.`,
    },

    investigationCoverage: {
      label: "Investigation Coverage",
      value: getDimensionLabel(coverageScore),
      status: getDimensionStatus(coverageScore),
      score: coverageScore,
      detail: `${coverageCompleteCount}/${totalStages} stages completed required investigation coverage.`,
    },

    sequenceQuality: {
      label: "Sequence Quality",
      value: getDimensionLabel(sequenceScore),
      status: getDimensionStatus(sequenceScore),
      score: sequenceScore,
      detail: `${sequenceCompleteCount}/${totalStages} stages followed the expected action sequence.`,
    },

    responseQuality: {
      label: "Response Quality",
      value: getDimensionLabel(responseQualityScore),
      status: getDimensionStatus(responseQualityScore),
      score: responseQualityScore,
      detail:
        wrongActionTotal === 0
          ? "No wrong response actions recorded."
          : `${wrongActionTotal} wrong action${wrongActionTotal === 1 ? "" : "s"} recorded.`,
    },

    guidanceDependency: {
      label: "Guidance Dependency",
      value: getDimensionLabel(guidanceDependencyScore),
      status: getDimensionStatus(guidanceDependencyScore),
      score: guidanceDependencyScore,
      detail:
        hintsRequestedTotal === 0
          ? "No learner-requested hints recorded."
          : `${hintsRequestedTotal} learner-requested hint${hintsRequestedTotal === 1 ? "" : "s"} recorded.`,
    },

    completion: {
      label: "Scenario Completion",
      value: getDimensionLabel(completionScore),
      status: getDimensionStatus(completionScore),
      score: completionScore,
      detail: `${completedStages}/${totalStages} stages passed.`,
    },
  };
}

function buildScenarioScore(stageBreakdown = []) {
  const stageAverage = average(stageBreakdown.map(stage => stage.score));
  return clampScore(stageAverage);
}

function buildStrengths({
  totalScore,
  dimensions,
  stageBreakdown,
}) {
  const strengths = [];

  if (dimensions.investigationCoverage?.score >= 80) {
    strengths.push("Maintained strong investigation coverage across the scenario.");
  }

  if (dimensions.sequenceQuality?.score >= 80) {
    strengths.push("Followed the expected investigate-before-contain response sequence in most stages.");
  }

  if (dimensions.timingEfficiency?.score >= 80) {
    strengths.push("Managed stage timing effectively without excessive timeout escalation.");
  }

  if (dimensions.responseQuality?.score >= 85) {
    strengths.push("Avoided harmful or irrelevant response actions.");
  }

  if (dimensions.completion?.score === 100) {
    strengths.push("Completed the full scenario and reached the final campaign outcome.");
  }

  if (totalScore >= 75) {
    strengths.push("Demonstrated solid overall SOC response performance.");
  }

  if (strengths.length === 0 && stageBreakdown.length > 0) {
    strengths.push("Generated a complete scenario attempt that can be reviewed for improvement.");
  }

  return strengths;
}

function buildWeaknesses({
  totalScore,
  dimensions,
  stageBreakdown,
}) {
  const weaknesses = [];

  const timedOutStages = countStages(stageBreakdown, stage => stage.timedOut);
  const wrongActionTotal = sumStages(stageBreakdown, stage => stage.wrongActionCount);

  if (timedOutStages > 0) {
    weaknesses.push(`${timedOutStages} stage${timedOutStages === 1 ? "" : "s"} reached timeout escalation.`);
  }

  if (dimensions.investigationCoverage?.score < 80) {
    weaknesses.push("Investigation coverage was incomplete in one or more stages.");
  }

  if (dimensions.sequenceQuality?.score < 80) {
    weaknesses.push("Some actions were taken out of the preferred investigation sequence.");
  }

  if (wrongActionTotal > 0) {
    weaknesses.push(`${wrongActionTotal} wrong action${wrongActionTotal === 1 ? "" : "s"} reduced response quality.`);
  }

  if (totalScore < 60) {
    weaknesses.push("Overall score indicates the learner needs more practice with staged SOC decision-making.");
  }

  if (weaknesses.length === 0) {
    weaknesses.push("No major weaknesses were detected in this attempt.");
  }

  return weaknesses;
}

function buildRecommendations({
  totalScore,
  dimensions,
  stageBreakdown,
}) {
  const recommendations = [];

  const timedOutStages = countStages(stageBreakdown, stage => stage.timedOut);
  const wrongActionTotal = sumStages(stageBreakdown, stage => stage.wrongActionCount);

  if (dimensions.investigationCoverage?.score < 100) {
    recommendations.push("Review each suspicious node or path before containment to improve investigation coverage.");
  }

  if (dimensions.sequenceQuality?.score < 100) {
    recommendations.push("Prioritize investigation actions before response actions to strengthen sequence quality.");
  }

  if (timedOutStages > 0) {
    recommendations.push("Practice faster evidence triage so timeout escalation is less likely.");
  }

  if (wrongActionTotal > 0) {
    recommendations.push("Compare response actions against the current stage objective before applying containment.");
  }

  if (totalScore < 75) {
    recommendations.push("Replay the scenario and focus on coverage, timing, and action order rather than only finishing stages.");
  }

  if (recommendations.length === 0) {
    recommendations.push("Continue with a more advanced scenario or increase difficulty once available.");
  }

  return recommendations;
}

function buildFinalFeedback(totalScore) {
  const scoreBand = getScoreBand(totalScore);

  if (scoreBand.key === "strong") {
    return "Strong scenario performance. The learner showed effective investigation coverage, response sequencing, and containment judgment. Timing, coverage, and response quality were strong enough to support confident progression into more advanced scenarios.";
  }

  if (scoreBand.key === "moderate") {
    return "Moderate scenario performance. The learner completed the scenario and demonstrated usable SOC investigation behavior, but the result shows room for improvement in timing, coverage, action sequence, or response precision. Review the weaker dimensions before attempting a harder scenario.";
  }

  return "Scenario completed with significant improvement needed. The learner reached the final outcome, but the score and evaluation dimensions suggest difficulty with investigation coverage, timing, action order, or response quality. Replaying the scenario with focus on evidence-first reasoning is recommended.";
}

function buildScenarioEvaluation({
  stageResults = [],
} = {}) {
  const stageBreakdown = buildStageBreakdown(stageResults);
  const totalScore = buildScenarioScore(stageBreakdown);
  const dimensions = buildScenarioDimensions(stageBreakdown);

  const strengths = buildStrengths({
    totalScore,
    dimensions,
    stageBreakdown,
  });

  const weaknesses = buildWeaknesses({
    totalScore,
    dimensions,
    stageBreakdown,
  });

  const recommendations = buildRecommendations({
    totalScore,
    dimensions,
    stageBreakdown,
  });

  const finalFeedback = buildFinalFeedback(totalScore);

  return {
    totalScore,
    scoreBand: getScoreBand(totalScore),
    stageBreakdown,
    dimensions,
    strengths,
    weaknesses,
    recommendations,
    finalFeedback,
  };
}

module.exports = {
  clampScore,
  average,
  percentage,
  getScoreBand,
  getDimensionLabel,
  getDimensionStatus,
  normalizeStageResult,
  buildStageBreakdown,
  buildScenarioDimensions,
  buildScenarioScore,
  buildScenarioEvaluation,
};