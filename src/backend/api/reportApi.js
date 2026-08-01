import { summarizeStageResult } from "../models/stageResultModel";

function average(numbers) {
  const cleanNumbers = numbers.filter(value => Number.isFinite(value));
  if (!cleanNumbers.length) return 0;

  return cleanNumbers.reduce((sum, value) => sum + value, 0) / cleanNumbers.length;
}

function getDimensionLabel(value) {
  if (value >= 85) return "Strong";
  if (value >= 60) return "Moderate";
  return "Needs Improvement";
}

function getScoreBand(score) {
  if (score >= 85) return "strong";
  if (score >= 60) return "moderate";
  return "needs-improvement";
}

function cybraxisClampMentorHintCount(value) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric) || numeric < 0) return 0;
  return Math.round(numeric);
}
function cybraxisReadRuntimeMentorHintCount() {
  if (typeof window === "undefined") return 0;

  try {
    const activeUserId =
      window.localStorage.getItem("cybraxisCurrentPlayerId") ||
      window.localStorage.getItem("cybraxisSelectedPlayerId") ||
      window.localStorage.getItem("cybraxisActivePlayerId") ||
      window.localStorage.getItem("cybraxisMentorHintUsageLastUserId") ||
      "demo-user";

    const scenarioId =
      window.localStorage.getItem("cybraxisLastScenarioId") ||
      window.localStorage.getItem("cybraxisCompletedScenarioId") ||
      window.localStorage.getItem("cybraxisMentorHintUsageLastScenarioId") ||
      "";

    if (!scenarioId) return 0;

    const scopedKey = "cybraxisMentorHintUsageTotal:" + activeUserId + ":" + scenarioId;
    const scenarioOnlyKey = "cybraxisMentorHintUsageTotal:" + scenarioId;

    const scoped = Number(window.localStorage.getItem(scopedKey) || "0");
    const scenarioOnly = Number(window.localStorage.getItem(scenarioOnlyKey) || "0");

    let snapshotCount = 0;
    if (activeUserId) {
      const snapshot = JSON.parse(window.localStorage.getItem("cybraxisUserProgress:" + activeUserId) || "{}") || {};
      const byScenario = snapshot.cybraxisMentorHintUsageTotalByScenario || {};
      snapshotCount = Number(byScenario[scenarioId] || 0);
    }

    return Math.max(
      Number.isFinite(scoped) ? scoped : 0,
      Number.isFinite(scenarioOnly) ? scenarioOnly : 0,
      Number.isFinite(snapshotCount) ? snapshotCount : 0
    );
  } catch {
    return 0;
  }
}
function countStages(stageBreakdown, predicate) {
  return stageBreakdown.filter(predicate).length;
}


function cybraxisStagePassedForReport(stage = {}) {
  if (stage?.timedOut) return false;

  if (stage?.passed === true) return true;

  const score = Number(
    stage?.score ??
    stage?.totalScore ??
    stage?.totalStageScore ??
    stage?.scoreSummary?.totalStageScore ??
    stage?.scoreSummary?.stageScore ??
    stage?.scoreSummary?.score ??
    0
  );

  return Number.isFinite(score) && score >= 65;
}

function sumStages(stageBreakdown, selector) {
  return stageBreakdown.reduce((sum, stage) => sum + (selector(stage) || 0), 0);
}

function percentage(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
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

  const score = Number(
    stage?.totalStageScore ??
    stage?.stageScore ??
    stage?.score ??
    stage?.scoreSummary?.totalStageScore ??
    stage?.scoreSummary?.stageScore ??
    0
  );

  if (Number.isFinite(score) && score >= 80) {
    return `Improvement note: ${issues.join(", ")}.`;
  }

  if (Number.isFinite(score) && score >= 65) {
    return `Review note: ${issues.join(", ")}.`;
  }

  return `Needs review: ${issues.join(", ")}.`;
}

function buildStrengths({
  totalScore,
  completedStages,
  totalStages,
  timedOutStages,
  coveragePercent,
  sequencePercent,
  wrongActionTotal,
}) {
  const strengths = [];

  if (completedStages === totalStages && totalStages > 0) {
    strengths.push("Completed the full scenario and reached the final campaign outcome.");
  }

  if (coveragePercent >= 80) {
    strengths.push("Maintained strong investigation coverage across the scenario.");
  } else if (coveragePercent >= 60) {
    strengths.push("Completed investigation coverage for most stages.");
  }

  if (sequencePercent >= 80) {
    strengths.push("Followed the expected investigate-before-contain response sequence in most stages.");
  }

  if (timedOutStages === 0) {
    strengths.push("Managed stage timing effectively without timeout escalation.");
  }

  if (wrongActionTotal === 0) {
    strengths.push("Avoided harmful or irrelevant response actions.");
  }

  if (totalScore >= 75) {
    strengths.push("Demonstrated solid overall SOC response performance.");
  }

  if (strengths.length === 0) {
    strengths.push("Reached the end of the scenario and produced a complete evaluation record.");
  }

  return strengths;
}

function buildWeaknesses({
  timedOutStages,
  coveragePercent,
  sequencePercent,
  wrongActionTotal,
  totalScore,
}) {
  const weaknesses = [];

  if (timedOutStages > 0) {
    weaknesses.push(`${timedOutStages} stage${timedOutStages === 1 ? "" : "s"} reached timeout escalation.`);
  }

  if (coveragePercent < 80) {
    weaknesses.push("Investigation coverage was incomplete in one or more stages.");
  }

  if (sequencePercent < 80) {
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
  timedOutStages,
  coveragePercent,
  sequencePercent,
  wrongActionTotal,
  totalScore,
}) {
  const recommendations = [];

  if (coveragePercent < 100) {
    recommendations.push("Review each suspicious node or path before containment to improve investigation coverage.");
  }

  if (sequencePercent < 100) {
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

function buildFinalFeedback(totalScore, dimensions) {
  const scoreBand = getScoreBand(totalScore);

  if (scoreBand === "strong") {
    return `Strong scenario performance. The learner showed effective investigation coverage, response sequencing, and containment judgment. Timing, coverage, and response quality were strong enough to support confident progression into more advanced scenarios.`;
  }

  if (scoreBand === "moderate") {
    return `Moderate scenario performance. The learner completed the scenario and demonstrated usable SOC investigation behavior, but the result shows room for improvement in timing, coverage, action sequence, or response precision. Review the weaker dimensions before attempting a harder scenario.`;
  }

  return `Scenario completed with significant improvement needed. The learner reached the final outcome, but the score and evaluation dimensions suggest difficulty with investigation coverage, timing, action order, or response quality. Replaying the scenario with focus on evidence-first reasoning is recommended.`;
}


/* CYBRAXIS_SAFE_STAGE_SUMMARY_WRAPPER_START */
function cybraxisToNumber(...values) {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }

  return 0;
}

function cybraxisNormalizeStageResultForReport(stageResult = {}, index = 0) {
  const sourceSummary =
    stageResult?.scoreSummary ||
    stageResult?.summary ||
    stageResult?.result ||
    stageResult?.evaluation ||
    {};

  const stageIndex = cybraxisToNumber(
    stageResult?.stageIndex,
    stageResult?.index,
    sourceSummary?.stageIndex,
    index
  );

  const stageId =
    stageResult?.stage?.id ||
    stageResult?.stageId ||
    stageResult?.stage_id ||
    sourceSummary?.stageId ||
    "stage-" + String(stageIndex + 1);

  const stageName =
    stageResult?.stage?.name ||
    stageResult?.stage?.title ||
    stageResult?.stageName ||
    stageResult?.stage_name ||
    sourceSummary?.stageName ||
    "Stage " + String(stageIndex + 1);

  const totalScore = cybraxisToNumber(
    sourceSummary?.totalScore,
    sourceSummary?.stageScore,
    sourceSummary?.score,
    sourceSummary?.total,
    stageResult?.totalScore,
    stageResult?.stageScore,
    stageResult?.score,
    0
  );

  const passed =
    typeof sourceSummary?.passed === "boolean"
      ? sourceSummary.passed
      : typeof stageResult?.passed === "boolean"
        ? stageResult.passed
        : totalScore >= 65;

  const timedOut =
    typeof sourceSummary?.timedOut === "boolean"
      ? sourceSummary.timedOut
      : Boolean(stageResult?.timedOut);

  const normalizedSummary = {
    ...sourceSummary,
    stageId,
    stageIndex,
    stageName,
    passed,
    timedOut,
    score: cybraxisToNumber(sourceSummary?.score, totalScore),
    stageScore: cybraxisToNumber(sourceSummary?.stageScore, totalScore),
    totalScore,
    actionAccuracy: cybraxisToNumber(sourceSummary?.actionAccuracy, sourceSummary?.action_accuracy, totalScore),
    investigationCoverage: cybraxisToNumber(sourceSummary?.investigationCoverage, sourceSummary?.investigation_coverage, totalScore),
    sequenceScore: cybraxisToNumber(sourceSummary?.sequenceScore, sourceSummary?.sequence_score, totalScore),
    evidenceInterpretation: cybraxisToNumber(sourceSummary?.evidenceInterpretation, sourceSummary?.evidence_interpretation, totalScore),
  };

  return {
    ...stageResult,
    stage: {
      ...(stageResult?.stage || {}),
      id: stageId,
      name: stageName,
      title: stageResult?.stage?.title || stageName,
      index: stageIndex,
    },
    stageId,
    stageIndex,
    stageName,
    passed,
    timedOut,
    score: totalScore,
    totalScore,
    scoreSummary: normalizedSummary,
    summary: normalizedSummary,
    result: {
      ...(stageResult?.result || {}),
      passed,
      timedOut,
      score: totalScore,
      totalScore,
    },
  };
}

function cybraxisFallbackStageSummary(stageResult = {}, index = 0) {
  const normalized = cybraxisNormalizeStageResultForReport(stageResult, index);
  const summary = normalized.scoreSummary || {};
  const totalScore = cybraxisToNumber(summary.totalScore, normalized.totalScore, 0);

  return {
    stage: normalized.stage,
    stageId: normalized.stageId,
    stageIndex: normalized.stageIndex,
    stageName: normalized.stageName,
    title: normalized.stageName,
    name: normalized.stageName,
    passed: normalized.passed,
    timedOut: normalized.timedOut,
    score: totalScore,
    totalScore,
    scoreSummary: summary,
    summary,
    actionAccuracy: cybraxisToNumber(summary.actionAccuracy, totalScore),
    investigationCoverage: cybraxisToNumber(summary.investigationCoverage, totalScore),
    sequenceScore: cybraxisToNumber(summary.sequenceScore, totalScore),
    evidenceInterpretation: cybraxisToNumber(summary.evidenceInterpretation, totalScore),
    guidanceLevel: summary.guidanceLevel || summary.guidance || "moderate",
    resultLabel: normalized.passed ? "Passed" : "Needs review",
    recommendation:
      summary.recommendation ||
      summary.feedback ||
      "Review this stage and strengthen investigation consistency.",
  };
}

function cybraxisSafeSummarizeStageResult(stageResult = {}, index = 0) {
  const normalized = cybraxisNormalizeStageResultForReport(stageResult, index);
  const fallback = cybraxisFallbackStageSummary(normalized, index);

  try {
    const summarized = summarizeStageResult(normalized, index);

    if (!summarized || typeof summarized !== "object") {
      return fallback;
    }

    return {
      ...fallback,
      ...summarized,
      stage: summarized.stage || fallback.stage,
      stageId: summarized.stageId || fallback.stageId,
      stageIndex: Number.isFinite(Number(summarized.stageIndex))
        ? Number(summarized.stageIndex)
        : fallback.stageIndex,
      stageName: summarized.stageName || summarized.name || summarized.title || fallback.stageName,
      passed:
        typeof summarized.passed === "boolean"
          ? summarized.passed
          : fallback.passed,
      timedOut:
        typeof summarized.timedOut === "boolean"
          ? summarized.timedOut
          : fallback.timedOut,
      score: cybraxisToNumber(summarized.score, summarized.totalScore, fallback.score),
      totalScore: cybraxisToNumber(summarized.totalScore, summarized.score, fallback.totalScore),
      scoreSummary: summarized.scoreSummary || fallback.scoreSummary,
      summary: summarized.summary || fallback.summary,
    };
  } catch (error) {
    console.error("CYBRAXIS_SAFE_STAGE_SUMMARY_FALLBACK", error);
    return fallback;
  }
}
/* CYBRAXIS_SAFE_STAGE_SUMMARY_WRAPPER_END */

export function createFinalScenarioReport({
  session,
  scenarioId,
  scenarioName,
  stageResults = [],
}) {
  const safeStageResults = Array.isArray(stageResults)
    ? stageResults.filter(Boolean)
    : [];

  const stageBreakdown = safeStageResults.map((stageResult, index) => {
    const summary = cybraxisSafeSummarizeStageResult(stageResult, index);

    return {
      ...summary,
      narrative: buildStageNarrative(summary),
    };
  });

  const totalScore = Math.round(
    average(stageBreakdown.map(stage => stage.score))
  );

  const totalStages = stageBreakdown.length;
  const completedStages = countStages(stageBreakdown, cybraxisStagePassedForReport);
  const timedOutStages = countStages(stageBreakdown, stage => stage.timedOut);

  const coverageCompleteCount = countStages(
    stageBreakdown,
    stage => stage.coverageComplete
  );

  const sequenceCompleteCount = countStages(
    stageBreakdown,
    stage => stage.sequenceComplete
  );

  const wrongActionTotal = sumStages(
    stageBreakdown,
    stage => stage.wrongActionCount
  );

  const stageHintTotal = sumStages(
    stageBreakdown,
    stage => stage.hintsRequested
  );

  const hintsRequestedTotal = Math.max(
    stageHintTotal,
    cybraxisReadRuntimeMentorHintCount()
  );
  const coveragePercent = percentage(coverageCompleteCount, totalStages);
  const sequencePercent = percentage(sequenceCompleteCount, totalStages);
  const completionPercent = percentage(completedStages, totalStages);
  const timingPercent = percentage(totalStages - timedOutStages, totalStages);

  const responseQualityScore = Math.max(
    0,
    Math.min(100, 100 - wrongActionTotal * 15)
  );

  const guidanceDependencyScore = Math.max(
    0,
    Math.min(100, 100 - hintsRequestedTotal * 10)
  );

  const dimensions = {
    timingEfficiency: {
      label: "Timing Efficiency",
      value: getDimensionLabel(timingPercent),
      score: timingPercent,
      detail:
        timedOutStages === 0
          ? "No stage timed out."
          : `${timedOutStages}/${totalStages} stage${timedOutStages === 1 ? "" : "s"} timed out.`,
    },

    investigationCoverage: {
      label: "Investigation Coverage",
      value: getDimensionLabel(coveragePercent),
      score: coveragePercent,
      detail: `${coverageCompleteCount}/${totalStages} stages completed required investigation coverage.`,
    },

    responseQuality: {
      label: "Response Quality",
      value: getDimensionLabel(responseQualityScore),
      score: responseQualityScore,
      detail:
        wrongActionTotal === 0
          ? "No wrong response actions recorded."
          : `${wrongActionTotal} wrong action${wrongActionTotal === 1 ? "" : "s"} recorded.`,
    },

    guidanceDependency: {
      label: "Guidance Dependency",
      value: getDimensionLabel(guidanceDependencyScore),
      score: guidanceDependencyScore,
      detail:
        hintsRequestedTotal === 0
          ? "No learner-requested hints recorded."
          : `${hintsRequestedTotal} learner-requested hint${hintsRequestedTotal === 1 ? "" : "s"} recorded.`,
    },

    sequenceQuality: {
      label: "Sequence Quality",
      value: getDimensionLabel(sequencePercent),
      score: sequencePercent,
      detail: `${sequenceCompleteCount}/${totalStages} stages followed the expected action sequence.`,
    },

    completion: {
      label: "Scenario Completion",
      value: getDimensionLabel(completionPercent),
      score: completionPercent,
      detail: `${completedStages}/${totalStages} stages passed.`,
    },
  };

  const reportContext = {
    totalScore,
    completedStages,
    totalStages,
    timedOutStages,
    coveragePercent,
    sequencePercent,
    wrongActionTotal,
  };

  return {
    id: `final-report-${scenarioId}-${Date.now()}`,

    sessionId: session?.id || null,

    scenario: {
      id: scenarioId,
      name: scenarioName,
    },

    totalScore,

    summary: {
      completedStages,
      totalStages,
      timedOutStages,
      wrongActionTotal,
      hintsRequestedTotal,
      coveragePercent,
      sequencePercent,
      completionPercent,
      timingPercent,
    },

    stageBreakdown,

    dimensions,

    strengths: buildStrengths(reportContext),
    weaknesses: buildWeaknesses(reportContext),
    recommendations: buildRecommendations(reportContext),

    finalFeedback: buildFinalFeedback(totalScore, dimensions),

    createdAt: new Date().toISOString(),
  };
}