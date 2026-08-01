const {
  buildScenarioEvaluation,
} = require("../scoring/scoringEngine");

function makeFinalReportId(scenarioId) {
  return `final-report-${scenarioId || "scenario"}-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;
}

function countStageResults(stageResults = [], predicate) {
  return stageResults.filter(predicate).length;
}

function sumStageResults(stageResults = [], selector) {
  return stageResults.reduce((sum, stage) => sum + (selector(stage) || 0), 0);
}

function buildReportSummary(stageBreakdown = []) {
  const totalStages = stageBreakdown.length;

  const completedStages = countStageResults(
    stageBreakdown,
    stage => stage.passed
  );

  const timedOutStages = countStageResults(
    stageBreakdown,
    stage => stage.timedOut
  );

  const wrongActionTotal = sumStageResults(
    stageBreakdown,
    stage => stage.wrongActionCount
  );

  const hintsRequestedTotal = sumStageResults(
    stageBreakdown,
    stage => stage.hintsRequested
  );

  const coverageCompleteCount = countStageResults(
    stageBreakdown,
    stage => stage.coverageComplete
  );

  const sequenceCompleteCount = countStageResults(
    stageBreakdown,
    stage => stage.sequenceComplete
  );

  const percent = (part, total) => {
    if (!total) return 0;
    return Math.round((part / total) * 100);
  };

  return {
    completedStages,
    totalStages,
    timedOutStages,
    wrongActionTotal,
    hintsRequestedTotal,
    coveragePercent: percent(coverageCompleteCount, totalStages),
    sequencePercent: percent(sequenceCompleteCount, totalStages),
    completionPercent: percent(completedStages, totalStages),
    timingPercent: percent(totalStages - timedOutStages, totalStages),
  };
}

function normalizeStageResultRow(row = {}) {
  return {
    id: row.id,

    stageId: row.stage_id || row.stageId || row.stage?.id,
    stageName: row.stage_name || row.stageName || row.stage?.name,
    stageIndex: row.stage_index ?? row.stageIndex ?? row.stage?.index,

    passed: row.passed ?? row.outcome?.passed ?? false,
    timedOut: row.timed_out ?? row.timedOut ?? row.outcome?.timedOut ?? false,
    lockReason: row.lock_reason || row.lockReason || row.outcome?.lockReason || null,

    scoreSummary: row.score_summary || row.scoreSummary || row.scoring || null,

    evaluation:
      row.score_summary?.evaluation ||
      row.scoreSummary?.evaluation ||
      row.scoring?.evaluation ||
      row.evaluation ||
      null,

    totalStageScore:
      row.score_summary?.totalStageScore ??
      row.scoreSummary?.totalStageScore ??
      row.scoring?.totalStageScore ??
      row.totalStageScore ??
      row.score ??
      0,

    wrongActionCount:
      row.wrong_action_count ??
      row.wrongActionCount ??
      row.performance?.wrongActionCount ??
      0,

    hintsRequested:
      row.hints_requested ??
      row.hintsRequested ??
      row.performance?.hintsRequested ??
      0,

    timeLimitSeconds:
      row.time_limit_seconds ??
      row.timeLimitSeconds ??
      row.performance?.timeLimitSeconds ??
      null,

    timeRemaining:
      row.time_remaining ??
      row.timeRemaining ??
      row.performance?.timeRemaining ??
      null,

    actionHistory:
      row.action_history ||
      row.actionHistory ||
      row.performance?.actionHistory ||
      [],

    escalation: row.escalation || null,
  };
}

function buildFinalScenarioReport({
  session = null,
  scenarioId,
  scenarioName,
  stageResults = [],
  reportId = null,
} = {}) {
  const normalizedStageResults = stageResults.map(normalizeStageResultRow);

  const evaluation = buildScenarioEvaluation({
    stageResults: normalizedStageResults,
  });

  const summary = buildReportSummary(evaluation.stageBreakdown);

  return {
    id: reportId || makeFinalReportId(scenarioId),

    sessionId: session?.id || session?.session_id || null,

    scenario: {
      id: scenarioId || session?.scenario_id || session?.scenario?.id || "unknown-scenario",
      name: scenarioName || session?.scenario_name || session?.scenario?.name || "Untitled Scenario",
    },

    totalScore: evaluation.totalScore,
    scoreBand: evaluation.scoreBand,

    summary,

    stageBreakdown: evaluation.stageBreakdown,
    dimensions: evaluation.dimensions,

    strengths: evaluation.strengths,
    weaknesses: evaluation.weaknesses,
    recommendations: evaluation.recommendations,

    finalFeedback: evaluation.finalFeedback,

    reportSource: "backend-report-service",
    createdAt: new Date().toISOString(),
  };
}

module.exports = {
  buildFinalScenarioReport,
  normalizeStageResultRow,
  buildReportSummary,
};