import { nowStr } from "../runtime/runtimeState";

export const INVESTIGATION_DIMENSIONS = {
  IDENTITY: "identity",
  CONNECTIVITY: "connectivity",
  CONTROLS: "controls",
  ACTIVITY: "activity",
  INTERPRETATION: "interpretation",
};

export function createInvestigationEvent({
  stageId,
  dimension,
  actionId,
  label,
  targetType = "none",
  targetId = null,
  relatedAlertId = null,
  relatedLogId = null,
  timestamp = nowStr(),
}) {
  return {
    id: `${timestamp}-${stageId || "stage"}-${dimension}-${actionId}-${targetId || "no-target"}`,
    timestamp,
    stageId,
    dimension,
    actionId,
    label,
    targetType,
    targetId,
    relatedAlertId,
    relatedLogId,
  };
}

export function addInvestigationEvent(events, event) {
  if (!event) return events;

  return [
    event,
    ...events,
  ];
}

export function getInvestigationCoverage(events, stageId) {
  const stageEvents = events.filter(event => event.stageId === stageId);

  return {
    identity: stageEvents.some(
      event => event.dimension === INVESTIGATION_DIMENSIONS.IDENTITY
    ),
    connectivity: stageEvents.some(
      event => event.dimension === INVESTIGATION_DIMENSIONS.CONNECTIVITY
    ),
    controls: stageEvents.some(
      event => event.dimension === INVESTIGATION_DIMENSIONS.CONTROLS
    ),
    activity: stageEvents.some(
      event => event.dimension === INVESTIGATION_DIMENSIONS.ACTIVITY
    ),
    interpretation: stageEvents.some(
      event => event.dimension === INVESTIGATION_DIMENSIONS.INTERPRETATION
    ),
  };
}

export function getRequiredInvestigationDimensions(expectedActions = []) {
  const requiredDimensions = [];

  if (expectedActions.includes("investigate IP")) {
    requiredDimensions.push(INVESTIGATION_DIMENSIONS.CONNECTIVITY);
  }

  if (expectedActions.includes("investigate user")) {
    requiredDimensions.push(INVESTIGATION_DIMENSIONS.IDENTITY);
  }

  return requiredDimensions;
}

export function getCoverageTargetIds(requiredInvestigation = {}, suspiciousNodeIds = []) {
  if (
    requiredInvestigation.target_scope === "required_targets" &&
    Array.isArray(requiredInvestigation.target_ids)
  ) {
    return requiredInvestigation.target_ids;
  }

  return suspiciousNodeIds;
}

export function getStageTargetCoverage(
  events,
  stageId,
  targetNodeIds = [],
  requiredDimensions = []
) {
  const stageEvents = events.filter(event => event.stageId === stageId);

  const nodeCoverage = targetNodeIds.reduce((coverage, nodeId) => {
    const nodeEvents = stageEvents.filter(
      event => event.targetType === "node" && event.targetId === nodeId
    );

    const dimensionCoverage = {
      identity: nodeEvents.some(
        event => event.dimension === INVESTIGATION_DIMENSIONS.IDENTITY
      ),
      connectivity: nodeEvents.some(
        event => event.dimension === INVESTIGATION_DIMENSIONS.CONNECTIVITY
      ),
      controls: nodeEvents.some(
        event => event.dimension === INVESTIGATION_DIMENSIONS.CONTROLS
      ),
      activity: nodeEvents.some(
        event => event.dimension === INVESTIGATION_DIMENSIONS.ACTIVITY
      ),
      interpretation: nodeEvents.some(
        event => event.dimension === INVESTIGATION_DIMENSIONS.INTERPRETATION
      ),
    };

    const hasRequiredCoverage =
      requiredDimensions.length > 0
        ? requiredDimensions.every(dimension => dimensionCoverage[dimension])
        : (
            dimensionCoverage.identity ||
            dimensionCoverage.connectivity ||
            dimensionCoverage.controls ||
            dimensionCoverage.activity ||
            dimensionCoverage.interpretation
          );

    coverage[nodeId] = {
      investigated: hasRequiredCoverage,
      ...dimensionCoverage,
      eventCount: nodeEvents.length,
    };

    return coverage;
  }, {});

  const investigatedNodeCount = Object.values(nodeCoverage).filter(
    node => node.investigated
  ).length;

  const allRequiredCoverageComplete =
    targetNodeIds.length === 0 ||
    investigatedNodeCount === targetNodeIds.length;

  return {
    suspiciousNodeCount: targetNodeIds.length,
    investigatedNodeCount,
    requiredDimensions,
    nodeCoverage,
    allSuspiciousNodesInvestigated: allRequiredCoverageComplete,
    allRequiredCoverageComplete,
  };
}