
/* CYBRAXIS_STAGE_RESULT_RUNTIME_NORMALIZER_START */
function normalizeCybraxisStageResult(stageResult = {}) {
  const fallbackIndex = Number(stageResult?.stageIndex ?? stageResult?.index ?? 0);
  const fallbackStageId =
    stageResult?.stageId ||
    stageResult?.stage_id ||
    stageResult?.id ||
    "stage-" + String(fallbackIndex + 1);

  const fallbackStageName =
    stageResult?.stageName ||
    stageResult?.stage_name ||
    stageResult?.name ||
    stageResult?.title ||
    "Stage " + String(fallbackIndex + 1);

  const sourceStage = stageResult?.stage || stageResult?.scenarioStage || {};
  const sourceSummary =
    stageResult?.scoreSummary ||
    stageResult?.summary ||
    stageResult?.result ||
    stageResult?.evaluation ||
    {};

  const numericScore = Number(
    sourceSummary?.score ??
    sourceSummary?.stageScore ??
    sourceSummary?.totalScore ??
    sourceSummary?.total ??
    stageResult?.score ??
    stageResult?.stageScore ??
    stageResult?.totalScore ??
    0
  );

  const safeScore = Number.isFinite(numericScore) ? numericScore : 0;

  const safePassed =
    typeof sourceSummary?.passed === "boolean"
      ? sourceSummary.passed
      : typeof stageResult?.passed === "boolean"
        ? stageResult.passed
        : safeScore >= 65;

  const safeTimedOut =
    typeof sourceSummary?.timedOut === "boolean"
      ? sourceSummary.timedOut
      : Boolean(stageResult?.timedOut);

  const safeStage = {
    ...sourceStage,
    id:
      sourceStage?.id ||
      fallbackStageId,
    name:
      sourceStage?.name ||
      sourceStage?.title ||
      fallbackStageName,
    title:
      sourceStage?.title ||
      sourceStage?.name ||
      fallbackStageName,
    index: Number.isFinite(Number(sourceStage?.index))
      ? Number(sourceStage.index)
      : fallbackIndex,
  };

  const safeSummary = {
    ...sourceSummary,
    passed: safePassed,
    timedOut: safeTimedOut,
    score: safeScore,
    stageScore: sourceSummary?.stageScore ?? safeScore,
    totalScore: sourceSummary?.totalScore ?? safeScore,
  };

  return {
    ...stageResult,
    stage: safeStage,
    stageId: stageResult?.stageId || safeStage.id,
    stageIndex: Number.isFinite(Number(stageResult?.stageIndex))
      ? Number(stageResult.stageIndex)
      : safeStage.index,
    stageName: stageResult?.stageName || safeStage.name,
    passed: safePassed,
    timedOut: safeTimedOut,
    scoreSummary: safeSummary,
    summary: safeSummary,
    result: {
      ...(stageResult?.result || {}),
      passed: safePassed,
      timedOut: safeTimedOut,
      score: safeScore,
    },
  };
}
/* CYBRAXIS_STAGE_RESULT_RUNTIME_NORMALIZER_END */



export function createStageResultRecord({
  sessionId = null,
  scenarioId = null,
  stageId,
  stageIndex,
  stageName = null,

  passed = false,
  timedOut = false,
  lockReason = null,

  scoreSummary = null,
  guidanceProfile = null,
  investigationTargetCoverage = null,
  investigationCoverage = null,

  preferredActionOrder = [],
  actionHistory = [],
  wrongActionCount = 0,
  hintsRequested = 0,

  timeLimitSeconds = null,
  timeRemaining = null,

  escalation = null,

  createdAt = new Date().toISOString(),
}) {
  return {
    id: `stage-result-${stageId}-${Date.now()}`,

    sessionId,
    scenarioId,

    stage: {
      id: stageId,
      index: stageIndex,
      name: stageName,
    },

    outcome: {
      passed,
      timedOut,
      lockReason,
    },

    scoring: scoreSummary,

    guidance: guidanceProfile,

    investigation: {
      dimensionCoverage: investigationCoverage,
      targetCoverage: investigationTargetCoverage,
    },

    performance: {
      actionHistory,
      preferredActionOrder,
      wrongActionCount,
      hintsRequested,
      timeLimitSeconds,
      timeRemaining,
    },

    escalation,

    createdAt,
  };
}

export function summarizeStageResult(stageResult) {
  /* CYBRAXIS_STAGE_RESULT_RUNTIME_NORMALIZER_APPLIED */
  stageResult = normalizeCybraxisStageResult(stageResult);
  /* CYBRAXIS_STAGE_RESULT_NORMALIZER_APPLIED */
  stageResult = normalizeCybraxisStageResult(stageResult);
  /* CYBRAXIS_STAGE_RESULT_NORMALIZER_APPLIED */
  stageResult = normalizeCybraxisStageResult(stageResult);
  return {
    stageId:
      stageResult.stage?.id ||
      stageResult.stageId ||
      stageResult.scoreSummary?.stageId ||
      "stage-" + String(Number(stageResult.stageIndex ?? 0) + 1),
    stageName:
      stageResult.stage?.name ||
      stageResult.stage?.title ||
      stageResult.stageName ||
      stageResult.scoreSummary?.stageName ||
      "Stage " + String(Number(stageResult.stageIndex ?? 0) + 1),
    passed:
      stageResult.outcome?.passed ??
      stageResult.scoreSummary?.passed ??
      stageResult.summary?.passed ??
      stageResult.passed ??
      false,
    timedOut:
      stageResult.outcome?.timedOut ??
      stageResult.scoreSummary?.timedOut ??
      stageResult.summary?.timedOut ??
      stageResult.timedOut ??
      false,
    score:
      stageResult.scoring?.totalStageScore ??
      stageResult.scoreSummary?.totalStageScore ??
      stageResult.scoreSummary?.stageScore ??
      stageResult.scoreSummary?.score ??
      stageResult.summary?.totalStageScore ??
      stageResult.summary?.stageScore ??
      stageResult.summary?.score ??
      stageResult.totalScore ??
      stageResult.score ??
      0,
    coverageComplete:
      stageResult.scoring?.evaluation?.coverageComplete ??
      stageResult.investigation?.targetCoverage?.allRequiredCoverageComplete ??
      false,
    sequenceComplete:
      stageResult.scoring?.evaluation?.sequenceComplete ?? false,
    guidanceLevel:
      stageResult.guidance?.currentGuidanceLevel || "moderate",
    wrongActionCount:
      stageResult.performance?.wrongActionCount ?? 0,
  };
}