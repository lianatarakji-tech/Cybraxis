export const EVENT_TYPES = {
  INVESTIGATION: "investigation",
  RESPONSE_ACTION: "response_action",
  MENTOR_HINT: "mentor_hint",
  TIMER_WARNING: "timer_warning",
  TIMEOUT: "timeout",
  STAGE_STARTED: "stage_started",
  STAGE_COMPLETED: "stage_completed",
  STAGE_ESCALATED: "stage_escalated",
  SYSTEM: "system",
};

export function createBaseEvent({
  sessionId = null,
  scenarioId = null,
  stageId = null,
  stageIndex = null,
  type = EVENT_TYPES.SYSTEM,
  timestamp = new Date().toISOString(),
  payload = {},
}) {
  return {
    id: `${type}-${stageId || "stage"}-${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}`,
    sessionId,
    scenarioId,
    stageId,
    stageIndex,
    type,
    timestamp,
    payload,
  };
}

export function createInvestigationEventRecord({
  sessionId,
  scenarioId,
  stageId,
  stageIndex,
  investigationEvent,
}) {
  return createBaseEvent({
    sessionId,
    scenarioId,
    stageId,
    stageIndex,
    type: EVENT_TYPES.INVESTIGATION,
    payload: {
      investigationEvent,
    },
  });
}

export function createResponseActionEventRecord({
  sessionId,
  scenarioId,
  stageId,
  stageIndex,
  actionId,
  scenarioAction,
  selectedNodeId = null,
  selectedAlertId = null,
  outcome = null,
  scoreDelta = 0,
}) {
  return createBaseEvent({
    sessionId,
    scenarioId,
    stageId,
    stageIndex,
    type: EVENT_TYPES.RESPONSE_ACTION,
    payload: {
      actionId,
      scenarioAction,
      selectedNodeId,
      selectedAlertId,
      outcome,
      scoreDelta,
    },
  });
}

export function createMentorEventRecord({
  sessionId,
  scenarioId,
  stageId,
  stageIndex,
  trigger,
  text,
  guidanceLevel = null,
  reasonCodes = [],
}) {
  return createBaseEvent({
    sessionId,
    scenarioId,
    stageId,
    stageIndex,
    type: EVENT_TYPES.MENTOR_HINT,
    payload: {
      trigger,
      text,
      guidanceLevel,
      reasonCodes,
    },
  });
}

export function createTimerEventRecord({
  sessionId,
  scenarioId,
  stageId,
  stageIndex,
  type,
  timeRemaining = null,
  timeLimitSeconds = null,
}) {
  return createBaseEvent({
    sessionId,
    scenarioId,
    stageId,
    stageIndex,
    type,
    payload: {
      timeRemaining,
      timeLimitSeconds,
    },
  });
}