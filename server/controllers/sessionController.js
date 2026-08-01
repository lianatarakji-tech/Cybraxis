const pool = require("../db/pool");

function makeSessionId(scenarioId) {
  return `session-${scenarioId || "scenario"}-${Date.now()}`;
}

async function createSession(req, res) {
  const {
    scenarioId,
    scenarioName = null,
    userId = "local-user",
    totalStages = 0,
  } = req.body || {};

  if (!scenarioId) {
    return res.status(400).json({
      error: "scenarioId is required",
    });
  }

  const sessionId = makeSessionId(scenarioId);

  const result = await pool.query(
    `
    INSERT INTO cybraxis_sessions (
      id,
      user_id,
      scenario_id,
      scenario_name,
      status,
      current_stage_index,
      completed_stage_ids,
      total_stages
    )
    VALUES ($1, $2, $3, $4, 'active', 0, '[]'::jsonb, $5)
    RETURNING *
    `,
    [
      sessionId,
      userId,
      scenarioId,
      scenarioName,
      totalStages,
    ]
  );

  res.status(201).json({
    session: result.rows[0],
  });
}

async function getSessionById(req, res) {
  const { sessionId } = req.params;

  const result = await pool.query(
    `
    SELECT *
    FROM cybraxis_sessions
    WHERE id = $1
    `,
    [sessionId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({
      error: "Session not found",
      sessionId,
    });
  }

  res.status(200).json({
    session: result.rows[0],
  });
}

module.exports = {
  createSession,
  getSessionById,
};