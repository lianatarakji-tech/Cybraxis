const pool = require("../db/pool");

const {
  calculateStageScoreSummary: calculateBackendStageScoreSummary,
  compareStageScores: compareBackendStageScores,
} = require("../services/scoring/stageScoringEngine");

const {
  evaluateInvestigationCoverage,
  buildStageFromFrontendCoverage,
  compareCoverageResults,
} = require("../services/investigation/investigationCoverageEngine");

function makeStageResultId(stageId) {
  return `stage-result-${stageId || "stage"}-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;
}

async function getInvestigationEventsForStage({ sessionId, stageId }) {
  const result = await pool.query(
    `
    SELECT *
    FROM cybraxis_events
    WHERE session_id = $1
      AND stage_id = $2
      AND type = 'investigation'
    ORDER BY created_at ASC
    `,
    [sessionId, stageId]
  );

  return result.rows;
}

async function createStageResult(req, res) {
  const { sessionId } = req.params;

  const {
    id = null,
    scenarioId = null,
    stageId,
    stageIndex,
    stageName = null,

    passed = false,
    timedOut = false,
    lockReason = null,

    scoreSummary = null,
    guidanceProfile = null,
    investigationTargetCoverage = null,
    investigationCoverage = null,

    actionHistory = [],
    preferredActionOrder = [],
    wrongActionCount = 0,
    hintsRequested = 0,

    timeLimitSeconds = null,
    timeRemaining = null,

    escalation = null,
  } = req.body || {};

  if (!stageId) {
    return res.status(400).json({
      error: "stageId is required",
    });
  }

  if (typeof stageIndex !== "number") {
    return res.status(400).json({
      error: "stageIndex must be a number",
    });
  }

  const sessionCheck = await pool.query(
    `
    SELECT id, completed_stage_ids
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

  const investigationEvents = await getInvestigationEventsForStage({
    sessionId,
    stageId,
  });

  const backendCoverageSummary = evaluateInvestigationCoverage({
    stage: buildStageFromFrontendCoverage({
      stageId,
      investigationTargetCoverage,
    }),
    stageId,
    investigationEvents,
  });

  const coverageParity = compareCoverageResults(
    investigationTargetCoverage,
    backendCoverageSummary
  );

  if (!coverageParity.matches) {
    console.warn("BACKEND COVERAGE PARITY MISMATCH", {
      sessionId,
      stageId,
      coverageParity,
    });
  }

  const stageResultId = id || makeStageResultId(stageId);

  const backendScoreSummary = calculateBackendStageScoreSummary({
    stageId,
    passed: Boolean(passed),
    timedOut: Boolean(timedOut),
    investigationTargetCoverage,
    actionHistory,
    preferredActionOrder,
    timeLimitSeconds,
    timeRemaining,
    wrongActionCount,
    prematureContainmentCount:
      scoreSummary?.evaluation?.prematureContainmentCount || 0,
    wrongAbstractionLevelCount:
      scoreSummary?.evaluation?.wrongAbstractionLevelCount || 0,
  });

  const scoreParity = compareBackendStageScores(
    scoreSummary,
    backendScoreSummary
  );

  if (!scoreParity.matches) {
    console.warn("BACKEND STAGE SCORE PARITY MISMATCH", {
      sessionId,
      stageId,
      scoreParity,
    });
  }

  const enrichedScoreSummary = scoreSummary
    ? {
        ...scoreSummary,
        backendShadow: {
          source: "server_stage_scoring_engine",
          scoreSummary: backendScoreSummary,
          parity: scoreParity,
        },
        coverageShadow: {
          source: "server_investigation_coverage_engine",
          coverageSummary: backendCoverageSummary,
          parity: coverageParity,
        },
      }
    : backendScoreSummary;

  const result = await pool.query(
    `
    INSERT INTO cybraxis_stage_results (
      id,
      session_id,
      scenario_id,
      stage_id,
      stage_index,
      stage_name,
      passed,
      timed_out,
      lock_reason,
      score_summary,
      guidance_profile,
      investigation_target_coverage,
      investigation_coverage,
      action_history,
      wrong_action_count,
      hints_requested,
      time_limit_seconds,
      time_remaining,
      escalation,
      created_at
    )
    VALUES (
      $1,
      $2,
      $3,
      $4,
      $5,
      $6,
      $7,
      $8,
      $9,
      $10::jsonb,
      $11::jsonb,
      $12::jsonb,
      $13::jsonb,
      $14::jsonb,
      $15,
      $16,
      $17,
      $18,
      $19::jsonb,
      NOW()
    )
    ON CONFLICT (session_id, stage_id)
    DO UPDATE SET
      id = EXCLUDED.id,
      scenario_id = EXCLUDED.scenario_id,
      stage_index = EXCLUDED.stage_index,
      stage_name = EXCLUDED.stage_name,
      passed = EXCLUDED.passed,
      timed_out = EXCLUDED.timed_out,
      lock_reason = EXCLUDED.lock_reason,
      score_summary = EXCLUDED.score_summary,
      guidance_profile = EXCLUDED.guidance_profile,
      investigation_target_coverage = EXCLUDED.investigation_target_coverage,
      investigation_coverage = EXCLUDED.investigation_coverage,
      action_history = EXCLUDED.action_history,
      wrong_action_count = EXCLUDED.wrong_action_count,
      hints_requested = EXCLUDED.hints_requested,
      time_limit_seconds = EXCLUDED.time_limit_seconds,
      time_remaining = EXCLUDED.time_remaining,
      escalation = EXCLUDED.escalation,
      created_at = NOW()
    RETURNING *
    `,
    [
      stageResultId,
      sessionId,
      scenarioId,
      stageId,
      stageIndex,
      stageName,
      Boolean(passed),
      Boolean(timedOut),
      lockReason,
      JSON.stringify(enrichedScoreSummary || null),
      JSON.stringify(guidanceProfile || null),
      JSON.stringify(investigationTargetCoverage || null),
      JSON.stringify(investigationCoverage || null),
      JSON.stringify(actionHistory || []),
      wrongActionCount,
      hintsRequested,
      timeLimitSeconds,
      timeRemaining,
      JSON.stringify(escalation || null),
    ]
  );

  const existingCompletedStageIds =
    sessionCheck.rows[0].completed_stage_ids || [];

  const completedStageIds = Array.from(
    new Set([...existingCompletedStageIds, stageId])
  );

  await pool.query(
    `
    UPDATE cybraxis_sessions
    SET
      current_stage_index = GREATEST(current_stage_index, $2),
      completed_stage_ids = $3::jsonb,
      updated_at = NOW()
    WHERE id = $1
    `,
    [sessionId, stageIndex, JSON.stringify(completedStageIds)]
  );

  res.status(201).json({
    stageResult: result.rows[0],
    backendScoreSummary,
    scoreParity,
    backendCoverageSummary,
    coverageParity,
  });
}

async function listStageResultsForSession(req, res) {
  const { sessionId } = req.params;

  const result = await pool.query(
    `
    SELECT *
    FROM cybraxis_stage_results
    WHERE session_id = $1
    ORDER BY stage_index ASC, created_at ASC
    `,
    [sessionId]
  );

  res.status(200).json({
    stageResults: result.rows,
  });
}

module.exports = {
  createStageResult,
  listStageResultsForSession,
};