const pool = require("../db/pool");

const {
  buildRuntimeStateDecision,
  compareRuntimeStateDecision,
} = require("../services/runtime/runtimeStateDecisionEngine");

const {
  getScenarioById,
} = require("../services/scenarios/scenarioRegistryService");

async function evaluateRuntimeStateForSession(req, res) {
  const { sessionId } = req.params;

  const {
    scenarioId = null,
    actionId,
    selectedNodeId = null,
    selectedAlertId = null,
    connections = [],
    timestamp = null,
    frontendDecision = null,
  } = req.body || {};

  if (!actionId) {
    return res.status(400).json({
      error: "actionId is required",
    });
  }

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
    session.scenario_id ||
    null;

  const hydratedScenario = sessionScenarioId
    ? getScenarioById(sessionScenarioId)
    : null;

  const hydratedConnections =
    Array.isArray(hydratedScenario?.connections)
      ? hydratedScenario.connections
      : [];

  const effectiveConnections =
    hydratedConnections.length > 0
      ? hydratedConnections
      : connections;

  const backendRuntimeDecision = buildRuntimeStateDecision({
    actionId,
    selectedNodeId,
    selectedAlertId,
    connections: effectiveConnections,
    timestamp,
  });

  const runtimeStateParity = frontendDecision
    ? compareRuntimeStateDecision({
        frontendDecision,
        backendDecision: backendRuntimeDecision,
      })
    : {
        matches: true,
        skipped: true,
        reason: "frontendDecision_not_provided",
        checkedAt: new Date().toISOString(),
      };

  if (!runtimeStateParity.matches) {
    console.warn("BACKEND RUNTIME STATE PARITY MISMATCH", {
      sessionId,
      scenarioId: sessionScenarioId,
      actionId,
      selectedNodeId,
      runtimeStateParity,
    });
  }

  res.status(200).json({
    sessionId,
    scenarioId: sessionScenarioId,
    hydratedFromBackend:
      hydratedConnections.length > 0 &&
      (!Array.isArray(connections) || connections.length === 0),
    actionId,
    selectedNodeId,
    backendRuntimeDecision,
    runtimeStateParity,
    evaluatedAt: new Date().toISOString(),
  });
}

module.exports = {
  evaluateRuntimeStateForSession,
};
