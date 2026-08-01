const pool = require("../db/pool");
const {
  getProgressionRecommendation,
} = require("../services/progression/progressionEngine");
const {
  buildFinalScenarioReport,
} = require("../services/reports/reportService");

function makeFinalReportId(scenarioId) {
  return `final-report-${scenarioId || "scenario"}-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;
}

function toJson(value, fallback) {
  if (value === undefined || value === null) {
    return JSON.stringify(fallback);
  }

  return JSON.stringify(value);
}

async function saveFinalReportForSession({
  client,
  sessionId,
  session,
  finalReport,
}) {
  const scenarioId =
    finalReport.scenario?.id ||
    finalReport.scenarioId ||
    session?.scenario_id;

  const scenarioName =
    finalReport.scenario?.name ||
    finalReport.scenarioName ||
    session?.scenario_name ||
    null;

  const totalScore = finalReport.totalScore || 0;
  const summary = finalReport.summary || null;
  const stageBreakdown = finalReport.stageBreakdown || null;
  const dimensions = finalReport.dimensions || null;
  const strengths = finalReport.strengths || [];
  const weaknesses = finalReport.weaknesses || [];
  const recommendations = finalReport.recommendations || [];
  const finalFeedback = finalReport.finalFeedback || null;

  if (!scenarioId) {
    const error = new Error("scenarioId is required");
    error.statusCode = 400;
    throw error;
  }

  const reportId = finalReport.id || makeFinalReportId(scenarioId);

  const progression = getProgressionRecommendation({
    sessionId,
    scenarioId,
    scenarioName,
    totalScore,
    dimensions,
    strengths,
    weaknesses,
  });

  const reportResult = await client.query(
    `
    INSERT INTO cybraxis_final_reports (
      id,
      session_id,
      scenario_id,
      scenario_name,
      total_score,
      summary,
      stage_breakdown,
      dimensions,
      strengths,
      weaknesses,
      recommendations,
      final_feedback,

      progression_recommendation,
      progression_band,
      progression_reason,
      recommended_next_scenario_id,
      recommended_next_scenario_name,
      recommended_scenario_available,
      primary_strength,
      primary_weakness,
      variant_seed,
      progression_snapshot,

      report
    )
    VALUES (
      $1,
      $2,
      $3,
      $4,
      $5,
      $6::jsonb,
      $7::jsonb,
      $8::jsonb,
      $9::jsonb,
      $10::jsonb,
      $11::jsonb,
      $12,

      $13,
      $14,
      $15,
      $16,
      $17,
      $18,
      $19,
      $20,
      $21,
      $22::jsonb,

      $23::jsonb
    )
    RETURNING *
    `,
    [
      reportId,
      sessionId,
      scenarioId,
      scenarioName,
      progression.score,
      toJson(summary, null),
      toJson(stageBreakdown, null),
      toJson(dimensions, null),
      toJson(strengths, []),
      toJson(weaknesses, []),
      toJson(recommendations, []),
      finalFeedback,

      progression.recommendationType,
      progression.band,
      progression.reason,
      progression.recommendedNextScenarioId,
      progression.recommendedNextScenarioName,
      progression.recommendedScenarioAvailable,
      progression.primaryStrength,
      progression.primaryWeakness,
      progression.variantSeed,
      toJson(progression, {}),

      toJson(finalReport, {}),
    ]
  );

  const sessionResult = await client.query(
    `
    UPDATE cybraxis_sessions
    SET
      status = 'completed',
      final_score = $2,
      progression_recommendation = $3,
      progression_band = $4,
      progression_reason = $5,
      recommended_next_scenario_id = $6,
      recommended_next_scenario_name = $7,
      recommended_scenario_available = $8,
      primary_strength = $9,
      primary_weakness = $10,
      variant_seed = $11,
      progression_snapshot = $12::jsonb,
      ended_at = NOW(),
      updated_at = NOW()
    WHERE id = $1
    RETURNING *
    `,
    [
      sessionId,
      progression.score,
      progression.recommendationType,
      progression.band,
      progression.reason,
      progression.recommendedNextScenarioId,
      progression.recommendedNextScenarioName,
      progression.recommendedScenarioAvailable,
      progression.primaryStrength,
      progression.primaryWeakness,
      progression.variantSeed,
      toJson(progression, {}),
    ]
  );

  return {
    finalReport: reportResult.rows[0],
    session: sessionResult.rows[0],
    progression,
  };
}

async function createFinalReport(req, res) {
  const { sessionId } = req.params;

  const {
    id = null,
    scenarioId,
    scenarioName = null,
    totalScore = 0,
    summary = null,
    stageBreakdown = null,
    dimensions = null,
    strengths = [],
    weaknesses = [],
    recommendations = [],
    finalFeedback = null,
    report = {},
  } = req.body || {};

  if (!scenarioId) {
    return res.status(400).json({
      error: "scenarioId is required",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const sessionCheck = await client.query(
      `
      SELECT *
      FROM cybraxis_sessions
      WHERE id = $1
      FOR UPDATE
      `,
      [sessionId]
    );

    if (sessionCheck.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        error: "Session not found",
        sessionId,
      });
    }

    const finalReport = {
      id: id || makeFinalReportId(scenarioId),
      scenario: {
        id: scenarioId,
        name: scenarioName,
      },
      totalScore,
      summary,
      stageBreakdown,
      dimensions,
      strengths,
      weaknesses,
      recommendations,
      finalFeedback,
      reportSource: "frontend-generated-report",
      ...report,
    };

    const saved = await saveFinalReportForSession({
      client,
      sessionId,
      session: sessionCheck.rows[0],
      finalReport,
    });

    await client.query("COMMIT");

    res.status(201).json(saved);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function generateFinalReportForSession(req, res) {
  const { sessionId } = req.params;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const sessionResult = await client.query(
      `
      SELECT *
      FROM cybraxis_sessions
      WHERE id = $1
      FOR UPDATE
      `,
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        error: "Session not found",
        sessionId,
      });
    }

    const session = sessionResult.rows[0];

    const stageResultsResult = await client.query(
      `
      SELECT *
      FROM cybraxis_stage_results
      WHERE session_id = $1
      ORDER BY stage_index ASC, created_at ASC
      `,
      [sessionId]
    );

    const stageResults = stageResultsResult.rows;

    if (stageResults.length === 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        error: "Cannot generate final report without stage results",
        sessionId,
      });
    }

    const finalReport = buildFinalScenarioReport({
      session,
      scenarioId: session.scenario_id,
      scenarioName: session.scenario_name,
      stageResults,
    });

    const saved = await saveFinalReportForSession({
      client,
      sessionId,
      session,
      finalReport,
    });

    await client.query("COMMIT");

    res.status(201).json({
      ...saved,
      generatedFromStageResults: stageResults.length,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function getFinalReportForSession(req, res) {
  const { sessionId } = req.params;

  const result = await pool.query(
    `
    SELECT *
    FROM cybraxis_final_reports
    WHERE session_id = $1
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [sessionId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({
      error: "Final report not found",
      sessionId,
    });
  }

  res.status(200).json({
    finalReport: result.rows[0],
  });
}

module.exports = {
  createFinalReport,
  generateFinalReportForSession,
  getFinalReportForSession,
};