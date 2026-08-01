const express = require("express");
const asyncHandler = require("../utils/asyncHandler");

const {
  evaluateActionForSession,
} = require("../controllers/actionController");

const router = express.Router();

router.post(
  "/sessions/:sessionId/actions/evaluate",
  asyncHandler(evaluateActionForSession)
);

module.exports = router;