const express = require("express");
const router = express.Router();

const {
  getMentorHint
} = require("../services/ai/useCases/mentorHintService");

const {
  getStageById,
  getStageByIndex
} = require("../services/scenarios/scenarioRegistryService");

const {
  buildMentorFactPack
} = require("../services/ai/mentorFactPackBuilder");

router.post("/mentor-hint", async (req, res) => {
  const mockMode = req.body.mockMode || "valid";

  const factPack = req.body.factPack || {
    useCase: "mentor_hint",
    scenarioId: "scenario_1",
    stageId: "s1_exfiltration",
    objective: "Confirm the exfiltration path before containment.",
    trigger: "premature_response",
    supportLevel: "light",
    selectedNode: "edge-firewall",
    attemptedAction: "block_ip",
    missingEvidence: [
      "host_scope_confirmation",
      "external_destination_validation"
    ],
    allowedFactIds: ["f1", "f2", "f3"],
    allowExactGuidance: false
  };

  const result = await getMentorHint({
    factPack,
    mockMode,
    forceMockProvider
  });

  res.json(result);
});

router.post("/mentor-hint/from-scenario", async (req, res) => {
  const {
    scenarioId,
    stageId = null,
    stageIndex = null,
    actionId = null,
    actionLabel = null,
    selectedNodeId = null,
    selectedTargetId = null,
    trigger = null,
    actionEvaluation = null,
    coverageResult = null,
    runtime = {},
    mockMode = "valid",
    forceMockProvider = false
  } = req.body || {};

  if (!scenarioId) {
    return res.status(400).json({
      error: "scenarioId is required"
    });
  }

  let hydrated;

  if (stageId) {
    hydrated = getStageById({
      scenarioId,
      stageId
    });
  } else if (stageIndex !== null && stageIndex !== undefined) {
    hydrated = getStageByIndex({
      scenarioId,
      stageIndex
    });
  } else {
    return res.status(400).json({
      error: "stageId or stageIndex is required"
    });
  }

  if (!hydrated?.scenario || !hydrated?.stage) {
    return res.status(404).json({
      error: "scenario or stage not found",
      scenarioId,
      stageId,
      stageIndex
    });
  }

  const factPack = buildMentorFactPack({
    scenario: hydrated.scenario,
    stage: hydrated.stage,
    actionId,
    actionLabel,
    selectedNodeId,
    selectedTargetId,
    trigger,
    actionEvaluation,
    coverageResult,
    runtime
  });

  if (!factPack.ready) {
    return res.status(400).json({
      error: "mentor fact pack could not be built",
      factPack
    });
  }

  const result = await getMentorHint({
    factPack,
    mockMode,
    forceMockProvider
  });

  return res.json({
    factPack,
    result
  });
});

module.exports = router;

