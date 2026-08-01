const express = require("express");
const asyncHandler = require("../utils/asyncHandler");

const {
  evaluateConsequenceForSession,
} = require("../controllers/consequenceController");

const router = express.Router();

router.post(
  "/sessions/:sessionId/consequences/evaluate",
  asyncHandler(evaluateConsequenceForSession)
);

module.exports = router;