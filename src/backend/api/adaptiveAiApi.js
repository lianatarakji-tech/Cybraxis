const DEFAULT_AI_ENDPOINT =
  process.env.REACT_APP_CYBRAXIS_AI_ENDPOINT ||
  "http://localhost:8787/api/ai/adaptive-intervention";

const AI_REQUEST_TIMEOUT_MS = 12000;

function uniqueList(values = []) {
  return Array.from(
    new Set(
      values
        .filter(Boolean)
        .map(value => String(value).trim())
        .filter(Boolean)
    )
  );
}

function compactLog(log) {
  return {
    id: log?.id || null,
    time: log?.time || null,
    severity: log?.severity || null,
    message: log?.msg || log?.message || log?.event || null,
    relatedNode: log?.relatedNode || log?.nodeId || null,
  };
}

function getMissedEvidence(investigationTargetCoverage, requiredCoverageDimensions) {
  const missed = [];

  if (Array.isArray(investigationTargetCoverage?.missingDimensions)) {
    missed.push(...investigationTargetCoverage.missingDimensions);
  }

  if (
    investigationTargetCoverage?.allRequiredCoverageComplete === false &&
    Array.isArray(requiredCoverageDimensions)
  ) {
    missed.push(...requiredCoverageDimensions);
  }

  return uniqueList(missed);
}

export function buildAdaptiveLearnerFactPack({
  scenario,
  stage,
  stageId,
  stageIndex,
  selectedNodeId,
  selectedAlert,
  displayedLogs,
  actionLogs,
  actionHistory,
  investigationCoverage,
  investigationTargetCoverage,
  requiredCoverageDimensions,
  mentorGuidanceProfile,
  stageScoreSummary,
  wrongActionCount,
  hintsRequested,
  stageTimerState,
  stageLocked,
  stageLockReason,
  trigger,
  reasonCodes = [],
  wrongActions = [],
}) {
  const logs = [...(displayedLogs || []), ...(actionLogs || [])].filter(Boolean);

  return {
    scenarioId: scenario?.scenario_id || scenario?.id || "unknown_scenario",
    scenarioName: scenario?.name || "Unknown scenario",
    stageId: stage?.id || stageId || null,
    stageIndex,
    scenarioStatus: "in_progress",
    trigger,

    currentStage: {
      id: stage?.id || stageId || null,
      name: stage?.name || stage?.label || stageId || "Current stage",
      learningObjective:
        stage?.learning_objective ||
        stage?.learningObjective ||
        stage?.description ||
        null,
      difficulty: stage?.difficulty || "easy",
    },

    selection: {
      selectedNodeId,
      selectedAlertId: selectedAlert?.id || null,
      selectedAlertText:
        selectedAlert?.event ||
        selectedAlert?.message ||
        selectedAlert?.description ||
        null,
      selectedAlertSeverity: selectedAlert?.severity || null,
    },

    learnerState: {
      actionHistory: uniqueList(actionHistory || []),
      wrongActions: uniqueList(wrongActions),
      missedEvidence: getMissedEvidence(
        investigationTargetCoverage,
        requiredCoverageDimensions
      ),
      wrongActionCount,
      hintCount: hintsRequested,
      stageTimerState,
      stageLocked,
      stageLockReason,
    },

    investigation: {
      investigationCoverage,
      investigationTargetCoverage,
      requiredCoverageDimensions,
    },

    scoring: {
      stageScoreSummary,
      mentorGuidanceProfile,
    },

    evidenceContext: {
      recentLogs: logs.slice(-8).map(compactLog),
      displayedLogCount: (displayedLogs || []).length,
      actionLogCount: (actionLogs || []).length,
    },

    reasonCodes: uniqueList([
      ...(mentorGuidanceProfile?.reasonCodes || []),
      ...reasonCodes,
    ]),
  };
}

export async function requestAdaptiveIntervention(factPack) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(DEFAULT_AI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ factPack }),
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(
        payload?.error ||
        payload?.message ||
        `Backend AI request failed with HTTP ${response.status}`
      );
    }

    if (!payload?.ok || !payload?.decision) {
      throw new Error("Backend AI response did not include a valid decision.");
    }

    return payload.decision;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("Backend AI request timed out.");
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}
