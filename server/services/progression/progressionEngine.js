const SCENARIO_CATALOG = {
  external_recon_to_exfiltration_1: {
    id: "external_recon_to_exfiltration_1",
    name: "External Reconnaissance to Exfiltration - Foundational Campaign",
    difficulty: "foundational",
    order: 1,
    available: true,
    normalNextScenarioId: "silent_beacon_1",
    harderNextScenarioId: "rogue_route_1",
    remediationScenarioId: "recovery_path_1",
  },

  silent_beacon_1: {
    id: "silent_beacon_1",
    name: "DNS Beaconing and Internal Reconnaissance Investigation",
    difficulty: "normal",
    order: 2,
    available: true,
    normalNextScenarioId: null,
    harderNextScenarioId: "rogue_route_1",
    remediationScenarioId: "recovery_path_1",
  },

  rogue_route_1: {
    id: "rogue_route_1",
    name: "Rogue Route and Segmentation Bypass Investigation",
    difficulty: "hard",
    order: 3,
    available: false,
    normalNextScenarioId: null,
    harderNextScenarioId: null,
    remediationScenarioId: null,
  },

  recovery_path_1: {
    id: "recovery_path_1",
    name: "Adaptive Recovery Path",
    difficulty: "remediation",
    order: 0,
    available: false,
    normalNextScenarioId: null,
    harderNextScenarioId: null,
    remediationScenarioId: null,
  },
};

const PROGRESSION_THRESHOLDS = {
  WEAK_MAX_EXCLUSIVE: 65,
  NORMAL_MIN_INCLUSIVE: 65,
  NORMAL_MAX_INCLUSIVE: 85,
  ADVANCED_MIN_EXCLUSIVE: 85,
};

function clampScore(score) {
  const numeric = Number(score);

  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function normalizeLabel(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, char => char.toUpperCase());
}

function getDimensionScore(dimension) {
  if (dimension == null) return null;

  if (typeof dimension === "number") {
    return clampScore(dimension);
  }

  if (typeof dimension === "object") {
    if (typeof dimension.score === "number") return clampScore(dimension.score);
    if (typeof dimension.percentage === "number") {
      return clampScore(dimension.percentage);
    }
    if (typeof dimension.value === "number") return clampScore(dimension.value);
  }

  return null;
}

function extractDimensionEntries(dimensions = {}) {
  if (!dimensions || typeof dimensions !== "object" || Array.isArray(dimensions)) {
    return [];
  }

  return Object.entries(dimensions)
    .map(([key, value]) => {
      const score = getDimensionScore(value);

      return {
        key,
        label: value?.label || value?.name || normalizeLabel(key),
        score,
        status: value?.status || value?.level || null,
      };
    })
    .filter(entry => typeof entry.score === "number");
}

function extractPrimaryWeakness({ dimensions, weaknesses }) {
  if (Array.isArray(weaknesses) && weaknesses.length > 0) {
    const first = weaknesses[0];

    if (typeof first === "string") return first;
    if (first?.title) return first.title;
    if (first?.label) return first.label;
    if (first?.name) return first.name;
    if (first?.dimension) return normalizeLabel(first.dimension);
  }

  const entries = extractDimensionEntries(dimensions);
  if (entries.length === 0) return null;

  const sorted = [...entries].sort((a, b) => a.score - b.score);
  return sorted[0]?.label || null;
}

function extractPrimaryStrength({ dimensions, strengths }) {
  if (Array.isArray(strengths) && strengths.length > 0) {
    const first = strengths[0];

    if (typeof first === "string") return first;
    if (first?.title) return first.title;
    if (first?.label) return first.label;
    if (first?.name) return first.name;
    if (first?.dimension) return normalizeLabel(first.dimension);
  }

  const entries = extractDimensionEntries(dimensions);
  if (entries.length === 0) return null;

  const sorted = [...entries].sort((a, b) => b.score - a.score);
  return sorted[0]?.label || null;
}

function buildVariantSeed({ scenarioId, sessionId }) {
  return `variant-${scenarioId || "scenario"}-${sessionId || Date.now()}`;
}

function getScenarioMeta(scenarioId) {
  return SCENARIO_CATALOG[scenarioId] || {
    id: scenarioId || "unknown-scenario",
    name: "Unknown Scenario",
    difficulty: "unknown",
    order: 999,
    available: false,
    normalNextScenarioId: null,
    harderNextScenarioId: null,
    remediationScenarioId: null,
  };
}

function getScenarioName(scenarioId) {
  return SCENARIO_CATALOG[scenarioId]?.name || null;
}

function getScenarioAvailability(scenarioId) {
  if (!scenarioId) return false;
  return Boolean(SCENARIO_CATALOG[scenarioId]?.available);
}

function getProgressionBand(totalScore) {
  const score = clampScore(totalScore);

  if (score < PROGRESSION_THRESHOLDS.WEAK_MAX_EXCLUSIVE) {
    return {
      band: "remediation_recommended",
      label: "Remediation Recommended",
      threshold: "0-64",
    };
  }

  if (score > PROGRESSION_THRESHOLDS.ADVANCED_MIN_EXCLUSIVE) {
    return {
      band: "advanced_ready",
      label: "Advanced Ready",
      threshold: "86-100",
    };
  }

  return {
    band: "normal_progression",
    label: "Normal Progression",
    threshold: "65-85",
  };
}

function buildUnavailableRecommendationReason({
  baseReason,
  recommendedNextScenarioId,
  recommendedNextScenarioName,
}) {
  if (!recommendedNextScenarioId) {
    return baseReason;
  }

  return `${baseReason} The recommended scenario (${recommendedNextScenarioName || recommendedNextScenarioId}) is planned but not currently playable in this implementation.`;
}

function getProgressionRecommendation({
  sessionId,
  scenarioId,
  scenarioName,
  totalScore = 0,
  dimensions = null,
  strengths = [],
  weaknesses = [],
} = {}) {
  const score = clampScore(totalScore);
  const currentScenario = getScenarioMeta(scenarioId);
  const band = getProgressionBand(score);

  const primaryWeakness = extractPrimaryWeakness({ dimensions, weaknesses });
  const primaryStrength = extractPrimaryStrength({ dimensions, strengths });

  let recommendationType = "review";
  let recommendedNextScenarioId = null;
  let recommendedNextScenarioName = null;
  let recommendedScenarioAvailable = false;
  let reason = "";

  if (score < PROGRESSION_THRESHOLDS.WEAK_MAX_EXCLUSIVE) {
    recommendationType = "remediate_targeted";
    recommendedNextScenarioId =
      currentScenario.remediationScenarioId || "recovery_path_1";
    recommendedNextScenarioName =
      getScenarioName(recommendedNextScenarioId) || "Adaptive Recovery Path";
    recommendedScenarioAvailable = getScenarioAvailability(recommendedNextScenarioId);

    const weaknessPhrase = primaryWeakness
      ? ` The remediation path should focus on: ${primaryWeakness}.`
      : "";

    reason = buildUnavailableRecommendationReason({
      recommendedNextScenarioId,
      recommendedNextScenarioName,
      baseReason:
        `Learner scored below 65, so the system recommends a targeted remediation scenario before normal progression.${weaknessPhrase}`,
    });
  } else if (score > PROGRESSION_THRESHOLDS.ADVANCED_MIN_EXCLUSIVE) {
    recommendationType = "advance_harder";
    recommendedNextScenarioId = currentScenario.harderNextScenarioId || null;
    recommendedNextScenarioName = getScenarioName(recommendedNextScenarioId);
    recommendedScenarioAvailable = getScenarioAvailability(recommendedNextScenarioId);

    reason = buildUnavailableRecommendationReason({
      recommendedNextScenarioId,
      recommendedNextScenarioName,
      baseReason:
        "Learner scored above 85, so the system recommends a harder or more advanced network investigation scenario.",
    });
  } else {
    recommendationType = "advance_normal";
    recommendedNextScenarioId = currentScenario.normalNextScenarioId || null;
    recommendedNextScenarioName = getScenarioName(recommendedNextScenarioId);
    recommendedScenarioAvailable = getScenarioAvailability(recommendedNextScenarioId);

    if (recommendedNextScenarioId) {
      reason =
        "Learner scored between 65 and 85, so the system recommends continuing to the next normal scenario.";
    } else {
      recommendationType = "practice_or_waitlisted_next";
      reason =
        "Learner scored within the normal progression range, but no additional normal scenario is currently available. Review weaker dimensions before progressing.";
    }
  }

  return {
    score,
    band: band.band,
    bandLabel: band.label,
    threshold: band.threshold,

    recommendationType,
    recommendedNextScenarioId,
    recommendedNextScenarioName,
    recommendedScenarioAvailable,

    currentScenarioId: scenarioId || currentScenario.id,
    currentScenarioName: scenarioName || currentScenario.name,
    currentScenarioDifficulty: currentScenario.difficulty,

    primaryStrength,
    primaryWeakness,

    variantSeed: buildVariantSeed({ scenarioId, sessionId }),

    reason,
    generatedAt: new Date().toISOString(),
  };
}

module.exports = {
  SCENARIO_CATALOG,
  PROGRESSION_THRESHOLDS,
  getProgressionRecommendation,
};