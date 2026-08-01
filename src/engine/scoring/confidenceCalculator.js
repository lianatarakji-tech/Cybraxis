export const CONFIDENCE_LEVELS = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
};

export function calculateCoverageConfidence(investigationTargetCoverage) {
  if (!investigationTargetCoverage) {
    return CONFIDENCE_LEVELS.LOW;
  }

  const totalTargets = investigationTargetCoverage.suspiciousNodeCount || 0;
  const coveredTargets = investigationTargetCoverage.investigatedNodeCount || 0;

  if (totalTargets === 0) {
    return CONFIDENCE_LEVELS.MEDIUM;
  }

  const ratio = coveredTargets / totalTargets;

  if (ratio >= 1) return CONFIDENCE_LEVELS.HIGH;
  if (ratio >= 0.5) return CONFIDENCE_LEVELS.MEDIUM;

  return CONFIDENCE_LEVELS.LOW;
}

export function calculateDimensionConfidence(investigationCoverage = {}) {
  const coveredDimensions = Object.values(investigationCoverage).filter(Boolean).length;

  if (coveredDimensions >= 4) return CONFIDENCE_LEVELS.HIGH;
  if (coveredDimensions >= 2) return CONFIDENCE_LEVELS.MEDIUM;

  return CONFIDENCE_LEVELS.LOW;
}

export function calculateOverallInvestigationConfidence({
  investigationCoverage,
  investigationTargetCoverage,
}) {
  const coverageConfidence = calculateCoverageConfidence(investigationTargetCoverage);
  const dimensionConfidence = calculateDimensionConfidence(investigationCoverage);

  if (
    coverageConfidence === CONFIDENCE_LEVELS.HIGH &&
    dimensionConfidence === CONFIDENCE_LEVELS.HIGH
  ) {
    return CONFIDENCE_LEVELS.HIGH;
  }

  if (
    coverageConfidence === CONFIDENCE_LEVELS.LOW ||
    dimensionConfidence === CONFIDENCE_LEVELS.LOW
  ) {
    return CONFIDENCE_LEVELS.LOW;
  }

  return CONFIDENCE_LEVELS.MEDIUM;
}