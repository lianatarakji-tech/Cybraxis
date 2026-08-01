export const MENTOR_TRIGGERS = {
  STAGE_START: "STAGE_START",
  ESCALATED_STAGE: "ESCALATED_STAGE",
  ALERT_SELECTED: "ALERT_SELECTED",
  HINT_REQUESTED: "HINT_REQUESTED",
  COVERAGE_INCOMPLETE: "COVERAGE_INCOMPLETE",
  WRONG_ORDER: "WRONG_ORDER",
  ORDER_CORRECT: "ORDER_CORRECT",
  WRONG_ACTION: "WRONG_ACTION",
  TIME_WARNING: "TIME_WARNING",
  TIMEOUT: "TIMEOUT",
  STAGE_SECURED: "STAGE_SECURED",
  STAGE_LOCKED: "STAGE_LOCKED",
  SCENARIO_COMPLETE: "SCENARIO_COMPLETE",
};

function getCoverageRatio(context) {
  const required = context?.investigation?.requiredNodeCount || 0;
  const investigated = context?.investigation?.investigatedNodeCount || 0;

  if (required <= 0) return 1;

  return investigated / required;
}

function formatDimensionList(dimensions = []) {
  if (!dimensions.length) return "the required evidence areas";

  return dimensions
    .map(dimension => {
      if (dimension === "identity") return "identity";
      if (dimension === "connectivity") return "connectivity";
      if (dimension === "controls") return "security controls";
      if (dimension === "activity") return "activity evidence";
      if (dimension === "interpretation") return "interpretation";
      return dimension;
    })
    .join(", ");
}

function buildDefaultMessage(trigger, context) {
  const guidanceLevel = context?.guidance?.currentGuidanceLevel || "moderate";
  const requiredDimensions =
    context?.requiredInvestigation?.dimensions || [];

  const dimensionText = formatDimensionList(requiredDimensions);
  const coverageRatio = getCoverageRatio(context);
  const investigatedCount = context?.investigation?.investigatedNodeCount || 0;
  const requiredCount = context?.investigation?.requiredNodeCount || 0;

  switch (trigger) {
    case MENTOR_TRIGGERS.STAGE_START:
      return (
        context?.mentorConfig?.stage_hint ||
        context?.stage?.learningObjective ||
        "Review the active evidence and complete the required investigation before responding."
      );

    case MENTOR_TRIGGERS.ESCALATED_STAGE:
      return (
        context?.escalation?.mentor_context ||
        context?.mentorConfig?.stage_hint ||
        "This stage begins under elevated risk because earlier attacker activity was not fully contained."
      );

    case MENTOR_TRIGGERS.ALERT_SELECTED:
      return (
        context?.mentorConfig?.stage_hint ||
        "Use the selected alert to decide which node, evidence, and relationship should be investigated first."
      );

    case MENTOR_TRIGGERS.HINT_REQUESTED:
      if (guidanceLevel === "subtle") {
        return "Think about what evidence category is least supported before choosing a response action.";
      }

      if (guidanceLevel === "moderate") {
        return `Focus on ${dimensionText} before containment.`;
      }

      if (guidanceLevel === "direct") {
        return `Your investigation is still missing required coverage. Check the stage evidence model and complete ${dimensionText} on the relevant target.`;
      }

      return `You need to complete the required investigation before responding. Current target coverage is ${investigatedCount}/${requiredCount}.`;

    case MENTOR_TRIGGERS.COVERAGE_INCOMPLETE:
      return (
        context?.mentorConfig?.coverage_incomplete ||
        `Coverage is incomplete. Current target coverage is ${investigatedCount}/${requiredCount}. Complete ${dimensionText} before response.`
      );

    case MENTOR_TRIGGERS.WRONG_ORDER:
      return (
        context?.mentorConfig?.wrong_order ||
        "The action may be technically useful, but the sequence is weak. Investigate and interpret evidence before containment."
      );

    case MENTOR_TRIGGERS.ORDER_CORRECT:
      return (
        context?.mentorConfig?.correct_sequence ||
        "Good sequence. You investigated before responding."
      );

    case MENTOR_TRIGGERS.WRONG_ACTION:
      if (guidanceLevel === "intervention") {
        return "That response is harmful in this stage. Pause and review the stage objective, required targets, and evidence coverage before acting again.";
      }

      return "That action reduced your score. Reassess the evidence before proceeding.";

    case MENTOR_TRIGGERS.TIME_WARNING:
      return (
        context?.mentorConfig?.timeout_warning ||
        "Time pressure is increasing. Prioritize the required investigation before the attacker escalates."
      );

    case MENTOR_TRIGGERS.TIMEOUT:
      return (
        context?.mentorConfig?.timeout_feedback ||
        "Time expired. The attacker advanced the campaign before the stage was contained."
      );

    case MENTOR_TRIGGERS.STAGE_SECURED:
      return (
        context?.mentorConfig?.correct_sequence ||
        "Stage secured. Review your result summary before continuing."
      );

    case MENTOR_TRIGGERS.STAGE_LOCKED:
      if (context?.timer?.lockReason === "timeout") {
        return "This stage has already escalated. Actions are locked until you continue to the next phase.";
      }

      return "This stage has already been secured. Review the result summary, then continue.";

    case MENTOR_TRIGGERS.SCENARIO_COMPLETE:
      return "Scenario complete. Review the final results and compare your investigation coverage, timing, and response quality.";

    default:
      if (coverageRatio < 1) {
        return `Continue building evidence coverage. Current target coverage is ${investigatedCount}/${requiredCount}.`;
      }

      return "Continue correlating the evidence before taking irreversible response actions.";
  }
}

export function buildMentorMessage({
  trigger,
  context,
  fallbackText = null,
}) {
  const text =
    fallbackText ||
    buildDefaultMessage(trigger, context);

  return {
    text,
    trigger,
    guidanceLevel: context?.guidance?.currentGuidanceLevel || "moderate",
    expectedGuidanceLevel:
      context?.guidance?.expectedGuidanceLevel || "moderate",
    guidanceShift: context?.guidance?.guidanceShift || 0,
    reasonCodes: context?.guidance?.reasonCodes || [],
    aiInstruction: context?.guidance?.aiInstruction || null,
    stageId: context?.stage?.id || null,
  };
}