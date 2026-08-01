function normalizeArray(value) {
  if (Array.isArray(value)) return value;
  return [];
}

function getMostCommon(items) {
  const counts = new Map();

  for (const item of items) {
    if (!item) continue;
    counts.set(item, (counts.get(item) || 0) + 1);
  }

  let best = null;

  for (const [label, count] of counts.entries()) {
    if (!best || count > best.count) {
      best = { label, count };
    }
  }

  return best;
}

function getPerformanceBand(score) {
  const numeric = Number(score);

  if (!Number.isFinite(numeric)) {
    return {
      key: "unknown",
      label: "No performance data yet",
    };
  }

  if (numeric >= 85) {
    return {
      key: "strong",
      label: "Strong performance",
    };
  }

  if (numeric >= 60) {
    return {
      key: "moderate",
      label: "Moderate performance",
    };
  }

  return {
    key: "needs_improvement",
    label: "Needs improvement",
  };
}

function buildAdvice({
  latestCompletedSession,
  commonWeakness,
  averageScore,
}) {
  if (!latestCompletedSession) {
    return "Start a scenario to generate your first SOC analyst performance profile.";
  }

  if (averageScore >= 85) {
    return "Performance trend is strong. Continue into harder network investigations when available.";
  }

  if (averageScore >= 60) {
    if (commonWeakness?.label) {
      return `Continue practicing, with special focus on ${String(commonWeakness.label).replace(/[.]+$/, "")}.`;
    }

    return "Continue practicing normal scenarios and focus on improving weaker evaluation dimensions.";
  }

  if (commonWeakness?.label) {
    return `Replay or use remediation before progressing. Main improvement area: ${String(commonWeakness.label).replace(/[.]+$/, "")}.`;
  }

  return "Replay recent scenarios and focus on investigation coverage, timing, and action sequence before progressing.";
}

function buildScenarioProgress(sessions = []) {
  const scenarioMap = new Map();

  for (const session of sessions) {
    const scenarioId = session.scenario_id;
    if (!scenarioId) continue;

    const current = scenarioMap.get(scenarioId) || {
      scenarioId,
      scenarioName: session.scenario_name,
      attempts: 0,
      completedAttempts: 0,
      bestScore: null,
      latestScore: null,
      latestStatus: null,
      latestCompletedAt: null,
      recommendedNextScenarioId: null,
      recommendedNextScenarioName: null,
      recommendedScenarioAvailable: false,
    };

    current.attempts += 1;
    current.latestStatus = session.status;

    if (session.status === "completed") {
      current.completedAttempts += 1;

      if (Number.isFinite(Number(session.final_score))) {
        const score = Number(session.final_score);

        current.latestScore = score;
        current.bestScore =
          current.bestScore == null ? score : Math.max(current.bestScore, score);
      }

      current.latestCompletedAt = session.ended_at || session.updated_at;
      current.recommendedNextScenarioId = session.recommended_next_scenario_id;
      current.recommendedNextScenarioName = session.recommended_next_scenario_name;
      current.recommendedScenarioAvailable = Boolean(
        session.recommended_scenario_available
      );
    }

    scenarioMap.set(scenarioId, current);
  }

  return [...scenarioMap.values()].sort((a, b) => {
    const aTime = a.latestCompletedAt ? new Date(a.latestCompletedAt).getTime() : 0;
    const bTime = b.latestCompletedAt ? new Date(b.latestCompletedAt).getTime() : 0;
    return bTime - aTime;
  });
}

function buildRecentReports(reports = []) {
  return reports.map(report => ({
    id: report.id,
    sessionId: report.session_id,
    scenarioId: report.scenario_id,
    scenarioName: report.scenario_name,
    totalScore: report.total_score,
    performanceBand: getPerformanceBand(report.total_score),
    progressionRecommendation: report.progression_recommendation,
    progressionBand: report.progression_band,
    recommendedNextScenarioId: report.recommended_next_scenario_id,
    recommendedNextScenarioName: report.recommended_next_scenario_name,
    recommendedScenarioAvailable: Boolean(report.recommended_scenario_available),
    primaryStrength: report.primary_strength,
    primaryWeakness: report.primary_weakness,
    createdAt: report.created_at,
  }));
}

function buildProfileSummary({
  userId = "local-user",
  sessions = [],
  reports = [],
}) {
  const completedSessions = sessions.filter(session => session.status === "completed");

  const scores = completedSessions
    .map(session => Number(session.final_score))
    .filter(Number.isFinite);

  const latestCompletedSession = completedSessions[0] || null;
  const latestReport = reports[0] || null;

  const averageScore =
    scores.length > 0
      ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
      : null;

  const bestScore =
    scores.length > 0
      ? Math.max(...scores)
      : null;

  const strengths = completedSessions
    .map(session => session.primary_strength)
    .filter(Boolean);

  const weaknesses = completedSessions
    .map(session => session.primary_weakness)
    .filter(Boolean);

  const commonStrength = getMostCommon(strengths);
  const commonWeakness = getMostCommon(weaknesses);

  const scenarioProgress = buildScenarioProgress(sessions);
  const recentReports = buildRecentReports(reports);

  const latestRecommendation = latestCompletedSession
    ? {
        type: latestCompletedSession.progression_recommendation,
        band: latestCompletedSession.progression_band,
        reason: latestCompletedSession.progression_reason,
        recommendedNextScenarioId:
          latestCompletedSession.recommended_next_scenario_id,
        recommendedNextScenarioName:
          latestCompletedSession.recommended_next_scenario_name,
        recommendedScenarioAvailable: Boolean(
          latestCompletedSession.recommended_scenario_available
        ),
      }
    : null;

  return {
    userId,

    totals: {
      attempts: sessions.length,
      completedAttempts: completedSessions.length,
      scenariosTouched: scenarioProgress.length,
      reportsGenerated: reports.length,
    },

    performance: {
      averageScore,
      bestScore,
      latestScore: latestCompletedSession?.final_score ?? null,
      band: getPerformanceBand(latestCompletedSession?.final_score),
    },

    profile: {
      strongestArea: commonStrength?.label || null,
      strongestAreaCount: commonStrength?.count || 0,
      mainWeakness: commonWeakness?.label || null,
      mainWeaknessCount: commonWeakness?.count || 0,
      advice: buildAdvice({
        latestCompletedSession,
        commonWeakness,
        averageScore,
      }),
    },

    latest: {
      sessionId: latestCompletedSession?.id || null,
      scenarioId: latestCompletedSession?.scenario_id || null,
      scenarioName: latestCompletedSession?.scenario_name || null,
      completedAt: latestCompletedSession?.ended_at || null,
      reportId: latestReport?.id || null,
    },

    recommendation: latestRecommendation,

    scenarioProgress,
    recentReports,

    generatedAt: new Date().toISOString(),
  };
}

module.exports = {
  buildProfileSummary,
};