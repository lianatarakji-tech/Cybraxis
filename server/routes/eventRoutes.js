const express = require("express");
const asyncHandler = require("../utils/asyncHandler");

const {
  createEvent,
  listEventsForSession,
} = require("../controllers/eventController");

const router = express.Router();

router.post("/sessions/:sessionId/events", asyncHandler(createEvent));
router.get("/sessions/:sessionId/events", asyncHandler(listEventsForSession));

module.exports = router;