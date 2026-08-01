const SCORE_WEIGHTS = {
  ACTION_SCORE: 25,
  COVERAGE_SCORE: 25,
  SEQUENCE_SCORE: 20,
  TIME_SCORE: 15,
  RESPONSE_QUALITY_SCORE: 15,
};

const PENALTY_WEIGHTS = {
  WRONG_ACTION: 5,
  TIMEOUT: 10,
  PREMATURE_CONTAINMENT: 7,
  WRONG_ABSTRACTION_LEVEL: 6,
};

function clamp(value, min = 0, max = 100) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return min;
  return Math.max(min, Math.min(numeric, max));
}

function calculateActionScore({ passed, maxScore = SCORE_WEIGHTS.ACTION_SCORE }) {
  return passed ? maxScore : 0;
}

function calculateCoverageScore({
  investigationTargetCoverage,
  maxScore = SCORE_WEIGHTS.COVERAGE_SCORE,
}) {
  if (!investigationTargetCoverage) return 0;

  const totalTargets = investigationTargetCoverage.suspiciousNodeCount || 0;
  const coveredTargets = investigationTargetCoverage.investigatedNodeCount || 0;

  if (totalTargets === 0) return maxScore;

  return Math.round(maxScore * (coveredTargets / totalTargets));
}

function calculateSequenceScore({
  actionHistory = [],
  preferredActionOrder = [],
  maxScore = SCORE_WEIGHTS.SEQUENCE_SCORE,
}) {
  if (!preferredActionOrder.length) return maxScore;
  if (!actionHistory.length) return 0;

  let correctPrefixCount = 0;

  preferredActionOrder.forEach((expectedAction, index) => {
    if (actionHistory[index] === expectedAction) {
      correctPrefixCount += 1;
    }
  });

  return Math.round(maxScore * (correctPrefixCount / preferredActionOrder.length));
}

function calculateTimeScore({
  timeLimitSeconds = 0,
  timeRemaining = 0,
  timedOut = false,
  maxScore = SCORE_WEIGHTS.TIME_SCORE,
}) {
  if (timedOut) return 0;
  if (!timeLimitSeconds) return maxScore;

  const ratio = clamp(timeRemaining / timeLimitSeconds, 0, 1);
  return Math.round(maxScore * ratio);
}

function calculateResponseQualityScore({
  passed,
  coverageComplete,
  sequenceComplete,
  timedOut,
  maxScore = SCORE_WEIGHTS.RESPONSE_QUALITY_SCORE,
}) {
  if (timedOut) return 0;
  if (!passed) return 0;

  let score = maxScore;

  if (!coverageComplete) {
    score -= Math.round(maxScore * 0.45);
  }

  if (!sequenceComplete) {
    score -= Math.round(maxScore * 0.35);
  }

  return clamp(score, 0, maxScore);
}

function calculatePenalties({
  wrongActionCount = 0,
  timedOut = false,
  prematureContainmentCount = 0,
  wrongAbstractionLevelCount = 0,
}) {
  return {
    wrongActions: -(wrongActionCount * PENALTY_WEIGHTS.WRONG_ACTION),
    timeout: timedOut ? -PENALTY_WEIGHTS.TIMEOUT : 0,
    prematureContainment: -(
      prematureContainmentCount * PENALTY_WEIGHTS.PREMATURE_CONTAINMENT
    ),
    wrongAbstractionLevel: -(
      wrongAbstractionLevelCount * PENALTY_WEIGHTS.WRONG_ABSTRACTION_LEVEL
    ),
  };
}

function calculateStageScoreSummary({
  stageId,
  passed = false,
  timedOut = false,
  investigationTargetCoverage,
  actionHistory = [],
  preferredActionOrder = [],
  timeLimitSeconds = 0,
  timeRemaining = 0,
  wrongActionCount = 0,
  prematureContainmentCount = 0,
  wrongAbstractionLevelCount = 0,
}) {
  const coverageComplete =
    investigationTargetCoverage?.allRequiredCoverageComplete || false;

  const sequenceComplete =
    preferredActionOrder.length === 0 ||
    preferredActionOrder.every((action, index) => actionHistory[index] === action);

  const actionScore = calculateActionScore({ passed });

  const coverageScore = calculateCoverageScore({
    investigationTargetCoverage,
  });

  const sequenceScore = calculateSequenceScore({
    actionHistory,
    preferredActionOrder,
  });

  const timeScore = calculateTimeScore({
    timeLimitSeconds,
    timeRemaining,
    timedOut,
  });

  const responseQualityScore = calculateResponseQualityScore({
    passed,
    coverageComplete,
    sequenceComplete,
    timedOut,
  });

  const penalties = calculatePenalties({
    wrongActionCount,
    timedOut,
    prematureContainmentCount,
    wrongAbstractionLevelCount,
  });

  const rawScore =
    actionScore +
    coverageScore +
    sequenceScore +
    timeScore +
    responseQualityScore +
    Object.values(penalties).reduce((sum, value) => sum + value, 0);

  const totalStageScore = clamp(rawScore, 0, 100);

  return {
    stageId,
    passed,
    timedOut,
    totalStageScore,
    breakdown: {
      actionScore,
      coverageScore,
      sequenceScore,
      timeScore,
      responseQualityScore,
      penalties,
    },
    evaluation: {
      coverageComplete,
      sequenceComplete,
      wrongActionCount,
      prematureContainmentCount,
      wrongAbstractionLevelCount,
      timeRemaining,
      timeLimitSeconds,
    },
  };
}

function compareStageScores(frontendScoreSummary, backendScoreSummary) {
  const frontendTotalScore = Number(frontendScoreSummary?.totalStageScore);
  const backendTotalScore = Number(backendScoreSummary?.totalStageScore);

  const bothScoresValid =
    Number.isFinite(frontendTotalScore) && Number.isFinite(backendTotalScore);

  const delta = bothScoresValid ? backendTotalScore - frontendTotalScore : null;

  return {
    frontendTotalScore: Number.isFinite(frontendTotalScore)
      ? frontendTotalScore
      : null,
    backendTotalScore: Number.isFinite(backendTotalScore)
      ? backendTotalScore
      : null,
    matches: bothScoresValid && delta === 0,
    delta,
    checkedAt: new Date().toISOString(),
  };
}

module.exports = {
  calculateStageScoreSummary,
  compareStageScores,
};