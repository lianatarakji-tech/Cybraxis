const API_BASE_URL = "http://localhost:5000/api";

async function requestJson(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `API request failed: ${response.status}`);
  }

  return data;
}

export async function evaluateStageCompletionBackend({
  sessionId,
  scenario = null,
  stage = null,
  scenarioId = null,
  stageId = null,
  stageIndex,
  totalStages,

  isNewCorrectAction,
  completedStageActionsCount,
  currentStageScore,
  correctActionScore,
  maxScore,
  passScore,
  minimumActionsToPass,
  preferredActionOrder,
  projectedActionHistory,
  investigationTargetCoverage,

  frontendStageCompletion,
}) {
  if (!sessionId) {
    throw new Error("sessionId is required for backend stage completion evaluation");
  }

  const effectiveScenarioId =
    scenarioId || scenario?.scenario_id || scenario?.id || null;

  const effectiveStageId =
    stageId || stage?.id || null;

  if (!effectiveStageId) {
    throw new Error("stageId is required for backend stage completion evaluation");
  }

  return requestJson(`/sessions/${sessionId}/stage-completion/evaluate`, {
    method: "POST",
    body: JSON.stringify({
      scenarioId: effectiveScenarioId,
      stageId: effectiveStageId,
      stageIndex,
      totalStages,

      isNewCorrectAction,
      completedStageActionsCount,
      currentStageScore,
      correctActionScore,
      maxScore,
      passScore,
      minimumActionsToPass,
      preferredActionOrder,
      projectedActionHistory,
      investigationTargetCoverage,

      frontendStageCompletion,
    }),
  });
}
