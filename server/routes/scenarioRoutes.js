const express = require("express");
const asyncHandler = require("../utils/asyncHandler");

const {
  listAvailableScenarios,
  getScenario,
  getScenarioStage,
  getScenarioStageByIndex,
} = require("../controllers/scenarioController");

const router = express.Router();

router.get("/scenarios", asyncHandler(listAvailableScenarios));

router.get("/scenarios/:scenarioId", asyncHandler(getScenario));

router.get(
  "/scenarios/:scenarioId/stages/by-index/:stageIndex",
  asyncHandler(getScenarioStageByIndex)
);

router.get(
  "/scenarios/:scenarioId/stages/:stageId",
  asyncHandler(getScenarioStage)
);

module.exports = router;
