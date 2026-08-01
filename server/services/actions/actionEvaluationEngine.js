function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeString(value) {
  return String(value || "").trim();
}

function sameActionValue(left, right) {
  const normalizedLeft = normalizeString(left).toLowerCase();
  const normalizedRight = normalizeString(right).toLowerCase();

  return (
    normalizedLeft.length > 0 &&
    normalizedRight.length > 0 &&
    normalizedLeft === normalizedRight
  );
}

function actionMatchesId(action, actionId) {
  if (!action || !actionId) return false;

  return (
    sameActionValue(action.id, actionId) ||
    sameActionValue(action.action_id, actionId) ||
    sameActionValue(action.actionId, actionId)
  );
}

function actionMatchesHistoryEntry(action, historyEntry) {
  if (!action || !historyEntry || typeof historyEntry === "string") {
    return false;
  }

  const actionValues = [
    action.id,
    action.action_id,
    action.actionId,
    action.label,
    action.name,
    action.action,
    action.scenarioAction,
    action.scenario_action,
  ].filter(Boolean);

  const historyValues = [
    historyEntry.actionId,
    historyEntry.action_id,
    historyEntry.id,
    historyEntry.scenarioAction,
    historyEntry.scenario_action,
    historyEntry.action,
    historyEntry.label,
    historyEntry.name,
  ].filter(Boolean);

  return historyValues.some(historyValue =>
    actionValues.some(actionValue => sameActionValue(historyValue, actionValue))
  );
}

function getHistoryEntryTargetId(historyEntry = {}) {
  if (!historyEntry || typeof historyEntry === "string") return null;

  return (
    historyEntry.targetId ||
    historyEntry.target_id ||
    historyEntry.selectedNodeId ||
    historyEntry.selected_node_id ||
    historyEntry.selectedTargetId ||
    historyEntry.selected_target_id ||
    historyEntry.nodeId ||
    historyEntry.node_id ||
    null
  );
}

function getCurrentTargetId({ selectedNodeId = null, selectedTargetId = null } = {}) {
  return selectedNodeId || selectedTargetId || null;
}

function getExpectedActions(stage = {}) {
  return normalizeArray(stage.expected_actions);
}

function getWrongActions(stage = {}) {
  return normalizeArray(stage.wrong_actions);
}

function getPreferredActionOrder(stage = {}) {
  const explicitOrder =
    stage.scoring?.preferred_action_order ||
    stage.preferred_action_order ||
    stage.preferredActionOrder;

  if (Array.isArray(explicitOrder) && explicitOrder.length > 0) {
    return explicitOrder;
  }

  return getExpectedActions(stage)
    .map(action => action.id || action.action_id || action.actionId)
    .filter(Boolean);
}

function getRequiredInvestigation(stage = {}) {
  return stage.required_investigation || stage.requiredInvestigation || {};
}

function getRequiredTargets(stage = {}) {
  const requiredInvestigation = getRequiredInvestigation(stage);

  return normalizeArray(
    requiredInvestigation.target_ids ||
      requiredInvestigation.targetIds ||
      stage.primary_targets ||
      stage.primaryTargets
  );
}

function getRequiredDimensions(stage = {}) {
  const requiredInvestigation = getRequiredInvestigation(stage);

  return normalizeArray(
    requiredInvestigation.dimensions ||
      stage.required_dimensions ||
      stage.requiredDimensions
  );
}

function getActionTargetIds(action = {}) {
  return normalizeArray(
    action.target_ids ||
      action.targetIds ||
      action.allowed_target_ids ||
      action.allowedTargetIds
  );
}

function getActionRequiredCoverage(action = {}) {
  return normalizeArray(
    action.requires_investigation ||
      action.required_investigation ||
      action.requiredInvestigation ||
      action.requiredCoverage
  );
}

function getActionKind(action = {}) {
  return (
    action.kind ||
    action.action_type ||
    action.actionType ||
    action.category ||
    "unknown"
  );
}

function isResponseAction(action = {}) {
  const kind = getActionKind(action);

  return [
    "response",
    "containment",
    "block",
    "isolate",
    "remediation",
    "control",
  ].includes(kind);
}

function isInvestigationAction(action = {}) {
  const kind = getActionKind(action);

  return [
    "investigation",
    "inspect",
    "review",
    "triage",
    "analysis",
  ].includes(kind);
}

function getCompletedActionIds(actionHistory = []) {
  return normalizeArray(actionHistory)
    .map(action => {
      if (typeof action === "string") return action;

      return (
        action.actionId ||
        action.id ||
        action.action_id ||
        action.scenarioAction ||
        action.scenario_action ||
        action.action ||
        action.label ||
        null
      );
    })
    .filter(Boolean);
}

function getCoverageInfo(coverage = {}) {
  return {
    allRequiredCoverageComplete: Boolean(
      coverage.allRequiredCoverageComplete ||
        coverage.coverageComplete ||
        coverage.complete
    ),
    completedDimensions: normalizeArray(
      coverage.completedDimensions ||
        coverage.dimensionsComplete ||
        coverage.coveredDimensions
    ),
    completedTargetIds: normalizeArray(
      coverage.completedTargetIds ||
        coverage.coveredTargetIds ||
        coverage.investigatedTargetIds ||
        coverage.investigatedNodeIds
    ),
  };
}

function hasAllRequiredDimensions({ requiredDimensions, coverageInfo }) {
  if (!requiredDimensions.length) return true;

  return requiredDimensions.every(dimension =>
    coverageInfo.completedDimensions.includes(dimension)
  );
}

function hasAllRequiredTargets({ requiredTargets, coverageInfo }) {
  if (!requiredTargets.length) return true;

  return requiredTargets.every(targetId =>
    coverageInfo.completedTargetIds.includes(targetId)
  );
}

function selectedTargetIsAllowed({ action, selectedNodeId, selectedTargetId }) {
  const targetId = selectedNodeId || selectedTargetId;
  const allowedTargets = getActionTargetIds(action);

  if (!targetId || allowedTargets.length === 0) return true;

  return allowedTargets.includes(targetId);
}

function getExpectedAction(stage, actionId) {
  return getExpectedActions(stage).find(action =>
    actionMatchesId(action, actionId)
  );
}

function getWrongAction(stage, actionId) {
  return getWrongActions(stage).find(action =>
    actionMatchesId(action, actionId)
  );
}

function isRepeatedAction({
  actionId,
  actionHistory,
  expectedAction = null,
  selectedNodeId = null,
  selectedTargetId = null,
}) {
  if (!actionId || !expectedAction) return false;

  const currentTargetId = getCurrentTargetId({
    selectedNodeId,
    selectedTargetId,
  });

  if (!currentTargetId) return false;

  return normalizeArray(actionHistory).some(historyEntry => {
    if (!historyEntry || typeof historyEntry === "string") {
      return false;
    }

    const historyTargetId = getHistoryEntryTargetId(historyEntry);

    if (!historyTargetId) return false;

    const sameTarget = sameActionValue(historyTargetId, currentTargetId);
    const sameAction = actionMatchesHistoryEntry(expectedAction, historyEntry);

    return sameAction && sameTarget;
  });
}

function getSequenceStatus({
  actionId,
  preferredActionOrder,
  actionHistory,
}) {
  if (!actionId || !preferredActionOrder.length) {
    return {
      status: "not_applicable",
      expectedNextActionId: null,
      currentActionIndex: -1,
      expectedActionIndex: -1,
    };
  }

  const completedActionIds = getCompletedActionIds(actionHistory);
  const expectedNextActionId = preferredActionOrder.find(
    expectedId =>
      !completedActionIds.some(completedAction =>
        sameActionValue(completedAction, expectedId)
      )
  );

  if (!expectedNextActionId) {
    return {
      status: "complete",
      expectedNextActionId: null,
      currentActionIndex: preferredActionOrder.indexOf(actionId),
      expectedActionIndex: -1,
    };
  }

  if (sameActionValue(actionId, expectedNextActionId)) {
    return {
      status: "correct",
      expectedNextActionId,
      currentActionIndex: preferredActionOrder.indexOf(actionId),
      expectedActionIndex: preferredActionOrder.indexOf(expectedNextActionId),
    };
  }

  const currentActionIndex = preferredActionOrder.findIndex(expectedActionId =>
    sameActionValue(expectedActionId, actionId)
  );

  const expectedActionIndex = preferredActionOrder.indexOf(expectedNextActionId);

  if (currentActionIndex === -1) {
    return {
      status: "outside_expected_sequence",
      expectedNextActionId,
      currentActionIndex,
      expectedActionIndex,
    };
  }

  if (currentActionIndex > expectedActionIndex) {
    return {
      status: "premature",
      expectedNextActionId,
      currentActionIndex,
      expectedActionIndex,
    };
  }

  return {
    status: "late_or_repeated",
    expectedNextActionId,
    currentActionIndex,
    expectedActionIndex,
  };
}

function classifyAction({
  stage = {},
  actionId,
  actionHistory = [],
  selectedNodeId = null,
  selectedTargetId = null,
  investigationCoverage = {},
} = {}) {
  const cleanActionId = normalizeString(actionId);

  if (!cleanActionId) {
    return {
      classification: "invalid",
      accepted: false,
      reasonCode: "missing_action_id",
      message: "No action was provided for evaluation.",
    };
  }

  const expectedAction = getExpectedAction(stage, cleanActionId);
  const wrongAction = getWrongAction(stage, cleanActionId);
  const preferredActionOrder = getPreferredActionOrder(stage);
  const coverageInfo = getCoverageInfo(investigationCoverage);

  if (wrongAction) {
    return {
      classification: "wrong",
      accepted: false,
      reasonCode: wrongAction.reason_code || wrongAction.reasonCode || "wrong_action",
      message:
        wrongAction.feedback ||
        wrongAction.message ||
        "This action does not match the current stage objective.",
      matchedAction: wrongAction,
    };
  }

  if (!expectedAction) {
    return {
      classification: "irrelevant",
      accepted: false,
      reasonCode: "action_not_expected_for_stage",
      message: "This action is not part of the expected response set for the current stage.",
    };
  }

  if (
    isRepeatedAction({
      actionId: cleanActionId,
      actionHistory,
      expectedAction,
      selectedNodeId,
      selectedTargetId,
    })
  ) {
    return {
      classification: "repeated",
      accepted: false,
      reasonCode: "repeated_action_same_target",
      message: "This action has already been taken on the selected target in the current stage.",
      matchedAction: expectedAction,
    };
  }

  if (
    !selectedTargetIsAllowed({
      action: expectedAction,
      selectedNodeId,
      selectedTargetId,
    })
  ) {
    return {
      classification: "wrong_target",
      accepted: false,
      reasonCode: "wrong_target",
      message:
        expectedAction.wrong_target_feedback ||
        "The selected node or target does not match the action objective.",
      matchedAction: expectedAction,
    };
  }

  const requiredActionCoverage = getActionRequiredCoverage(expectedAction);
  const requiredStageDimensions = getRequiredDimensions(stage);
  const requiredStageTargets = getRequiredTargets(stage);

  const requiredDimensions =
    requiredActionCoverage.length > 0
      ? requiredActionCoverage
      : requiredStageDimensions;

  const coverageComplete =
    coverageInfo.allRequiredCoverageComplete ||
    (
      hasAllRequiredDimensions({
        requiredDimensions,
        coverageInfo,
      }) &&
      hasAllRequiredTargets({
        requiredTargets: requiredStageTargets,
        coverageInfo,
      })
    );

  if (isResponseAction(expectedAction) && !coverageComplete) {
    return {
      classification: "premature",
      accepted: false,
      reasonCode: "coverage_incomplete_before_response",
      message:
        stage.mentor?.coverage_incomplete ||
        expectedAction.coverage_incomplete_feedback ||
        "Investigation coverage is incomplete. Validate required evidence before response.",
      matchedAction: expectedAction,
      coverageComplete,
    };
  }

  const sequenceStatus = getSequenceStatus({
    actionId: cleanActionId,
    preferredActionOrder,
    actionHistory,
  });

  if (sequenceStatus.status === "premature") {
    return {
      classification: "correct_with_warning",
      accepted: true,
      reasonCode: "action_out_of_sequence",
      message:
        stage.mentor?.wrong_order ||
        expectedAction.wrong_order_feedback ||
        `This action is early. Expected next action: ${sequenceStatus.expectedNextActionId}.`,
      matchedAction: expectedAction,
      sequenceStatus,
      coverageComplete,
    };
  }

  return {
    classification: "correct",
    accepted: true,
    reasonCode: "correct_action",
    message:
      expectedAction.feedback ||
      expectedAction.success_feedback ||
      stage.mentor?.correct_sequence ||
      "Correct action for the current stage.",
    matchedAction: expectedAction,
    sequenceStatus,
    coverageComplete,
    actionKind: getActionKind(expectedAction),
    isInvestigationAction: isInvestigationAction(expectedAction),
    isResponseAction: isResponseAction(expectedAction),
  };
}

function buildEvaluationResult(input = {}) {
  const result = classifyAction(input);

  return {
    ...result,
    evaluatedAt: new Date().toISOString(),
  };
}

module.exports = {
  classifyAction,
  buildEvaluationResult,

  getExpectedActions,
  getWrongActions,
  getPreferredActionOrder,
  getRequiredTargets,
  getRequiredDimensions,
  getSequenceStatus,
};