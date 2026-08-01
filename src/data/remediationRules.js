export const REMEDIATION_THRESHOLD = 65;

const MODULE_LIBRARY = {
  foundation_review: {
    id: 'foundation_review',
    title: 'Foundational SOC Reasoning Review',
    focus: 'Review alert meaning, log evidence, affected node role, and attack-stage context before choosing actions.',
    practicePrompt: 'For each stage, identify the suspicious source, target node, related log, and why the activity is abnormal.',
  },
  investigation_before_containment: {
    id: 'investigation_before_containment',
    title: 'Investigation Before Containment',
    focus: 'Strengthen the habit of validating evidence before blocking or isolating assets.',
    practicePrompt: 'Use identity, connectivity, controls, activity, and interpretation before selecting containment.',
  },
  alert_log_correlation: {
    id: 'alert_log_correlation',
    title: 'Alert and Log Correlation',
    focus: 'Connect each alert to its supporting log and related node instead of reacting to severity alone.',
    practicePrompt: 'Select the alert, open its related log, inspect the node, then decide the next action.',
  },
  lateral_movement_review: {
    id: 'lateral_movement_review',
    title: 'Lateral Movement and Trust-Path Review',
    focus: 'Recognize when internal traffic is suspicious because a trusted path is being abused.',
    practicePrompt: 'Trace the source node, target node, expected peers, and trust boundary before containment.',
  },
  exfiltration_review: {
    id: 'exfiltration_review',
    title: 'Data Exfiltration Response Review',
    focus: 'Connect sensitive data access, outbound transfer, and external destination before blocking the channel.',
    practicePrompt: 'Confirm the critical asset, data movement evidence, and external path, then apply the correct response.',
  },
  response_discipline: {
    id: 'response_discipline',
    title: 'Response Discipline Review',
    focus: 'Reduce unnecessary ignores, premature blocking, and containment actions taken without evidence.',
    practicePrompt: 'Explain why each wrong action is risky and what evidence should have been checked first.',
  },
  reinforcement_review: {
    id: 'reinforcement_review',
    title: 'Scenario Reinforcement Review',
    focus: 'Reinforce correct decisions and replay the full kill-chain flow for confidence.',
    practicePrompt: 'Replay the scenario and describe the attacker path from reconnaissance to exfiltration.',
  },
};

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function percentage(score, max) {
  if (!max || max <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((score / max) * 100)));
}

function stageKey(stage, index) {
  return stage?.id || stage?.stage_type || `stage-${index + 1}`;
}

function stageName(stage, index) {
  return stage?.name || stage?.stage_type || `Stage ${index + 1}`;
}

function uniqueModules(keys) {
  return [...new Set(keys)]
    .map(key => MODULE_LIBRARY[key])
    .filter(Boolean);
}

function stageSpecificModule(stageId) {
  const id = String(stageId || '').toLowerCase();
  if (id.includes('lateral')) return 'lateral_movement_review';
  if (id.includes('exfil')) return 'exfiltration_review';
  return 'alert_log_correlation';
}

export function buildRemediationPlan({ scenario, totalScore = 0, stagePerformance = {} } = {}) {
  const stages = Array.isArray(scenario?.stages) ? scenario.stages : [];
  const maxPossibleScore = stages.reduce(
    (sum, stage) => sum + toNumber(stage?.scoring?.max_score, 10),
    0
  );

  const scorePercent = percentage(totalScore, maxPossibleScore || 1);
  const requiresRemediation = scorePercent < REMEDIATION_THRESHOLD;

  const stageRows = stages.map((stage, index) => {
    const id = stageKey(stage, index);
    const performance = stagePerformance[id] || {};
    const maxScore = toNumber(performance.maxScore ?? stage?.scoring?.max_score, 10);
    const stageScore = toNumber(performance.stageScore, 0);
    const actions = Array.isArray(performance.actions) ? performance.actions : [];
    const completedActions = Array.isArray(performance.completedActions) ? performance.completedActions : [];
    const expectedActions = Array.isArray(stage?.expected_actions) ? stage.expected_actions : [];
    const wrongActions = Array.isArray(stage?.wrong_actions) ? stage.wrong_actions : [];
    const preferredOrder = Array.isArray(stage?.preferred_action_order) ? stage.preferred_action_order : [];

    const wrongActionCount = actions.filter(action => wrongActions.includes(action)).length;
    const missedActions = expectedActions.filter(action => !completedActions.includes(action));
    const sequenceCorrect = preferredOrder.length === 0 || preferredOrder.every(
      (action, actionIndex) => actions[actionIndex] === action
    );

    const weaknesses = [];
    if (percentage(stageScore, maxScore) < REMEDIATION_THRESHOLD) weaknesses.push('low_stage_score');
    if (wrongActionCount > 0) weaknesses.push('wrong_action');
    if (!sequenceCorrect) weaknesses.push('sequence');
    if (missedActions.length > 0) weaknesses.push('missing_expected_action');

    return {
      stageId: id,
      stageIndex: index,
      stageName: stageName(stage, index),
      stageScore,
      maxScore,
      scorePercent: percentage(stageScore, maxScore),
      wrongActionCount,
      missedActions,
      sequenceCorrect,
      weaknesses,
      actions,
    };
  });

  const weakStages = stageRows.filter(row => row.weaknesses.length > 0);
  const moduleKeys = [];

  if (requiresRemediation) moduleKeys.push('foundation_review');

  weakStages.forEach(row => {
    moduleKeys.push(stageSpecificModule(row.stageId));
    if (row.weaknesses.includes('sequence')) moduleKeys.push('investigation_before_containment');
    if (row.weaknesses.includes('wrong_action')) moduleKeys.push('response_discipline');
  });

  if (moduleKeys.length === 0) moduleKeys.push('reinforcement_review');

  const suggestedStage = weakStages[0] || stageRows[0] || null;

  return {
    threshold: REMEDIATION_THRESHOLD,
    totalScore,
    maxPossibleScore,
    scorePercent,
    requiresRemediation,
    statusLabel: requiresRemediation ? 'REMEDIATION REQUIRED' : 'PASSED',
    summary: requiresRemediation
      ? `Final score is below ${REMEDIATION_THRESHOLD}%. A deterministic training-remediation review is required before progression.`
      : 'Final score meets the progression threshold. Remediation is optional reinforcement only.',
    stageRows,
    weakStages,
    modules: uniqueModules(moduleKeys),
    suggestedStageId: suggestedStage?.stageId || null,
    suggestedStageName: suggestedStage?.stageName || null,
  };
}
