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

export async function evaluateRuntimeStateBackend({
  sessionId,
  scenarioId = null,
  actionId,
  selectedNodeId,
  selectedAlertId,
  timestamp,
  frontendDecision,
}) {
  if (!sessionId) {
    throw new Error("sessionId is required for backend runtime state evaluation");
  }

  if (!actionId) {
    throw new Error("actionId is required for backend runtime state evaluation");
  }

  return requestJson(`/sessions/${sessionId}/runtime-state/evaluate`, {
    method: "POST",
    body: JSON.stringify({
      scenarioId,
      actionId,
      selectedNodeId,
      selectedAlertId,
      timestamp,
      frontendDecision,
    }),
  });
}
