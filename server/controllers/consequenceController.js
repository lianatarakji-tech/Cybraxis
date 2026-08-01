const pool = require("../db/pool");

const {
  decideConsequence,
  compareConsequenceDecision,
} = require("../services/runtime/consequenceDecisionEngine");

const {
  getScenarioById,
  getStageById,
  getStageByIndex,
} = require("../services/scenarios/scenarioRegistryService");

async function evaluateConsequenceForSession(req, res) {
  const { sessionId } = req.params;

  const {
    scenario = {},
    stage = {},
    scenarioId = null,
    stageId = null,
    stageIndex = null,

    selectedNodeId = null,
    trigger = null,
    requestedBranch = null,
    consequence = null,
    frontendAppliedBranch = null,
    frontendEffects = null,
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

  const stageForEvaluation = hydratedStage;

  const backendConsequenceDecision = decideConsequence({
    stage: stageForEvaluation,
    selectedNodeId,
    requestedBranch,
    trigger,
    consequence,
    timestamp: frontendEffects?.timestamp || null,
  });

  const consequenceParity = compareConsequenceDecision({
    frontendAppliedBranch,
    frontendEffects,
    backendDecision: backendConsequenceDecision,
  });

  if (!consequenceParity.matches) {
    console.warn("BACKEND CONSEQUENCE PARITY MISMATCH", {
      sessionId,
      stageId: stageForEvaluation.id,
      consequenceParity,
    });
  }

  res.status(200).json({
    sessionId,
    scenarioId:
      hydratedScenario.scenario_id ||
      hydratedScenario.id ||
      session.scenario_id,
    stageId: stageForEvaluation.id,
    hydratedFromBackend: !stage?.id,
    backendConsequenceDecision,
    consequenceParity,
    evaluatedAt: new Date().toISOString(),
  });
}

module.exports = {
  evaluateConsequenceForSession,
};
