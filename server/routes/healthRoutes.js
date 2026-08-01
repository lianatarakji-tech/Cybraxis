const express = require("express");
const {
  getHealth,
  getDatabaseHealth,
} = require("../controllers/healthController");

const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.get("/", getHealth);
router.get("/db", asyncHandler(getDatabaseHealth));

module.exports = router;