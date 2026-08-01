const fs = require("fs");
const path = require("path");
const { getScenarioTopologyById } = require("../../data/topology/scenarioTopologyRegistry");

const SCENARIO_FILES = {
  external_recon_to_exfiltration_1: path.resolve(
    __dirname,
    "../../../src/data/json_scenarios/scenario1.json"
  ),
  external_recon_to_exfiltration_1b: path.resolve(
    __dirname,
    "../../../src/data/json_scenarios/scenario1_variant_b.json"
  ),
  silent_beacon_1: path.resolve(
    __dirname,
    "../../../src/data/json_scenarios/scenario2_silent_beacon.json"
  ),
};

function readJsonFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

function getAvailableScenarioIds() {
  return Object.keys(SCENARIO_FILES);
}

function getScenarioById(scenarioId) {
  const filePath = SCENARIO_FILES[scenarioId];

  if (!filePath) {
    return null;
  }

  const scenario = readJsonFile(filePath);
  const topology = getScenarioTopologyById(scenarioId);

  if (!topology) {
    return scenario;
  }

  return {
    ...scenario,
    nodes: Array.isArray(scenario.nodes) && scenario.nodes.length > 0
      ? scenario.nodes
      : topology.nodes,
    connections:
      Array.isArray(scenario.connections) && scenario.connections.length > 0
        ? scenario.connections
        : topology.connections,
  };
}

function getStageById({ scenarioId, stageId }) {
  const scenario = getScenarioById(scenarioId);

  if (!scenario) {
    return {
      scenario: null,
      stage: null,
    };
  }

  const stage = Array.isArray(scenario.stages)
    ? scenario.stages.find(candidate => candidate.id === stageId)
    : null;

  return {
    scenario,
    stage: stage || null,
  };
}

function getStageByIndex({ scenarioId, stageIndex = 0 }) {
  const scenario = getScenarioById(scenarioId);

  if (!scenario) {
    return {
      scenario: null,
      stage: null,
    };
  }

  const index = Number(stageIndex) || 0;
  const stage = Array.isArray(scenario.stages)
    ? scenario.stages[index]
    : null;

  return {
    scenario,
    stage: stage || null,
  };
}

function buildScenarioSummary(scenario) {
  if (!scenario) return null;

  return {
    id: scenario.scenario_id || scenario.id || null,
    scenarioId: scenario.scenario_id || scenario.id || null,
    name: scenario.name || scenario.title || "Untitled Scenario",
    description: scenario.description || null,
    totalStages: Array.isArray(scenario.stages) ? scenario.stages.length : 0,
    stageIds: Array.isArray(scenario.stages)
      ? scenario.stages.map(stage => stage.id).filter(Boolean)
      : [],
  };
}

function listScenarios() {
  return getAvailableScenarioIds()
    .map(getScenarioById)
    .filter(Boolean)
    .map(buildScenarioSummary);
}

module.exports = {
  getAvailableScenarioIds,
  getScenarioById,
  getStageById,
  getStageByIndex,
  buildScenarioSummary,
  listScenarios,
};
