export const GUIDANCE_LEVELS = {
  SUBTLE: "subtle",
  MODERATE: "moderate",
  DIRECT: "direct",
  INTERVENTION: "intervention",
};

const GUIDANCE_RANK = {
  [GUIDANCE_LEVELS.SUBTLE]: 0,
  [GUIDANCE_LEVELS.MODERATE]: 1,
  [GUIDANCE_LEVELS.DIRECT]: 2,
  [GUIDANCE_LEVELS.INTERVENTION]: 3,
};

const RANK_TO_GUIDANCE = [
  GUIDANCE_LEVELS.SUBTLE,
  GUIDANCE_LEVELS.MODERATE,
  GUIDANCE_LEVELS.DIRECT,
  GUIDANCE_LEVELS.INTERVENTION,
];

function clampRank(rank) {
  return Math.max(0, Math.min(rank, RANK_TO_GUIDANCE.length - 1));
}

export function getExpectedGuidanceLevel(stageDifficulty = "easy") {
  if (stageDifficulty === "hard") {
    return GUIDANCE_LEVELS.SUBTLE;
  }

  if (stageDifficulty === "medium") {
    return GUIDANCE_LEVELS.MODERATE;
  }

  return GUIDANCE_LEVELS.MODERATE;
}

export function getGuidanceStyleDescription(guidanceLevel) {
  switch (guidanceLevel) {
    case GUIDANCE_LEVELS.SUBTLE:
      return "Use light, reflective hints. Do not reveal the exact next action.";

    case GUIDANCE_LEVELS.MODERATE:
      return "Guide the learner toward the missing investigation area without naming the exact answer.";

    case GUIDANCE_LEVELS.DIRECT:
      return "Point clearly to the missing evidence category or target, but avoid simply naming the button unless necessary.";

    case GUIDANCE_LEVELS.INTERVENTION:
      return "Provide explicit corrective guidance because the learner is stuck, timing out, or repeatedly making harmful choices.";

    default:
      return "Use moderate guidance.";
  }
}

function getCoverageReasonCodes(investigationTargetCoverage) {
  if (!investigationTargetCoverage) return [];

  const totalTargets = investigationTargetCoverage.suspiciousNodeCount || 0;
  const coveredTargets = investigationTargetCoverage.investigatedNodeCount || 0;

  if (totalTargets <= 0) return [];

  const coverageRatio = coveredTargets / totalTargets;

  if (coverageRatio === 0) {
    return ["no_target_coverage"];
  }

  if (coverageRatio < 1) {
    return ["partial_target_coverage"];
  }

  return ["target_coverage_complete"];
}

function getScoreReasonCodes(stageScoreSummary) {
  if (!stageScoreSummary) return [];

  const reasonCodes = [];

  if (stageScoreSummary.timedOut) {
    reasonCodes.push("stage_timed_out");
  }

  if (
    typeof stageScoreSummary.totalStageScore === "number" &&
    stageScoreSummary.totalStageScore < 50
  ) {
    reasonCodes.push("low_stage_score");
  }

  if (stageScoreSummary.evaluation?.coverageComplete === false) {
    reasonCodes.push("coverage_incomplete");
  }

  if (stageScoreSummary.evaluation?.sequenceComplete === false) {
    reasonCodes.push("sequence_incomplete");
  }

  return reasonCodes;
}

export function calculateMentorGuidanceProfile({
  expectedGuidanceLevel = null,
  stageScoreSummary = null,
  investigationTargetCoverage = null,
  stageTimerState = "normal",
  wrongActionCount = 0,
  hintsRequested = 0,
  stageDifficulty = "easy",
}) {
  const baseline =
    expectedGuidanceLevel || getExpectedGuidanceLevel(stageDifficulty);

  let guidanceRank = GUIDANCE_RANK[baseline] ?? GUIDANCE_RANK[GUIDANCE_LEVELS.MODERATE];

  const reasonCodes = [];

  if (stageTimerState === "warning") {
    guidanceRank += 1;
    reasonCodes.push("time_warning");
  }

  if (stageTimerState === "expired") {
    guidanceRank += 2;
    reasonCodes.push("timeout");
  }

  if (wrongActionCount >= 1) {
    guidanceRank += 1;
    reasonCodes.push("wrong_action");
  }

  if (wrongActionCount >= 2) {
    guidanceRank += 1;
    reasonCodes.push("repeated_wrong_actions");
  }

  if (hintsRequested >= 2) {
    guidanceRank += 1;
    reasonCodes.push("multiple_hints_requested");
  }

  if (hintsRequested >= 4) {
    guidanceRank += 1;
    reasonCodes.push("high_hint_dependency");
  }

  const coverageReasonCodes = getCoverageReasonCodes(investigationTargetCoverage);

  if (coverageReasonCodes.includes("no_target_coverage")) {
    guidanceRank += 1;
  }

  if (coverageReasonCodes.includes("partial_target_coverage")) {
    guidanceRank += 1;
  }

  const scoreReasonCodes = getScoreReasonCodes(stageScoreSummary);

  if (scoreReasonCodes.includes("stage_timed_out")) {
    guidanceRank += 2;
  }

  if (scoreReasonCodes.includes("low_stage_score")) {
    guidanceRank += 1;
  }

  if (scoreReasonCodes.includes("coverage_incomplete")) {
    guidanceRank += 1;
  }

  if (scoreReasonCodes.includes("sequence_incomplete")) {
    guidanceRank += 1;
  }

  reasonCodes.push(...coverageReasonCodes);
  reasonCodes.push(...scoreReasonCodes);

  const currentGuidanceLevel = RANK_TO_GUIDANCE[clampRank(guidanceRank)];
  const expectedRank = GUIDANCE_RANK[baseline] ?? GUIDANCE_RANK[GUIDANCE_LEVELS.MODERATE];
  const currentRank = GUIDANCE_RANK[currentGuidanceLevel];

  return {
    expectedGuidanceLevel: baseline,
    currentGuidanceLevel,
    guidanceShift: currentRank - expectedRank,
    reasonCodes: [...new Set(reasonCodes)],
    aiInstruction: getGuidanceStyleDescription(currentGuidanceLevel),
  };
}

export function calculateMentorGuidanceLevel(args) {
  return calculateMentorGuidanceProfile(args).currentGuidanceLevel;
}