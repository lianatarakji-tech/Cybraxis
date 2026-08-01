const pool = require("../db/pool");
const {
  buildProfileSummary,
} = require("../services/profile/profileSummaryService");

async function getProfileSummary(req, res) {
  const userId = req.query.userId || "local-user";
  const limit = Math.min(Number(req.query.limit) || 10, 50);

  const sessionsResult = await pool.query(
    `
    SELECT *
    FROM cybraxis_sessions
    WHERE user_id = $1
    ORDER BY created_at DESC
    `,
    [userId]
  );

  const reportsResult = await pool.query(
    `
    SELECT *
    FROM cybraxis_final_reports
    WHERE session_id IN (
      SELECT id
      FROM cybraxis_sessions
      WHERE user_id = $1
    )
    ORDER BY created_at DESC
    LIMIT $2
    `,
    [userId, limit]
  );

  const summary = buildProfileSummary({
    userId,
    sessions: sessionsResult.rows,
    reports: reportsResult.rows,
  });

  res.status(200).json({
    profile: summary,
  });
}

module.exports = {
  getProfileSummary,
};