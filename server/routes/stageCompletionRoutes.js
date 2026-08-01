const express = require("express");
const asyncHandler = require("../utils/asyncHandler");

const {
  evaluateStageCompletionForSession,
} = require("../controllers/stageCompletionController");

const router = express.Router();

router.post(
  "/sessions/:sessionId/stage-completion/evaluate",
  asyncHandler(evaluateStageCompletionForSession)
);

module.exports = router;