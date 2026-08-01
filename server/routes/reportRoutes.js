const express = require("express");
const asyncHandler = require("../utils/asyncHandler");

const {
  createFinalReport,
  generateFinalReportForSession,
  getFinalReportForSession,
} = require("../controllers/reportController");

const router = express.Router();

router.post(
  "/sessions/:sessionId/final-report/generate",
  asyncHandler(generateFinalReportForSession)
);

router.post(
  "/sessions/:sessionId/final-report",
  asyncHandler(createFinalReport)
);

router.get(
  "/sessions/:sessionId/final-report",
  asyncHandler(getFinalReportForSession)
);

module.exports = router;