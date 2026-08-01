const {
  getScenarioById,
  getStageById,
  getStageByIndex,
  buildScenarioSummary,
  listScenarios,
} = require("../services/scenarios/scenarioRegistryService");

async function listAvailableScenarios(req, res) {
  res.status(200).json({
    scenarios: listScenarios(),
  });
}

async function getScenario(req, res) {
  const { scenarioId } = req.params;

  const scenario = getScenarioById(scenarioId);

  if (!scenario) {
    return res.status(404).json({
      error: "Scenario not found",
      scenarioId,
    });
  }

  res.status(200).json({
    scenario: buildScenarioSummary(scenario),
    fullScenario: scenario,
  });
}

async function getScenarioStage(req, res) {
  const { scenarioId, stageId } = req.params;

  const result = getStageById({
    scenarioId,
    stageId,
  });

  if (!result.scenario) {
    return res.status(404).json({
      error: "Scenario not found",
      scenarioId,
    });
  }

  if (!result.stage) {
    return res.status(404).json({
      error: "Stage not found",
      scenarioId,
      stageId,
    });
  }

  res.status(200).json({
    scenario: buildScenarioSummary(result.scenario),
    stage: result.stage,
  });
}

async function getScenarioStageByIndex(req, res) {
  const { scenarioId, stageIndex } = req.params;

  const result = getStageByIndex({
    scenarioId,
    stageIndex,
  });

  if (!result.scenario) {
    return res.status(404).json({
      error: "Scenario not found",
      scenarioId,
    });
  }

  if (!result.stage) {
    return res.status(404).json({
      error: "Stage not found",
      scenarioId,
      stageIndex,
    });
  }

  res.status(200).json({
    scenario: buildScenarioSummary(result.scenario),
    stage: result.stage,
  });
}

module.exports = {
  listAvailableScenarios,
  getScenario,
  getScenarioStage,
  getScenarioStageByIndex,
};
