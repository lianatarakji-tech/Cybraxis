function normalizeFrontendEvaluation(frontendEvaluation = {}) {
  const frontendOutcome = frontendEvaluation.outcome || "unknown";

  const frontendAccepted =
    frontendOutcome === "success" &&
    !frontendEvaluation.isWrongAction;

  const frontendWrongAction =
    Boolean(frontendEvaluation.isWrongAction) ||
    frontendOutcome === "failure";

  return {
    actionId: frontendEvaluation.actionId || null,
    scenarioAction: frontendEvaluation.scenarioAction || null,
    outcome: frontendOutcome,
    accepted: frontendAccepted,
    wrongAction: frontendWrongAction,
    isExpectedAction: Boolean(frontendEvaluation.isExpectedAction),
    isNewCorrectAction: Boolean(frontendEvaluation.isNewCorrectAction),
  };
}

function normalizeBackendEvaluation({
  backendResult = {},
  backendAdapter = {},
} = {}) {
  const actionEvaluation = backendResult?.actionEvaluation || {};

  const backendClassification =
    actionEvaluation.classification ||
    backendAdapter.classification ||
    "unknown";

  const backendOutcome =
    backendAdapter.outcome ||
    (
      backendClassification === "correct"
        ? "success"
        : backendClassification === "correct_with_warning"
          ? "success_with_warning"
          : backendClassification === "premature"
            ? "premature"
            : ["wrong", "wrong_target", "irrelevant", "repeated"].includes(
                backendClassification
              )
              ? "failure"
              : "unknown"
    );

  const backendAccepted =
    Boolean(actionEvaluation.accepted) ||
    backendOutcome === "success" ||
    backendOutcome === "success_with_warning";

  const backendWrongAction =
    Boolean(backendAdapter.isWrongAction) ||
    ["wrong", "wrong_target", "irrelevant", "premature"].includes(
      backendClassification
    );

  return {
    actionId: backendAdapter.actionId || backendResult?.actionId || null,
    scenarioAction: backendAdapter.scenarioAction || null,
    classification: backendClassification,
    reasonCode:
      actionEvaluation.reasonCode ||
      backendAdapter.reasonCode ||
      null,
    outcome: backendOutcome,
    accepted: backendAccepted,
    wrongAction: backendWrongAction,
    sequenceWarning: Boolean(backendAdapter.sequenceWarning),
    coverageBlocked: Boolean(backendAdapter.coverageBlocked),
    guidanceTrigger:
      backendResult?.guidance?.trigger ||
      backendAdapter.guidanceTrigger ||
      null,
    guidanceSeverity:
      backendResult?.guidance?.severity ||
      backendAdapter.guidanceSeverity ||
      null,
  };
}

function isRepeatedAdvisoryOnly({ frontend, backend }) {
  return (
    backend.classification === "repeated" &&
    backend.reasonCode === "repeated_action" &&
    frontend.accepted === true &&
    frontend.wrongAction === false
  );
}

export function compareActionEvaluationParity({
  actionId,
  stageId,
  selectedNodeId = null,
  frontendEvaluation = {},
  backendResult = {},
  backendAdapter = {},
} = {}) {
  const frontend = normalizeFrontendEvaluation(frontendEvaluation);
  const backend = normalizeBackendEvaluation({
    backendResult,
    backendAdapter,
  });

  const scenarioActionMatches =
    frontend.scenarioAction === backend.scenarioAction;

  const acceptedMatches =
    frontend.accepted === backend.accepted;

  const wrongActionMatches =
    frontend.wrongAction === backend.wrongAction;

  const backendAddsWarning =
    frontend.accepted &&
    backend.accepted &&
    backend.sequenceWarning;

  const backendBlocksForCoverage =
    frontend.accepted &&
    !backend.accepted &&
    backend.coverageBlocked;

  const repeatedAdvisoryOnly = isRepeatedAdvisoryOnly({
    frontend,
    backend,
  });

  const strictMatches =
    scenarioActionMatches &&
    acceptedMatches &&
    wrongActionMatches;

  const matches = strictMatches || repeatedAdvisoryOnly;

  return {
    source: "frontend_backend_action_evaluation_parity",
    actionId,
    stageId,
    selectedNodeId,

    matches,
    strictMatches,
    repeatedAdvisoryOnly,

    scenarioActionMatches,
    acceptedMatches,
    wrongActionMatches,

    backendAddsWarning,
    backendBlocksForCoverage,

    frontend,
    backend,

    checkedAt: new Date().toISOString(),
  };
}