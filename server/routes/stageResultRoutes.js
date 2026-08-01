const express = require("express");
const asyncHandler = require("../utils/asyncHandler");

const {
  createStageResult,
  listStageResultsForSession,
} = require("../controllers/stageResultController");

const router = express.Router();

router.post("/sessions/:sessionId/stage-results", asyncHandler(createStageResult));
router.get("/sessions/:sessionId/stage-results", asyncHandler(listStageResultsForSession));

module.exports = router;