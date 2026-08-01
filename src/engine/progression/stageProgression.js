/**
 * Evaluates whether the current stage should be considered passed.
 *
 * This function is deterministic and UI-independent.
 * It does not mutate React state.
 */
export function evaluateStageCompletion({
  isNewCorrectAction,
  completedStageActionsCount,
  currentStageScore,
  correctActionScore,
  maxScore,
  passScore,
  minimumActionsToPass,
  preferredActionOrder = [],
  projectedActionHistory = [],
}) {
  const projectedCompletedActionsCount = isNewCorrectAction
    ? completedStageActionsCount + 1
    : completedStageActionsCount;

  const projectedStageScore = isNewCorrectAction
    ? Math.min(currentStageScore + correctActionScore, maxScore)
    : currentStageScore;

  const stagePassed =
    projectedStageScore >= passScore &&
    projectedCompletedActionsCount >= minimumActionsToPass;

  let orderStatus = null;

  if (stagePassed && preferredActionOrder.length > 0) {
    const isOrderCorrect = preferredActionOrder.every(
      (action, index) => projectedActionHistory[index] === action
    );

    orderStatus = isOrderCorrect ? "correct" : "wrong";
  }

  return {
    projectedCompletedActionsCount,
    projectedStageScore,
    stagePassed,
    orderStatus,
  };
}