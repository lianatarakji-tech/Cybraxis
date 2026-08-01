const express = require("express");
const asyncHandler = require("../utils/asyncHandler");

const {
  createSession,
  getSessionById,
} = require("../controllers/sessionController");

const router = express.Router();

router.post("/", asyncHandler(createSession));
router.get("/:sessionId", asyncHandler(getSessionById));

module.exports = router;