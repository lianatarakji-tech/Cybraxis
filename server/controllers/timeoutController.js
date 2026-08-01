const pool = require("../db/pool");

const {
  buildTimeoutEscalationDecision,
  compareTimeoutEscalationDecision,
} = require("../services/runtime/timeoutEscalationEngine");

const {
  getScenarioById,
  getStageById,
  getStageByIndex,
} = require("../services/scenarios/scenarioRegistryService");

async function evaluateTimeoutForSession(req, res) {
  const { sessionId } = req.params;

  const {
    scenario = {},
    stage = {},
    scenarioId = null,
    stageId = null,
    stageIndex = 0,
    totalStages = 1,
    isLastStage = false,
    timestamp = null,
    investigationTargetCoverage = null,
    actionHistory = [],
    preferredActionOrder = [],
    wrongActionCount = 0,
    frontendDecision = null,
  } = req.body || {};

  const sessionResult = await pool.query(
    `
    SELECT *
    FROM cybraxis_sessions
    WHERE id = $1
    `,
    [sessionId]
  );

  if (sessionResult.rows.length === 0) {
    return res.status(404).json({
      error: "Session not found",
      sessionId,
    });
  }

  const session = sessionResult.rows[0];

  const sessionScenarioId =
    scenarioId ||
    scenario?.scenario_id ||
    scenario?.id ||
    session.scenario_id;

  let hydratedScenario =
    scenario && Object.keys(scenario).length > 0
      ? scenario
      : null;

  let hydratedStage =
    stage && stage.id
      ? stage
      : null;

  if (!hydratedScenario && sessionScenarioId) {
    hydratedScenario = getScenarioById(sessionScenarioId);
  }

  if (!hydratedStage && sessionScenarioId && stageId) {
    const hydrated = getStageById({
      scenarioId: sessionScenarioId,
      stageId,
    });

    hydratedScenario = hydratedScenario || hydrated.scenario;
    hydratedStage = hydrated.stage;
  }

  if (
    !hydratedStage &&
    sessionScenarioId &&
    stageIndex !== null &&
    stageIndex !== undefined
  ) {
    const hydrated = getStageByIndex({
      scenarioId: sessionScenarioId,
      stageIndex,
    });

    hydratedScenario = hydratedScenario || hydrated.scenario;
    hydratedStage = hydrated.stage;
  }

  if (!hydratedScenario) {
    return res.status(400).json({
      error: "scenario could not be hydrated",
      scenarioId: sessionScenarioId,
    });
  }

  if (!hydratedStage || !hydratedStage.id) {
    return res.status(400).json({
      error: "stage with id is required",
      scenarioId: sessionScenarioId,
      stageId,
      stageIndex,
    });
  }

  const scenarioForEvaluation = hydratedScenario;
  const stageForEvaluation = hydratedStage;

  const backendTimeoutDecision = buildTimeoutEscalationDecision({
    scenario: scenarioForEvaluation,
    stage: stageForEvaluation,
    stageId: stageForEvaluation.id,
    stageIndex,
    totalStages,
    isLastStage,
    timestamp,
    investigationTargetCoverage,
    actionHistory,
    preferredActionOrder,
    wrongActionCount,
  });

  const timeoutEscalationParity = compareTimeoutEscalationDecision({
    frontendDecision,
    backendDecision: backendTimeoutDecision,
  });

  if (!timeoutEscalationParity.matches) {
    console.warn("BACKEND TIMEOUT ESCALATION PARITY MISMATCH", {
      sessionId,
      stageId: stageForEvaluation.id,
      timeoutEscalationParity,
    });
  }

  res.status(200).json({
    sessionId,
    scenarioId:
      scenarioForEvaluation.scenario_id ||
      scenarioForEvaluation.id ||
      session.scenario_id,
    stageId: stageForEvaluation.id,
    hydratedFromBackend: !stage?.id,
    backendTimeoutDecision,
    timeoutEscalationParity,
    evaluatedAt: new Date().toISOString(),
  });
}

module.exports = {
  evaluateTimeoutForSession,
};
