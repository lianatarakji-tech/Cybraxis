const express = require("express");
const asyncHandler = require("../utils/asyncHandler");

const {
  evaluateTimeoutForSession,
} = require("../controllers/timeoutController");

const router = express.Router();

router.post(
  "/sessions/:sessionId/timeout/evaluate",
  asyncHandler(evaluateTimeoutForSession)
);

module.exports = router;