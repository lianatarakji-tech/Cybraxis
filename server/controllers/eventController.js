const pool = require("../db/pool");

function makeEventId(type, stageId) {
  return `${type || "event"}-${stageId || "stage"}-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;
}

async function createEvent(req, res) {
  const { sessionId } = req.params;

  const {
    id = null,
    scenarioId = null,
    stageId = null,
    stageIndex = null,
    type,
    timestamp = null,
    payload = {},
  } = req.body || {};

  if (!type) {
    return res.status(400).json({
      error: "type is required",
    });
  }

  const sessionCheck = await pool.query(
    `
    SELECT id
    FROM cybraxis_sessions
    WHERE id = $1
    `,
    [sessionId]
  );

  if (sessionCheck.rows.length === 0) {
    return res.status(404).json({
      error: "Session not found",
      sessionId,
    });
  }

  const eventId = id || makeEventId(type, stageId);

  const result = await pool.query(
    `
    INSERT INTO cybraxis_events (
      id,
      session_id,
      scenario_id,
      stage_id,
      stage_index,
      type,
      timestamp,
      payload
    )
    VALUES (
      $1,
      $2,
      $3,
      $4,
      $5,
      $6,
      COALESCE($7::timestamptz, NOW()),
      $8::jsonb
    )
    RETURNING *
    `,
    [
      eventId,
      sessionId,
      scenarioId,
      stageId,
      stageIndex,
      type,
      timestamp,
      JSON.stringify(payload || {}),
    ]
  );

  await pool.query(
    `
    UPDATE cybraxis_sessions
    SET updated_at = NOW()
    WHERE id = $1
    `,
    [sessionId]
  );

  res.status(201).json({
    event: result.rows[0],
  });
}

async function listEventsForSession(req, res) {
  const { sessionId } = req.params;

  const result = await pool.query(
    `
    SELECT *
    FROM cybraxis_events
    WHERE session_id = $1
    ORDER BY created_at ASC
    `,
    [sessionId]
  );

  res.status(200).json({
    events: result.rows,
  });
}

module.exports = {
  createEvent,
  listEventsForSession,
};