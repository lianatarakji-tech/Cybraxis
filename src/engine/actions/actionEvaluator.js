/**
 * Maps UI action IDs to scenario action labels.
 *
 * Kept here so App.js does not own simulation action semantics.
 */
export const DEFAULT_ACTION_ID_MAP = {
  "inv-ip": "investigate IP",
  "inv-user": "investigate user",
  isolate: "isolate machine",
  "block-ip": "block IP",
  ignore: "ignore",
};

/**
 * Evaluates how an analyst action relates to the current scenario stage.
 *
 * This function is deterministic and UI-independent.
 * It does not mutate React state.
 */
export function evaluateAction({
  actionId,
  actionIdToScenarioAction = DEFAULT_ACTION_ID_MAP,
  expectedActions = [],
  wrongActions = [],
  completedStageActions = new Set(),
}) {
  const scenarioAction = actionIdToScenarioAction[actionId] || null;

  const isExpectedAction = scenarioAction
    ? expectedActions.includes(scenarioAction)
    : false;

  const isWrongAction = scenarioAction
    ? wrongActions.includes(scenarioAction)
    : false;

  const isNewCorrectAction =
    isExpectedAction && !completedStageActions.has(scenarioAction);

  const outcome = isExpectedAction ? "success" : "failure";

  return {
    actionId,
    scenarioAction,
    isExpectedAction,
    isWrongAction,
    isNewCorrectAction,
    outcome,
  };
}