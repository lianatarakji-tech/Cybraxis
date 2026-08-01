const pool = require("../db/pool");

function getHealth(req, res) {
  res.status(200).json({
    status: "ok",
    service: "cybraxis-api",
    message: "Cybraxis backend is running",
    timestamp: new Date().toISOString(),
  });
}

async function getDatabaseHealth(req, res) {
  const result = await pool.query("SELECT NOW() AS current_time");

  res.status(200).json({
    status: "ok",
    service: "cybraxis-database",
    message: "Database connection is working",
    databaseTime: result.rows[0].current_time,
  });
}

module.exports = {
  getHealth,
  getDatabaseHealth,
};