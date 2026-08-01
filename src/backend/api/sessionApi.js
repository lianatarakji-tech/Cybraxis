const API_BASE_URL = "http://localhost:5000/api";

const SHOW_BACKEND_PARITY_LOGS = false;
const logBackendParity = (...args) => {
  if (SHOW_BACKEND_PARITY_LOGS) {
    console.log(...args);
  }
};

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

function mapProgressionFromRow(row) {
  if (!row) return null;

  return {
    recommendationType: row.progression_recommendation || null,
    band: row.progression_band || null,
    reason: row.progression_reason || null,

    recommendedNextScenarioId: row.recommended_next_scenario_id || null,
    recommendedNextScenarioName: row.recommended_next_scenario_name || null,
    recommendedScenarioAvailable: Boolean(row.recommended_scenario_available),

    primaryStrength: row.primary_strength || null,
    primaryWeakness: row.primary_weakness || null,

    variantSeed: row.variant_seed || null,
    snapshot: row.progression_snapshot || null,
  };
}

function mapSessionRow(row, extras = {}) {
  if (!row) return null;

  return {
    id: row.id,
    userId: row.user_id,

    scenario: {
      id: row.scenario_id,
      name: row.scenario_name,
    },

    status: row.status,

    progress: {
      currentStageIndex: row.current_stage_index ?? 0,
      completedStageIds: row.completed_stage_ids || [],
      totalStages: row.total_stages ?? 0,
    },

    finalScore: row.final_score ?? null,
    progression: extras.progression || mapProgressionFromRow(row),

    events: extras.events || [],
    stageResults: extras.stageResults || [],
    finalReport: extras.finalReport || null,

    createdAt: row.created_at,
    updatedAt: row.updated_at,
    endedAt: row.ended_at,
  };
}

function mapEventRow(row) {
  if (!row) return null;

  return {
    id: row.id,
    sessionId: row.session_id,
    scenarioId: row.scenario_id,
    stageId: row.stage_id,
    stageIndex: row.stage_index,
    type: row.type,
    timestamp: row.timestamp,
    payload: row.payload || {},
    createdAt: row.created_at,
  };
}

function mapStageResultRow(row) {
  if (!row) return null;

  return {
    id: row.id,
    sessionId: row.session_id,
    scenarioId: row.scenario_id,

    stage: {
      id: row.stage_id,
      index: row.stage_index,
      name: row.stage_name,
    },

    outcome: {
      passed: row.passed,
      timedOut: row.timed_out,
      lockReason: row.lock_reason,
    },

    scoring: row.score_summary,
    guidance: row.guidance_profile,

    investigation: {
      targetCoverage: row.investigation_target_coverage,
      dimensionCoverage: row.investigation_coverage,
    },

    performance: {
      actionHistory: row.action_history || [],
      preferredActionOrder:
        row.score_summary?.backendShadow?.scoreSummary?.preferredActionOrder || [],
      wrongActionCount: row.wrong_action_count ?? 0,
      hintsRequested: row.hints_requested ?? 0,
      timeLimitSeconds: row.time_limit_seconds,
      timeRemaining: row.time_remaining,
    },

    escalation: row.escalation,
    createdAt: row.created_at,
  };
}

function mapFinalReportRow(row) {
  if (!row) return null;

  return {
    id: row.id,
    sessionId: row.session_id,

    scenario: {
      id: row.scenario_id,
      name: row.scenario_name,
    },

    totalScore: row.total_score,

    summary: row.summary,
    stageBreakdown: row.stage_breakdown,
    dimensions: row.dimensions,

    strengths: row.strengths || [],
    weaknesses: row.weaknesses || [],
    recommendations: row.recommendations || [],

    finalFeedback: row.final_feedback,

    progression: {
      recommendationType: row.progression_recommendation || null,
      band: row.progression_band || null,
      reason: row.progression_reason || null,

      recommendedNextScenarioId: row.recommended_next_scenario_id || null,
      recommendedNextScenarioName: row.recommended_next_scenario_name || null,
      recommendedScenarioAvailable: Boolean(row.recommended_scenario_available),

      primaryStrength: row.primary_strength || null,
      primaryWeakness: row.primary_weakness || null,

      variantSeed: row.variant_seed || null,
      snapshot: row.progression_snapshot || null,
    },

    report: row.report || {},
    createdAt: row.created_at,
  };
}

async function hydrateSession(sessionRow) {
  if (!sessionRow?.id) return null;

  const sessionId = sessionRow.id;

  const [eventsResult, stageResultsResult] = await Promise.allSettled([
    requestJson(`/sessions/${sessionId}/events`),
    requestJson(`/sessions/${sessionId}/stage-results`),
  ]);

  const events =
    eventsResult.status === "fulfilled"
      ? (eventsResult.value.events || []).map(mapEventRow).filter(Boolean)
      : [];

  const stageResults =
    stageResultsResult.status === "fulfilled"
      ? (stageResultsResult.value.stageResults || []).map(mapStageResultRow).filter(Boolean)
      : [];

  const shouldFetchFinalReport =
    sessionRow.status === "completed" ||
    Boolean(sessionRow.ended_at) ||
    sessionRow.final_score !== null;

  let finalReport = null;

  if (shouldFetchFinalReport) {
    try {
      const finalReportResult = await requestJson(`/sessions/${sessionId}/final-report`);
      finalReport = mapFinalReportRow(finalReportResult.finalReport);
    } catch (error) {
      finalReport = null;
    }
  }

  return mapSessionRow(sessionRow, {
    events,
    stageResults,
    finalReport,
  });
}

function adaptEventForApi(event) {
  return {
    id: event.id,
    scenarioId: event.scenarioId,
    stageId: event.stageId,
    stageIndex: event.stageIndex,
    type: event.type,
    timestamp: event.timestamp,
    payload: event.payload || {},
  };
}

function adaptStageResultForApi(stageResult) {
  return {
    id: stageResult.id,
    scenarioId: stageResult.scenarioId,

    stageId: stageResult.stage?.id,
    stageIndex: stageResult.stage?.index,
    stageName: stageResult.stage?.name,

    passed: Boolean(stageResult.outcome?.passed),
    timedOut: Boolean(stageResult.outcome?.timedOut),
    lockReason: stageResult.outcome?.lockReason || null,

    scoreSummary: stageResult.scoring || null,
    guidanceProfile: stageResult.guidance || null,

    investigationTargetCoverage:
      stageResult.investigation?.targetCoverage || null,

    investigationCoverage:
      stageResult.investigation?.dimensionCoverage || null,

    actionHistory:
      stageResult.performance?.actionHistory || [],

    preferredActionOrder:
      stageResult.performance?.preferredActionOrder || [],

    wrongActionCount:
      stageResult.performance?.wrongActionCount || 0,

    hintsRequested:
      stageResult.performance?.hintsRequested || 0,

    timeLimitSeconds:
      stageResult.performance?.timeLimitSeconds ?? null,

    timeRemaining:
      stageResult.performance?.timeRemaining ?? null,

    escalation: stageResult.escalation || null,
  };
}

function adaptFinalReportForApi(finalReport) {
  return {
    id: finalReport.id,
    scenarioId: finalReport.scenario?.id,
    scenarioName: finalReport.scenario?.name,
    totalScore: finalReport.totalScore || 0,
    summary: finalReport.summary || null,
    stageBreakdown: finalReport.stageBreakdown || null,
    dimensions: finalReport.dimensions || null,
    strengths: finalReport.strengths || [],
    weaknesses: finalReport.weaknesses || [],
    recommendations: finalReport.recommendations || [],
    finalFeedback: finalReport.finalFeedback || null,
    report: finalReport,
  };
}

function mapProgressionResponse(progression) {
  if (!progression) return null;

  return {
    score: progression.score ?? null,
    band: progression.band || null,
    bandLabel: progression.bandLabel || null,
    threshold: progression.threshold || null,

    recommendationType: progression.recommendationType || null,
    recommendedNextScenarioId: progression.recommendedNextScenarioId || null,
    recommendedNextScenarioName: progression.recommendedNextScenarioName || null,
    recommendedScenarioAvailable: Boolean(progression.recommendedScenarioAvailable),

    currentScenarioId: progression.currentScenarioId || null,
    currentScenarioName: progression.currentScenarioName || null,
    currentScenarioDifficulty: progression.currentScenarioDifficulty || null,

    primaryStrength: progression.primaryStrength || null,
    primaryWeakness: progression.primaryWeakness || null,

    variantSeed: progression.variantSeed || null,
    reason: progression.reason || null,
    generatedAt: progression.generatedAt || null,
  };
}

export async function createSession({
  scenarioId,
  scenarioName,
  userId = "local-user",
  totalStages = 0,
}) {
  const data = await requestJson("/sessions", {
    method: "POST",
    body: JSON.stringify({
      scenarioId,
      scenarioName,
      userId,
      totalStages,
    }),
  });

  return hydrateSession(data.session);
}

export async function getSession(sessionId) {
  const data = await requestJson(`/sessions/${sessionId}`);
  return hydrateSession(data.session);
}

export async function saveEvent(sessionId, event) {
  await requestJson(`/sessions/${sessionId}/events`, {
    method: "POST",
    body: JSON.stringify(adaptEventForApi(event)),
  });

  return getSession(sessionId);
}

export async function saveStageResult(sessionId, stageResult) {
  const data = await requestJson(`/sessions/${sessionId}/stage-results`, {
    method: "POST",
    body: JSON.stringify(adaptStageResultForApi(stageResult)),
  });

  if (data.scoreParity) {
    logBackendParity("BACKEND STAGE SCORE PARITY", data.scoreParity);
  }

  if (data.coverageParity) {
    logBackendParity("BACKEND COVERAGE PARITY", data.coverageParity);
  }

  return getSession(sessionId);
}

export async function finishSession(sessionId, finalReport) {
  const data = await requestJson(`/sessions/${sessionId}/final-report`, {
    method: "POST",
    body: JSON.stringify(adaptFinalReportForApi(finalReport)),
  });

  const mappedFinalReport = mapFinalReportRow(data.finalReport);
  const mappedProgression = mapProgressionResponse(data.progression);

  return mapSessionRow(data.session, {
    finalReport: mappedFinalReport,
    progression: mappedProgression,
    stageResults: [],
    events: [],
  });
}

export async function generateFinalReport(sessionId) {
  const data = await requestJson(`/sessions/${sessionId}/final-report/generate`, {
    method: "POST",
    body: JSON.stringify({}),
  });

  const mappedFinalReport = mapFinalReportRow(data.finalReport);
  const mappedProgression = mapProgressionResponse(data.progression);

  return mapSessionRow(data.session, {
    finalReport: mappedFinalReport,
    progression: mappedProgression,
    stageResults: [],
    events: [],
  });
}

export async function clearLocalSessions() {
  console.warn(
    "clearLocalSessions is not used with the real Express backend. Clear rows from PostgreSQL manually during testing if needed."
  );
}