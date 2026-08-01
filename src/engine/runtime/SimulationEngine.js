import { nowStr } from "./runtimeState";

/**
 * Builds deterministic runtime effects for a scenario consequence.
 *
 * This function does not directly mutate React state.
 * It returns a description of what should happen, and App.js applies it.
 *
 * This keeps simulation logic inside the runtime engine while preserving
 * frontend compatibility during the refactor.
 */
export function buildConsequenceEffects({
  consequence,
  selectedNodeId,
  timestamp = nowStr(),
}) {
  if (!consequence || !selectedNodeId) {
    return null;
  }

  let nodeRuntimePatch = null;

  if (consequence.node_effect) {
    nodeRuntimePatch = {
      status:
        consequence.node_effect === "stable"
          ? "normal"
          : consequence.node_effect,
      activity: consequence.log_message || null,
      interpretation:
        consequence.node_effect === "stable"
          ? "Control posture has stabilized after defensive action."
          : null,
    };
  }

  return {
    timestamp,
    mentorFeedback: consequence.mentor_feedback || null,
    actionLogMessage: consequence.log_message || null,
    nodeRuntimePatch,
  };
}