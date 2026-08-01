function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(value, max));
}

function evaluateStageCompletion({
  isNewCorrectAction = false,
  completedStageActionsCount = 0,
  currentStageScore = 0,
  correctActionScore = 0,
  maxScore = 100,
  passScore = 0,
  minimumActionsToPass = 1,
  preferredActionOrder = [],
  projectedActionHistory = [],
  investigationTargetCoverage = null,
  stage = {},
  stageIndex = 0,
  totalStages = 1,
} = {}) {
  const projectedCompletedActionsCount = isNewCorrectAction
    ? completedStageActionsCount + 1
    : completedStageActionsCount;

  const projectedStageScore = isNewCorrectAction
    ? clamp(currentStageScore + correctActionScore, 0, maxScore)
    : clamp(currentStageScore, 0, maxScore);

  const baseStagePassed =
    projectedStageScore >= passScore &&
    projectedCompletedActionsCount >= minimumActionsToPass;

  let orderStatus = null;

  if (baseStagePassed && preferredActionOrder.length > 0) {
    const isOrderCorrect = preferredActionOrder.every(
      (action, index) => projectedActionHistory[index] === action
    );

    orderStatus = isOrderCorrect ? "correct" : "wrong";
  }

  const coverageSatisfied = Boolean(
    investigationTargetCoverage?.allRequiredCoverageComplete
  );

  const finalStagePassed = Boolean(baseStagePassed && coverageSatisfied);

  const shouldLockOnSuccess =
    stage?.time_pressure?.lock_stage_on_success !== false;

  const isLastStage = stageIndex >= totalStages - 1;

  const transitionReady = finalStagePassed;

  const transition = finalStagePassed
    ? {
        reason: isLastStage ? "scenario_complete" : "completed",
        nextStageIndex: isLastStage ? null : Math.min(stageIndex + 1, totalStages - 1),
        showFinalReport: isLastStage,
      }
    : null;

  return {
    baseStagePassed,
    coverageSatisfied,
    finalStagePassed,

    projectedCompletedActionsCount,
    projectedStageScore,
    orderStatus,

    shouldLockOnSuccess,
    transitionReady,
    transition,
  };
}

function compareStageCompletion({
  frontendStageCompletion = null,
  backendStageCompletion = null,
} = {}) {
  const frontend = frontendStageCompletion || {};
  const backend = backendStageCompletion || {};

  const checks = {
    baseStagePassed:
      Boolean(frontend.baseStagePassed) === Boolean(backend.baseStagePassed),

    coverageSatisfied:
      Boolean(frontend.coverageSatisfied) === Boolean(backend.coverageSatisfied),

    finalStagePassed:
      Boolean(frontend.finalStagePassed) === Boolean(backend.finalStagePassed),

    projectedCompletedActionsCount:
      Number(frontend.projectedCompletedActionsCount || 0) ===
      Number(backend.projectedCompletedActionsCount || 0),

    projectedStageScore:
      Number(frontend.projectedStageScore || 0) ===
      Number(backend.projectedStageScore || 0),

    orderStatus:
      (frontend.orderStatus || null) === (backend.orderStatus || null),

    shouldLockOnSuccess:
      Boolean(frontend.shouldLockOnSuccess) ===
      Boolean(backend.shouldLockOnSuccess),

    transitionReady:
      Boolean(frontend.transitionReady) === Boolean(backend.transitionReady),
  };

  const matches = Object.values(checks).every(Boolean);

  return {
    matches,
    checks,
    frontend,
    backend,
    checkedAt: new Date().toISOString(),
  };
}

module.exports = {
  evaluateStageCompletion,
  compareStageCompletion,
};