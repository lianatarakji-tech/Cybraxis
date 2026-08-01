import { nowStr } from "./runtimeState";

export function getNextStageModifier(stage) {
  return stage?.time_pressure?.next_stage_modifier || null;
}

export function getFinalOutcomeModifier(stage) {
  return stage?.time_pressure?.final_outcome_modifier || null;
}

export function buildTimeoutLog(stage, stageId) {
  const timeoutLogMessage = stage?.time_pressure?.timeout_log_message;

  if (!timeoutLogMessage) return null;

  const timestamp = nowStr();

  return {
    id: `timeout-${stageId}-${timestamp}`,
    time: timestamp,
    msg: timeoutLogMessage,
    type: "timeout",
    severity: "high",
  };
}

export function getEscalationForNextStage({
  scenario,
  currentStageIndex,
  currentStage,
  isLastStage,
}) {
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

export function applyEscalationToRuntime({
  initialRuntime,
  escalation,
}) {
  if (!escalation) return initialRuntime;

  const nodeStatusChanges = escalation.node_status_changes || {};

  return Object.entries(nodeStatusChanges).reduce(
    (runtime, [nodeId, status]) => ({
      ...runtime,
      [nodeId]: {
        ...runtime[nodeId],
        status,
        activity: escalation.mentor_context || runtime[nodeId]?.activity,
        interpretation:
          escalation.mentor_context ||
          runtime[nodeId]?.interpretation,
      },
    }),
    initialRuntime
  );
}

export function mergeEscalationLogs(baseLogs, escalation) {
  const extraLogs = escalation?.extra_logs || [];
  return [...baseLogs, ...extraLogs];
}

export function getEscalatedStageHint(stage, escalation) {
  return (
    escalation?.mentor_context ||
    stage?.mentor?.stage_hint ||
    stage?.mentor_hint
  );
}

export function getDegradedCompletionText(stage) {
  return (
    getFinalOutcomeModifier(stage)?.mentor_context ||
    "Scenario ended with degraded containment due to timeout."
  );
}