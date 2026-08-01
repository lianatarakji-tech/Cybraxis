export const TIMER_STATES = {
  NORMAL: "normal",
  WARNING: "warning",
  EXPIRED: "expired",
  COMPLETED: "completed",
};

export const STAGE_LOCK_REASONS = {
  COMPLETED: "completed",
  TIMEOUT: "timeout",
};

export function getStageTimeLimit(stage) {
  return stage?.time_pressure?.time_limit_seconds || 0;
}

export function getWarningThreshold(stage) {
  return stage?.time_pressure?.warning_threshold ?? 0.7;
}

export function getWarningSecond(stage) {
  const limit = getStageTimeLimit(stage);
  const threshold = getWarningThreshold(stage);

  return Math.ceil(limit * (1 - threshold));
}

export function getAutoAdvanceDelay(stage) {
  return stage?.time_pressure?.auto_advance_delay_ms || 2500;
}

export function shouldLockStageOnTimeout(stage) {
  return stage?.time_pressure?.lock_stage_on_timeout !== false;
}

export function shouldLockStageOnSuccess(stage) {
  return stage?.time_pressure?.lock_stage_on_success !== false;
}

export function isTimeoutTerminal(stage, isLastStage) {
  const timeoutBehavior = stage?.time_pressure?.timeout_behavior;

  return Boolean(
    isLastStage ||
    timeoutBehavior === "complete_degraded"
  );
}

export function getTimeoutWarningText(stage) {
  return (
    stage?.mentor?.timeout_warning ||
    stage?.time_pressure?.timeout_warning ||
    "Time pressure is increasing. Prioritize required investigation before the attacker escalates."
  );
}

export function getTimeoutFeedbackText(stage) {
  return (
    stage?.mentor?.timeout_feedback ||
    stage?.time_pressure?.timeout_mentor_feedback ||
    "Time expired. The attacker advanced the campaign before the stage was contained."
  );
}

export function getStageLockedMessage(lockReason) {
  if (lockReason === STAGE_LOCK_REASONS.TIMEOUT) {
    return "This stage has already escalated. Actions are locked until the next stage begins.";
  }

  return "This stage has already been secured. Actions are locked while the simulator advances.";
}