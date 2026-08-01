function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function getStageTimeLimit(stage = {}) {
  return stage?.time_pressure?.time_limit_seconds || 0;
}

function shouldLockStageOnTimeout(stage = {}) {
  return stage?.time_pressure?.lock_stage_on_timeout !== false;
}

function isTimeoutTerminal(stage = {}, isLastStage = false) {
  const timeoutBehavior = stage?.time_pressure?.timeout_behavior;

  return Boolean(
    isLastStage ||
    timeoutBehavior === "complete_degraded"
  );
}

function getTimeoutFeedbackText(stage = {}) {
  return (
    stage?.mentor?.timeout_feedback ||
    stage?.time_pressure?.timeout_mentor_feedback ||
    "Time expired. The attacker advanced the campaign before the stage was contained."
  );
}

function getTimeoutWarningText(stage = {}) {
  return (
    stage?.mentor?.timeout_warning ||
    stage?.time_pressure?.timeout_warning ||
    "Time pressure is increasing. Prioritize required investigation before the attacker escalates."
  );
}

function buildTimeoutLog({
  stage = {},
  stageId = null,
  timestamp = null,
} = {}) {
  const timeoutLogMessage = stage?.time_pressure?.timeout_log_message;

  if (!timeoutLogMessage) return null;

  return {
    idPrefix: "timeout",
    stageId,
    time: timestamp,
    msg: timeoutLogMessage,
    type: "timeout",
    severity: "high",
  };
}

function getNextStageModifier(stage = {}) {
  return stage?.time_pressure?.next_stage_modifier || null;
}

function getFinalOutcomeModifier(stage = {}) {
  return stage?.time_pressure?.final_outcome_modifier || null;
}

function getEscalationForNextStage({
  scenario = {},
  currentStageIndex = 0,
  currentStage = {},
  isLastStage = false,
} = {}) {
  if (isLastStage) return null;

  const modifier = getNextStageModifier(currentStage);
  if (!modifier) return null;

  const nextStage = scenario?.stages?.[currentStageIndex + 1];
  if (!nextStage?.id) return null;

  return {
    nextStageId: nextStage.id,
    modifier,
  };
}

function getDegradedCompletionText(stage = {}) {
  return (
    getFinalOutcomeModifier(stage)?.mentor_context ||
    "Scenario ended with degraded containment due to timeout."
  );
}

function buildTimeoutScoreInput({
  stageId = null,
  investigationTargetCoverage = null,
  actionHistory = [],
  preferredActionOrder = [],
  stage = {},
  wrongActionCount = 0,
} = {}) {
  return {
    stageId,
    passed: false,
    timedOut: true,
    investigationTargetCoverage,
    actionHistory: normalizeArray(actionHistory),
    preferredActionOrder: normalizeArray(preferredActionOrder),
    timeLimitSeconds: getStageTimeLimit(stage),
    timeRemaining: 0,
    wrongActionCount,
    prematureContainmentCount: 0,
    wrongAbstractionLevelCount: 0,
  };
}

function buildTimeoutEscalationDecision({
  scenario = {},
  stage = {},
  stageId = null,
  stageIndex = 0,
  totalStages = 1,
  isLastStage = false,
  timestamp = null,
  investigationTargetCoverage = null,
  actionHistory = [],
  preferredActionOrder = [],
  wrongActionCount = 0,
} = {}) {
  const lockStage = shouldLockStageOnTimeout(stage);
  const terminal = isTimeoutTerminal(stage, isLastStage);

  const timeoutLog = buildTimeoutLog({
    stage,
    stageId,
    timestamp,
  });

  const nextStageEscalation = getEscalationForNextStage({
    scenario,
    currentStageIndex: stageIndex,
    currentStage: stage,
    isLastStage,
  });

  const timeoutScoreInput = buildTimeoutScoreInput({
    stageId,
    investigationTargetCoverage,
    actionHistory,
    preferredActionOrder,
    stage,
    wrongActionCount,
  });

  const mentorHint = {
    trigger: "TIMEOUT",
    text: getTimeoutFeedbackText(stage),
  };

  let degradedCompletion = null;
  let transition = null;

  if (terminal) {
    degradedCompletion = {
      text: getDegradedCompletionText(stage),
      trigger: "COMPLETE_DEGRADED",
    };

    transition = isLastStage
      ? {
          reason: "scenario_complete_degraded",
          nextStageIndex: null,
          label: "View Final Report",
          showFinalReport: true,
        }
      : null;
  } else {
    transition = {
      reason: "timeout",
      nextStageIndex: Math.min(stageIndex + 1, totalStages - 1),
      label: "Continue to Escalated Stage",
      showFinalReport: false,
    };
  }

  return {
    stageId,
    stageIndex,
    timerState: "expired",
    timeRemaining: 0,

    lockStage,
    lockReason: lockStage ? "timeout" : null,

    terminal,
    timeoutScoreInput,
    mentorHint,
    timeoutWarningText: getTimeoutWarningText(stage),
    timeoutLog,
    nextStageEscalation,
    degradedCompletion,
    transition,

    stageTransitionPending: !terminal || Boolean(transition),
  };
}

function normalizeDecision(decision = {}) {
  return {
    stageId: decision.stageId || null,
    stageIndex: Number(decision.stageIndex || 0),
    timerState: decision.timerState || null,
    timeRemaining: Number(decision.timeRemaining || 0),

    lockStage: Boolean(decision.lockStage),
    lockReason: decision.lockReason || null,

    terminal: Boolean(decision.terminal),

    timeoutScoreInput: decision.timeoutScoreInput || null,
    mentorHint: decision.mentorHint || null,
    timeoutLog: decision.timeoutLog
      ? {
          msg: decision.timeoutLog.msg || null,
          type: decision.timeoutLog.type || null,
          severity: decision.timeoutLog.severity || null,
        }
      : null,

    nextStageEscalation: decision.nextStageEscalation || null,
    degradedCompletion: decision.degradedCompletion || null,
    transition: decision.transition || null,
    stageTransitionPending: Boolean(decision.stageTransitionPending),
  };
}

function compareTimeoutEscalationDecision({
  frontendDecision = {},
  backendDecision = {},
} = {}) {
  const frontend = normalizeDecision(frontendDecision);
  const backend = normalizeDecision(backendDecision);

  const checks = {
    stageId: frontend.stageId === backend.stageId,
    stageIndex: frontend.stageIndex === backend.stageIndex,
    timerState: frontend.timerState === backend.timerState,
    timeRemaining: frontend.timeRemaining === backend.timeRemaining,
    lockStage: frontend.lockStage === backend.lockStage,
    lockReason: frontend.lockReason === backend.lockReason,
    terminal: frontend.terminal === backend.terminal,
    timeoutScoreInput:
      JSON.stringify(frontend.timeoutScoreInput) ===
      JSON.stringify(backend.timeoutScoreInput),
    mentorHint:
      JSON.stringify(frontend.mentorHint) ===
      JSON.stringify(backend.mentorHint),
    timeoutLog:
      JSON.stringify(frontend.timeoutLog) ===
      JSON.stringify(backend.timeoutLog),
    nextStageEscalation:
      JSON.stringify(frontend.nextStageEscalation) ===
      JSON.stringify(backend.nextStageEscalation),
    degradedCompletion:
      JSON.stringify(frontend.degradedCompletion) ===
      JSON.stringify(backend.degradedCompletion),
    transition:
      JSON.stringify(frontend.transition) ===
      JSON.stringify(backend.transition),
    stageTransitionPending:
      frontend.stageTransitionPending === backend.stageTransitionPending,
  };

  return {
    matches: Object.values(checks).every(Boolean),
    checks,
    frontend,
    backend,
    checkedAt: new Date().toISOString(),
  };
}

module.exports = {
  buildTimeoutEscalationDecision,
  compareTimeoutEscalationDecision,

  getStageTimeLimit,
  shouldLockStageOnTimeout,
  isTimeoutTerminal,
  getTimeoutFeedbackText,
  getTimeoutWarningText,
  buildTimeoutLog,
  getEscalationForNextStage,
  getDegradedCompletionText,
};