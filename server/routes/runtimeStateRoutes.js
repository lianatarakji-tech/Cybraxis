const express = require("express");
const asyncHandler = require("../utils/asyncHandler");

const {
  evaluateRuntimeStateForSession,
} = require("../controllers/runtimeStateController");

const router = express.Router();

router.post(
  "/sessions/:sessionId/runtime-state/evaluate",
  asyncHandler(evaluateRuntimeStateForSession)
);

module.exports = router;