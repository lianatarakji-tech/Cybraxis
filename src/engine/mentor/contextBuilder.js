export function buildMentorContext({
  stage = null,
  stageId = null,
  stageIndex = 0,
  selectedNodeId = null,
  selectedAlert = null,
  investigationCoverage = null,
  investigationTargetCoverage = null,
  stageScoreSummary = null,
  guidanceProfile = null,
  stageTimerState = "normal",
  stageLocked = false,
  stageLockReason = null,
  wrongActionCount = 0,
  hintsRequested = 0,
  escalation = null,
}) {
  const requiredInvestigation = stage?.required_investigation || {};
  const mentorConfig = stage?.mentor || {};

  return {
    stage: {
      id: stageId || stage?.id || null,
      index: stageIndex,
      name: stage?.name || null,
      type: stage?.stage_type || null,
      difficulty: stage?.difficulty || "easy",
      learningObjective: stage?.learning_objective || null,
    },

    requiredInvestigation: {
      targetScope: requiredInvestigation.target_scope || null,
      targetIds: requiredInvestigation.target_ids || [],
      dimensions: requiredInvestigation.dimensions || [],
      minimumTargetCoverage:
        requiredInvestigation.minimum_target_coverage || null,
      requiredBeforeResponse:
        requiredInvestigation.required_before_response !== false,
    },

    selection: {
      selectedNodeId,
      selectedAlertId: selectedAlert?.id || null,
      selectedAlertText: selectedAlert?.event || selectedAlert?.message || null,
      selectedAlertSeverity: selectedAlert?.severity || null,
      selectedAlertRelatedLog: selectedAlert?.relatedLog || null,
    },

    investigation: {
      dimensionCoverage: investigationCoverage || {},
      targetCoverage: investigationTargetCoverage || {},
      coverageComplete:
        investigationTargetCoverage?.allRequiredCoverageComplete || false,
      investigatedNodeCount:
        investigationTargetCoverage?.investigatedNodeCount || 0,
      requiredNodeCount:
        investigationTargetCoverage?.suspiciousNodeCount || 0,
    },

    scoring: {
      summary: stageScoreSummary,
      totalStageScore: stageScoreSummary?.totalStageScore ?? null,
      passed: stageScoreSummary?.passed ?? null,
      timedOut: stageScoreSummary?.timedOut ?? null,
      coverageComplete:
        stageScoreSummary?.evaluation?.coverageComplete ?? null,
      sequenceComplete:
        stageScoreSummary?.evaluation?.sequenceComplete ?? null,
    },

    guidance: {
      expectedGuidanceLevel:
        guidanceProfile?.expectedGuidanceLevel || "moderate",
      currentGuidanceLevel:
        guidanceProfile?.currentGuidanceLevel || "moderate",
      guidanceShift: guidanceProfile?.guidanceShift || 0,
      reasonCodes: guidanceProfile?.reasonCodes || [],
      aiInstruction:
        guidanceProfile?.aiInstruction ||
        "Use moderate guidance appropriate for the learner state.",
    },

    timer: {
      state: stageTimerState,
      locked: stageLocked,
      lockReason: stageLockReason,
    },

    learnerState: {
      wrongActionCount,
      hintsRequested,
    },

    escalation: escalation || null,

    mentorConfig,
  };
}

export function buildAIMentorPayload({
  context,
  trigger,
  recentEvents = [],
}) {
  return {
    trigger,
    stage: context.stage,
    learningObjective: context.stage.learningObjective,
    requiredInvestigation: context.requiredInvestigation,
    currentSelection: context.selection,
    investigationState: context.investigation,
    scoringState: context.scoring,
    guidanceControl: context.guidance,
    timerState: context.timer,
    learnerState: context.learnerState,
    escalationState: context.escalation,
    recentEvents,
    instruction: context.guidance.aiInstruction,
  };
}