const pool = require("../db/pool");

const {
  evaluateInvestigationCoverage,
} = require("../services/investigation/investigationCoverageEngine");

const {
  buildEvaluationResult,
} = require("../services/actions/actionEvaluationEngine");

const {
  evaluateNetworkRisk,
} = require("../services/network/networkRiskEngine");

const {
  buildGuidanceResult,
} = require("../services/guidance/guidanceEngine");

const {
  buildAdaptiveRuntimeState,
} = require("../services/adaptivity/adaptiveRuntimeEngine");

const {
  getScenarioById,
  getStageById,
  getStageByIndex,
} = require("../services/scenarios/scenarioRegistryService");

const ACTION_LABEL_TO_ID = {
  "investigate ip": "inv-ip",
  "investigate user": "inv-user",
  "block ip": "block-ip",
  "isolate machine": "isolate",
  "ignore": "ignore",
};

function normalizeScenarioActionForBackend(action) {
  if (!action) return null;

  if (typeof action === "string") {
    const normalizedLabel = action.trim();
    const actionId =
      ACTION_LABEL_TO_ID[normalizedLabel.toLowerCase()] ||
      normalizedLabel;

    return {
      id: actionId,
      action_id: actionId,
      actionId,
      label: normalizedLabel,
      name: normalizedLabel,
      source_label: normalizedLabel,
    };
  }

  const label =
    action.label ||
    action.name ||
    action.action ||
    action.source_label ||
    action.id ||
    action.action_id ||
    action.actionId;

  const normalizedLabel =
    typeof label === "string" ? label.trim() : null;

  const actionId =
    action.id ||
    action.action_id ||
    action.actionId ||
    (
      normalizedLabel
        ? ACTION_LABEL_TO_ID[normalizedLabel.toLowerCase()]
        : null
    ) ||
    normalizedLabel;

  return {
    ...action,
    id: actionId,
    action_id: actionId,
    actionId,
    label: normalizedLabel || action.label || actionId,
    name: action.name || normalizedLabel || actionId,
  };
}

function normalizeStageActionsForBackend(stage) {
  if (!stage) return stage;

  const expectedActions = Array.isArray(stage.expected_actions)
    ? stage.expected_actions
        .map(normalizeScenarioActionForBackend)
        .filter(Boolean)
    : [];

  const wrongActions = Array.isArray(stage.wrong_actions)
    ? stage.wrong_actions
        .map(normalizeScenarioActionForBackend)
        .filter(Boolean)
    : [];

  const preferredActionOrder =
    Array.isArray(stage.preferred_action_order)
      ? stage.preferred_action_order
          .map(action => {
            if (typeof action !== "string") return action;
            return ACTION_LABEL_TO_ID[action.trim().toLowerCase()] || action;
          })
      : Array.isArray(stage?.scoring?.preferred_action_order)
        ? stage.scoring.preferred_action_order
        : expectedActions.map(action => action.id);

  return {
    ...stage,
    expected_actions: expectedActions,
    wrong_actions: wrongActions,
    scoring: {
      ...(stage.scoring || {}),
      preferred_action_order: preferredActionOrder,
    },
  };
}


async function evaluateActionForSession(req, res) {
  const { sessionId } = req.params;

  const {
    scenario = {},
    stage = {},
    scenarioId = null,
    stageId = null,
    stageIndex = null,
    actionId,
    selectedNodeId = null,
    selectedTargetId = null,
    actionHistory = [],
    investigationEvents = [],
    runtime = {},
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
  const stageForEvaluation = normalizeStageActionsForBackend(hydratedStage);

  const coverageResult = evaluateInvestigationCoverage({
    stage: stageForEvaluation,
    stageId: stageForEvaluation.id,
    investigationEvents,
  });

  const actionEvaluation = buildEvaluationResult({
    stage: stageForEvaluation,
    actionId,
    selectedNodeId,
    selectedTargetId,
    actionHistory,
    investigationCoverage: coverageResult,
  });

  const networkRisk = evaluateNetworkRisk({
    scenario: scenarioForEvaluation,
    stage: stageForEvaluation,
    selectedNodeId,
    action: actionEvaluation.matchedAction || null,
  });

  const guidance = buildGuidanceResult({
    stage: stageForEvaluation,
    actionEvaluation,
    coverageResult,
  });

  const adaptiveRuntime = buildAdaptiveRuntimeState({
    runtime,
    coverageResult,
    actionEvaluation,
    networkRisk,
  });

  res.status(200).json({
    sessionId,
    scenarioId:
      scenarioForEvaluation.scenario_id ||
      scenarioForEvaluation.id ||
      session.scenario_id,
    stageId: stageForEvaluation.id,
    actionId,
    selectedNodeId,

    shadowMode: true,
    hydratedFromBackend: !stage?.id,

    coverageResult,
    actionEvaluation,
    networkRisk,
    guidance,
    adaptiveRuntime,

    evaluatedAt: new Date().toISOString(),
  });
}

module.exports = {
  evaluateActionForSession,
};
