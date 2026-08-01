function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeString(value) {
  return String(value || "").trim();
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function getNodes(scenario = {}) {
  return normalizeArray(scenario.nodes || scenario.topology?.nodes);
}

function getEdges(scenario = {}) {
  return normalizeArray(
    scenario.edges ||
      scenario.attack_edges ||
      scenario.attackEdges ||
      scenario.topology?.edges
  );
}

function getStageAttackEdges(stage = {}, scenario = {}) {
  return normalizeArray(
    stage.attack_edges ||
      stage.attackEdges ||
      scenario.stage_attack_edges?.[stage.id] ||
      scenario.stageAttackEdges?.[stage.id]
  );
}

function getStageRiskContext(stage = {}) {
  return stage.network_risk || stage.networkRisk || {};
}

function getCriticalNodeIds(stage = {}) {
  const risk = getStageRiskContext(stage);

  return unique([
    ...normalizeArray(risk.critical_node_ids || risk.criticalNodeIds),
    ...normalizeArray(stage.critical_nodes || stage.criticalNodes),
  ]);
}

function getSourceNodeIds(stage = {}) {
  const risk = getStageRiskContext(stage);

  return unique([
    ...normalizeArray(risk.source_node_ids || risk.sourceNodeIds),
    ...normalizeArray(stage.source_nodes || stage.sourceNodes),
  ]);
}

function getTargetNodeIds(stage = {}) {
  const risk = getStageRiskContext(stage);

  return unique([
    ...normalizeArray(risk.target_node_ids || risk.targetNodeIds),
    ...normalizeArray(stage.target_nodes || stage.targetNodes),
    ...normalizeArray(stage.suspicious_nodes || stage.suspiciousNodes),
  ]);
}

function getControlPointNodeIds(stage = {}) {
  const risk = getStageRiskContext(stage);

  return unique([
    ...normalizeArray(risk.control_point_node_ids || risk.controlPointNodeIds),
    ...normalizeArray(stage.control_points || stage.controlPoints),
  ]);
}

function getExternalNodeIds(stage = {}) {
  const risk = getStageRiskContext(stage);

  return unique([
    ...normalizeArray(risk.external_node_ids || risk.externalNodeIds),
    ...normalizeArray(stage.external_nodes || stage.externalNodes),
  ]);
}

function edgeMatchesNode(edge = {}, nodeId) {
  if (!nodeId) return false;

  return (
    edge.source === nodeId ||
    edge.target === nodeId ||
    edge.from === nodeId ||
    edge.to === nodeId ||
    edge.source_id === nodeId ||
    edge.target_id === nodeId
  );
}

function normalizeEdge(edge = {}) {
  const source = edge.source || edge.from || edge.source_id || null;
  const target = edge.target || edge.to || edge.target_id || null;

  return {
    id: edge.id || `${source || "unknown"}->${target || "unknown"}`,
    source,
    target,
    type: edge.type || edge.edge_type || edge.kind || null,
    risk: edge.risk || edge.risk_level || edge.severity || null,
    label: edge.label || edge.name || null,
  };
}

function getNodeById(scenario = {}, nodeId) {
  return getNodes(scenario).find(node => {
    return (
      node.id === nodeId ||
      node.node_id === nodeId ||
      node.key === nodeId
    );
  }) || null;
}

function getNodeRole({
  stage = {},
  nodeId,
} = {}) {
  if (!nodeId) return "none";

  if (getSourceNodeIds(stage).includes(nodeId)) return "source";
  if (getControlPointNodeIds(stage).includes(nodeId)) return "control_point";
  if (getExternalNodeIds(stage).includes(nodeId)) return "external";
  if (getCriticalNodeIds(stage).includes(nodeId)) return "critical_asset";
  if (getTargetNodeIds(stage).includes(nodeId)) return "target";

  return "unclassified";
}

function isNodeRelevantToStage({
  stage = {},
  scenario = {},
  nodeId,
} = {}) {
  if (!nodeId) return false;

  const explicitRelevant = unique([
    ...getSourceNodeIds(stage),
    ...getTargetNodeIds(stage),
    ...getControlPointNodeIds(stage),
    ...getCriticalNodeIds(stage),
    ...getExternalNodeIds(stage),
  ]);

  if (explicitRelevant.includes(nodeId)) return true;

  const attackEdges = getStageAttackEdges(stage, scenario).map(normalizeEdge);
  return attackEdges.some(edge => edgeMatchesNode(edge, nodeId));
}

function getStagePathNodes({
  stage = {},
  scenario = {},
} = {}) {
  const attackEdges = getStageAttackEdges(stage, scenario).map(normalizeEdge);

  const edgeNodes = attackEdges.flatMap(edge => [
    edge.source,
    edge.target,
  ]);

  return unique([
    ...getSourceNodeIds(stage),
    ...getControlPointNodeIds(stage),
    ...getTargetNodeIds(stage),
    ...getCriticalNodeIds(stage),
    ...getExternalNodeIds(stage),
    ...edgeNodes,
  ]);
}

function evaluateSelectedNodeRisk({
  stage = {},
  scenario = {},
  selectedNodeId = null,
} = {}) {
  const node = getNodeById(scenario, selectedNodeId);
  const role = getNodeRole({ stage, nodeId: selectedNodeId });
  const relevant = isNodeRelevantToStage({
    stage,
    scenario,
    nodeId: selectedNodeId,
  });

  const stagePathNodes = getStagePathNodes({
    stage,
    scenario,
  });

  const connectedAttackEdges = getStageAttackEdges(stage, scenario)
    .map(normalizeEdge)
    .filter(edge => edgeMatchesNode(edge, selectedNodeId));

  let riskLevel = "low";

  if (role === "source" || role === "external" || role === "control_point") {
    riskLevel = "high";
  } else if (role === "critical_asset" || role === "target") {
    riskLevel = "medium";
  } else if (relevant) {
    riskLevel = "medium";
  }

  return {
    selectedNodeId,
    nodeLabel: node?.label || node?.name || selectedNodeId || null,
    role,
    relevant,
    riskLevel,
    inStagePath: stagePathNodes.includes(selectedNodeId),
    connectedAttackEdges,
  };
}

function getContainmentTargets(stage = {}) {
  const risk = getStageRiskContext(stage);

  return unique([
    ...normalizeArray(risk.containment_target_ids || risk.containmentTargetIds),
    ...normalizeArray(stage.containment_targets || stage.containmentTargets),
    ...getControlPointNodeIds(stage),
    ...getExternalNodeIds(stage),
  ]);
}

function evaluateContainmentTarget({
  stage = {},
  scenario = {},
  selectedNodeId = null,
  action = {},
} = {}) {
  const containmentTargets = getContainmentTargets(stage);
  const selectedNodeRisk = evaluateSelectedNodeRisk({
    stage,
    scenario,
    selectedNodeId,
  });

  const actionAllowedTargets = normalizeArray(
    action.target_ids ||
      action.targetIds ||
      action.allowed_target_ids ||
      action.allowedTargetIds
  );

  const allowedByAction =
    actionAllowedTargets.length === 0 ||
    actionAllowedTargets.includes(selectedNodeId);

  const allowedByStage =
    containmentTargets.length === 0 ||
    containmentTargets.includes(selectedNodeId);

  const correctContainmentTarget = allowedByAction && allowedByStage;

  let reasonCode = "containment_target_valid";
  let message = "Containment target matches the current network risk.";

  if (!selectedNodeId) {
    reasonCode = "missing_containment_target";
    message = "No containment target was selected.";
  } else if (!allowedByAction) {
    reasonCode = "target_not_allowed_for_action";
    message = "Selected node does not match this action's allowed target set.";
  } else if (!allowedByStage) {
    reasonCode = "target_not_recommended_for_stage";
    message = "Selected node is not the recommended containment point for this stage.";
  }

  return {
    selectedNodeId,
    containmentTargets,
    actionAllowedTargets,
    correctContainmentTarget,
    reasonCode,
    message,
    selectedNodeRisk,
  };
}

function evaluateNetworkRisk({
  stage = {},
  scenario = {},
  selectedNodeId = null,
  action = null,
} = {}) {
  const selectedNodeRisk = evaluateSelectedNodeRisk({
    stage,
    scenario,
    selectedNodeId,
  });

  const containmentEvaluation = action
    ? evaluateContainmentTarget({
        stage,
        scenario,
        selectedNodeId,
        action,
      })
    : null;

  const pathNodes = getStagePathNodes({
    stage,
    scenario,
  });

  return {
    stageId: stage.id || null,
    selectedNodeRisk,
    containmentEvaluation,
    pathNodes,
    evaluatedAt: new Date().toISOString(),
  };
}

module.exports = {
  normalizeEdge,
  getNodeById,
  getNodeRole,
  getStagePathNodes,
  isNodeRelevantToStage,
  evaluateSelectedNodeRisk,
  evaluateContainmentTarget,
  evaluateNetworkRisk,
};