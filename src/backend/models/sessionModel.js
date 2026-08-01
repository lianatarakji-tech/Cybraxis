export const SESSION_STATUS = {
  ACTIVE: "active",
  COMPLETED: "completed",
  ABANDONED: "abandoned",
  FAILED: "failed",
};

export function createSessionRecord({
  scenarioId,
  scenarioName = null,
  userId = "local-user",
  startedAt = new Date().toISOString(),
}) {
  return {
    id: `session-${scenarioId}-${Date.now()}`,

    userId,

    scenario: {
      id: scenarioId,
      name: scenarioName,
    },

    status: SESSION_STATUS.ACTIVE,

    progress: {
      currentStageIndex: 0,
      completedStageIds: [],
      totalStages: 0,
    },

    events: [],
    stageResults: [],

    finalReport: null,

    createdAt: startedAt,
    updatedAt: startedAt,
    endedAt: null,
  };
}

export function addEventToSession(session, event) {
  return {
    ...session,
    events: [...(session.events || []), event],
    updatedAt: new Date().toISOString(),
  };
}

export function addStageResultToSession(session, stageResult) {
  const completedStageIds = new Set([
    ...(session.progress?.completedStageIds || []),
    stageResult.stage.id,
  ]);

  return {
    ...session,
    stageResults: [...(session.stageResults || []), stageResult],
    progress: {
      ...session.progress,
      completedStageIds: Array.from(completedStageIds),
      currentStageIndex: Math.max(
        session.progress?.currentStageIndex || 0,
        stageResult.stage.index
      ),
    },
    updatedAt: new Date().toISOString(),
  };
}

export function completeSession(session, finalReport = null) {
  return {
    ...session,
    status: SESSION_STATUS.COMPLETED,
    finalReport,
    endedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}