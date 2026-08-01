const express = require("express");
const asyncHandler = require("../utils/asyncHandler");

const {
  getProfileSummary,
} = require("../controllers/profileController");

const router = express.Router();

router.get("/summary", asyncHandler(getProfileSummary));

module.exports = router;