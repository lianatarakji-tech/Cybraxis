function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeString(value) {
  return String(value || "").trim();
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function getRequiredInvestigation(stage = {}) {
  return stage.required_investigation || stage.requiredInvestigation || {};
}

function getRequiredDimensions(stage = {}) {
  const required = getRequiredInvestigation(stage);

  return normalizeArray(
    required.dimensions ||
      stage.required_dimensions ||
      stage.requiredDimensions
  );
}

function getRequiredTargetIds(stage = {}) {
  const required = getRequiredInvestigation(stage);

  return normalizeArray(
    required.target_ids ||
      required.targetIds ||
      stage.primary_targets ||
      stage.primaryTargets ||
      stage.suspicious_nodes ||
      stage.suspiciousNodes
  );
}

function unwrapInvestigationPayload(event = {}) {
  const payload = event.payload || {};

  return (
    payload.investigationEvent ||
    payload.investigation_event ||
    payload.event ||
    payload ||
    {}
  );
}

function normalizeInvestigationEvent(event = {}) {
  const payloadEvent = unwrapInvestigationPayload(event);

  return {
    id: payloadEvent.id || event.id || null,

    stageId:
      payloadEvent.stageId ||
      payloadEvent.stage_id ||
      event.stageId ||
      event.stage_id ||
      null,

    actionId:
      payloadEvent.actionId ||
      payloadEvent.action_id ||
      event.actionId ||
      event.action_id ||
      null,

    dimension:
      payloadEvent.dimension ||
      payloadEvent.coverageDimension ||
      event.dimension ||
      event.coverageDimension ||
      null,

    targetType:
      payloadEvent.targetType ||
      payloadEvent.target_type ||
      event.targetType ||
      event.target_type ||
      null,

    targetId:
      payloadEvent.targetId ||
      payloadEvent.target_id ||
      payloadEvent.nodeId ||
      payloadEvent.node_id ||
      event.targetId ||
      event.target_id ||
      event.nodeId ||
      event.node_id ||
      null,

    relatedAlertId:
      payloadEvent.relatedAlertId ||
      payloadEvent.related_alert_id ||
      event.relatedAlertId ||
      event.related_alert_id ||
      null,

    relatedLogId:
      payloadEvent.relatedLogId ||
      payloadEvent.related_log_id ||
      event.relatedLogId ||
      event.related_log_id ||
      null,

    createdAt:
      payloadEvent.createdAt ||
      payloadEvent.created_at ||
      payloadEvent.timestamp ||
      event.createdAt ||
      event.created_at ||
      event.timestamp ||
      null,
  };
}

function eventBelongsToStage(event, stageId) {
  if (!stageId) return true;
  return normalizeString(event.stageId) === normalizeString(stageId);
}

function targetHasRequiredCoverage(dimensionCoverage = {}, requiredDimensions = []) {
  if (requiredDimensions.length > 0) {
    return requiredDimensions.every(dimension => Boolean(dimensionCoverage[dimension]));
  }

  return Object.values(dimensionCoverage).some(Boolean);
}

function buildCoverageMatrix({
  stage = {},
  stageId = null,
  investigationEvents = [],
} = {}) {
  const requiredDimensions = getRequiredDimensions(stage);
  const requiredTargetIds = getRequiredTargetIds(stage);

  const normalizedEvents = normalizeArray(investigationEvents)
    .map(normalizeInvestigationEvent)
    .filter(event => eventBelongsToStage(event, stageId || stage.id));

  const completedDimensions = unique(
    normalizedEvents
      .map(event => event.dimension)
      .filter(Boolean)
  );

  const completedTargetIds = unique(
    normalizedEvents
      .filter(event => event.targetType === "node" || event.targetType == null)
      .map(event => event.targetId)
      .filter(Boolean)
  );

  const nodeCoverage = {};
  const coverageByTarget = {};

  for (const targetId of requiredTargetIds) {
    const targetEvents = normalizedEvents.filter(event => event.targetId === targetId);

    const dimensionCoverage = {
      identity: targetEvents.some(event => event.dimension === "identity"),
      connectivity: targetEvents.some(event => event.dimension === "connectivity"),
      controls: targetEvents.some(event => event.dimension === "controls"),
      activity: targetEvents.some(event => event.dimension === "activity"),
      interpretation: targetEvents.some(event => event.dimension === "interpretation"),
    };

    const investigated = targetHasRequiredCoverage(
      dimensionCoverage,
      requiredDimensions
    );

    nodeCoverage[targetId] = {
      investigated,
      ...dimensionCoverage,
      eventCount: targetEvents.length,
    };

    coverageByTarget[targetId] = {};

    for (const dimension of requiredDimensions) {
      coverageByTarget[targetId][dimension] = Boolean(dimensionCoverage[dimension]);
    }
  }

  const missingDimensions = requiredDimensions.filter(
    dimension => !completedDimensions.includes(dimension)
  );

  const missingTargetIds = requiredTargetIds.filter(
    targetId => !nodeCoverage[targetId]?.investigated
  );

  const missingTargetDimensionPairs = [];

  for (const targetId of requiredTargetIds) {
    for (const dimension of requiredDimensions) {
      if (!coverageByTarget[targetId]?.[dimension]) {
        missingTargetDimensionPairs.push({
          targetId,
          dimension,
        });
      }
    }
  }

  const investigatedNodeCount = Object.values(nodeCoverage).filter(
    node => node.investigated
  ).length;

  const allRequiredDimensionsComplete =
    requiredDimensions.length === 0 ||
    missingDimensions.length === 0;

  const allRequiredTargetsComplete =
    requiredTargetIds.length === 0 ||
    investigatedNodeCount === requiredTargetIds.length;

  const allTargetDimensionPairsComplete =
    requiredTargetIds.length === 0 ||
    requiredDimensions.length === 0 ||
    missingTargetDimensionPairs.length === 0;

  const allRequiredCoverageComplete =
    allRequiredDimensionsComplete &&
    allRequiredTargetsComplete &&
    allTargetDimensionPairsComplete;

  return {
    stageId: stageId || stage.id || null,

    requiredDimensions,
    requiredTargetIds,

    completedDimensions,
    completedTargetIds,

    missingDimensions,
    missingTargetIds,
    missingTargetDimensionPairs,

    coverageByTarget,
    nodeCoverage,

    investigatedEventCount: normalizedEvents.length,
    investigatedTargetCount: investigatedNodeCount,
    investigatedNodeCount,

    requiredTargetCount: requiredTargetIds.length,
    suspiciousNodeCount: requiredTargetIds.length,

    allRequiredDimensionsComplete,
    allRequiredTargetsComplete,
    allTargetDimensionPairsComplete,
    allRequiredCoverageComplete,

    allSuspiciousNodesInvestigated: allRequiredCoverageComplete,

    coveragePercent: calculateCoveragePercent({
      requiredDimensions,
      requiredTargetIds,
      missingTargetDimensionPairs,
      completedDimensions,
      investigatedNodeCount,
    }),
  };
}

function calculateCoveragePercent({
  requiredDimensions = [],
  requiredTargetIds = [],
  missingTargetDimensionPairs = [],
  completedDimensions = [],
  investigatedNodeCount = 0,
}) {
  if (requiredDimensions.length > 0 && requiredTargetIds.length > 0) {
    const totalPairs = requiredDimensions.length * requiredTargetIds.length;
    const completedPairs = totalPairs - missingTargetDimensionPairs.length;

    if (totalPairs <= 0) return 100;

    return Math.max(
      0,
      Math.min(100, Math.round((completedPairs / totalPairs) * 100))
    );
  }

  if (requiredDimensions.length > 0) {
    return Math.round((completedDimensions.length / requiredDimensions.length) * 100);
  }

  if (requiredTargetIds.length > 0) {
    return Math.round((investigatedNodeCount / requiredTargetIds.length) * 100);
  }

  return 100;
}

function getCoverageStatus(coverageMatrix = {}) {
  if (coverageMatrix.allRequiredCoverageComplete) {
    return {
      status: "complete",
      label: "Coverage Complete",
      message: "Required investigation coverage is complete.",
    };
  }

  if (
    coverageMatrix.completedDimensions?.length > 0 ||
    coverageMatrix.completedTargetIds?.length > 0
  ) {
    return {
      status: "partial",
      label: "Coverage Partial",
      message:
        "Investigation coverage is partially complete, but required evidence is still missing.",
    };
  }

  return {
    status: "missing",
    label: "Coverage Missing",
    message: "Required investigation coverage has not been completed.",
  };
}

function buildCoverageHint(coverageMatrix = {}) {
  if (coverageMatrix.allRequiredCoverageComplete) {
    return "Required investigation coverage is complete. Response actions can be considered.";
  }

  const parts = [];

  if (coverageMatrix.missingTargetIds?.length > 0) {
    parts.push(`missing targets: ${coverageMatrix.missingTargetIds.join(", ")}`);
  }

  if (coverageMatrix.missingDimensions?.length > 0) {
    parts.push(`missing dimensions: ${coverageMatrix.missingDimensions.join(", ")}`);
  }

  if (coverageMatrix.missingTargetDimensionPairs?.length > 0) {
    const sample = coverageMatrix.missingTargetDimensionPairs
      .slice(0, 3)
      .map(pair => `${pair.targetId}/${pair.dimension}`)
      .join(", ");

    parts.push(`missing target evidence: ${sample}`);
  }

  if (parts.length === 0) {
    return "Investigation coverage is incomplete. Review the required evidence before response.";
  }

  return `Investigation coverage is incomplete: ${parts.join("; ")}.`;
}

function evaluateInvestigationCoverage(input = {}) {
  const coverageMatrix = buildCoverageMatrix(input);

  return {
    ...coverageMatrix,
    coverageStatus: getCoverageStatus(coverageMatrix),
    guidanceHint: buildCoverageHint(coverageMatrix),
    evaluatedAt: new Date().toISOString(),
  };
}

function buildStageFromFrontendCoverage({
  stageId,
  investigationTargetCoverage = null,
} = {}) {
  const targetIds = Object.keys(investigationTargetCoverage?.nodeCoverage || {});
  const requiredDimensions = normalizeArray(
    investigationTargetCoverage?.requiredDimensions
  );

  return {
    id: stageId,
    requiredInvestigation: {
      dimensions: requiredDimensions,
      target_ids: targetIds,
    },
  };
}

function compareCoverageResults(frontendCoverage = null, backendCoverage = null) {
  const frontendAllRequiredCoverageComplete = Boolean(
    frontendCoverage?.allRequiredCoverageComplete
  );

  const backendAllRequiredCoverageComplete = Boolean(
    backendCoverage?.allRequiredCoverageComplete
  );

  const frontendInvestigatedNodeCount = Number(
    frontendCoverage?.investigatedNodeCount ?? 0
  );

  const backendInvestigatedNodeCount = Number(
    backendCoverage?.investigatedNodeCount ?? 0
  );

  const frontendSuspiciousNodeCount = Number(
    frontendCoverage?.suspiciousNodeCount ?? 0
  );

  const backendSuspiciousNodeCount = Number(
    backendCoverage?.suspiciousNodeCount ?? 0
  );

  const frontendRequiredDimensions = normalizeArray(
    frontendCoverage?.requiredDimensions
  );

  const backendRequiredDimensions = normalizeArray(
    backendCoverage?.requiredDimensions
  );

  const matches =
    frontendAllRequiredCoverageComplete === backendAllRequiredCoverageComplete &&
    frontendInvestigatedNodeCount === backendInvestigatedNodeCount &&
    frontendSuspiciousNodeCount === backendSuspiciousNodeCount &&
    JSON.stringify([...frontendRequiredDimensions].sort()) ===
      JSON.stringify([...backendRequiredDimensions].sort());

  return {
    matches,

    frontend: {
      allRequiredCoverageComplete: frontendAllRequiredCoverageComplete,
      investigatedNodeCount: frontendInvestigatedNodeCount,
      suspiciousNodeCount: frontendSuspiciousNodeCount,
      requiredDimensions: frontendRequiredDimensions,
    },

    backend: {
      allRequiredCoverageComplete: backendAllRequiredCoverageComplete,
      investigatedNodeCount: backendInvestigatedNodeCount,
      suspiciousNodeCount: backendSuspiciousNodeCount,
      requiredDimensions: backendRequiredDimensions,
    },

    checkedAt: new Date().toISOString(),
  };
}

module.exports = {
  normalizeInvestigationEvent,
  buildCoverageMatrix,
  evaluateInvestigationCoverage,
  getCoverageStatus,
  buildCoverageHint,
  buildStageFromFrontendCoverage,
  compareCoverageResults,
};