import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo
} from "react";
import AuthScreen from "./components/Auth/AuthScreen";

import MainMenu from "./components/MainMenu/MainMenu";
import ScenarioBriefing from "./components/ScenarioBriefing/ScenarioBriefing";
import "./App.css";

import CampaignProgressBar from "./components/CampaignProgressBar/CampaignProgressBar";
import AlertsPanel from "./components/AlertsPanel/AlertsPanel";
import LogsPanel from "./components/LogsPanel/LogsPanel";
import ActionsPanel from "./components/ActionsPanel/ActionsPanel";
import SocAdvisorPanel from "./components/SocAdvisorPanel/SocAdvisorPanel";
import NetworkMap from "./components/NetworkMap/NetworkMap";
import StageResultOverlay from "./components/StageResultOverlay/StageResultOverlay";
import FinalScenarioReport from './components/FinalScenarioReport/FinalScenarioReport';
import PlayableRemedyScenario from "./components/PlayableRemedyScenario/PlayableRemedyScenario";
import RemediationTraining from "./components/RemediationTraining/RemediationTraining";

import { evaluateAction as evaluateActionBackend } from "./backend/api/actionApi";
import {
  buildAdaptiveLearnerFactPack,
  requestAdaptiveIntervention
} from "./backend/api/adaptiveAiApi";

import { compareActionEvaluationParity } from "./backend/parity/actionEvaluationParity";

import { evaluateStageCompletionBackend } from "./backend/api/stageCompletionApi";

import { evaluateConsequenceBackend } from "./backend/api/consequenceApi";

import { buildBackendMentorHint } from "./backend/adapters/backendGuidanceAdapter";

import { evaluateRuntimeStateBackend } from "./backend/api/runtimeStateApi";

import { evaluateTimeoutBackend } from "./backend/api/timeoutApi";

import { buildFrontendRuntimeStateDecision } from "./backend/parity/runtimeStateFrontendDecision";

import { applyBackendRuntimeStateDecisionToFrontend } from "./backend/runtime/applyBackendRuntimeStateDecision";

import {
  buildBackendAdaptiveWarning,
  buildBackendLogPacing
} from "./backend/adapters/backendAdaptiveRuntimeAdapter";
import {
  createSession,
  getSession,
  saveEvent,
  saveStageResult,
  finishSession,
  generateFinalReport,
} from "./backend/api/sessionApi";

import {
  createStageResultRecord
} from "./backend/models/stageResultModel";

import {
  createFinalScenarioReport
} from "./backend/api/reportApi";

import {
  createInvestigationEventRecord,
  createResponseActionEventRecord
} from "./backend/models/eventModel";


import {
  nowStr,
  normalizeSeverity,
  buildInitialNodeRuntime
} from "./engine/runtime/runtimeState";

import {
  TIMER_STATES,
  STAGE_LOCK_REASONS,
  getStageTimeLimit,
  getWarningSecond,
  shouldLockStageOnTimeout,
  shouldLockStageOnSuccess,
  isTimeoutTerminal,
  getTimeoutWarningText,
  getTimeoutFeedbackText,
  getStageLockedMessage
} from "./engine/runtime/stageTimer";

import {
  buildTimeoutLog,
  getEscalationForNextStage,
  applyEscalationToRuntime,
  mergeEscalationLogs,
  getEscalatedStageHint,
  getDegradedCompletionText
} from "./engine/runtime/stageEscalation";

import {
  calculateStageScoreSummary
} from "./engine/scoring/ScoringEngine";

import {
  calculateMentorGuidanceProfile
} from "./engine/mentor/guidanceCalculator";

import {
  buildMentorContext
} from "./engine/mentor/contextBuilder";

import {
  MENTOR_TRIGGERS,
  buildMentorMessage
} from "./engine/mentor/MentorEngine";

import {
  buildConsequenceEffects
} from "./engine/runtime/SimulationEngine";

import {
  evaluateStageCompletion
} from "./engine/progression/stageProgression";

import {
  DEFAULT_ACTION_ID_MAP,
  evaluateAction
} from "./engine/actions/actionEvaluator";

import {
  createInvestigationEvent,
  addInvestigationEvent,
  getInvestigationCoverage,
  getRequiredInvestigationDimensions,
  getCoverageTargetIds,
  getStageTargetCoverage
} from "./engine/evidence/investigationTracker";

import {
  DEFAULT_SCENARIO_ID,
  SCENARIO_BUNDLES,
  getScenarioBundle,
} from "./data/scenarios/scenarioRegistry";

import "./index.css";

// CYBRAXIS_SCENARIO_SELECTION
const requestedScenarioId =
  new URLSearchParams(window.location.search).get("scenario") ||
  DEFAULT_SCENARIO_ID;

const activeScenarioBundle = getScenarioBundle(requestedScenarioId);

const scenario = activeScenarioBundle.scenarioData;
const SCENARIO = activeScenarioBundle.mapScenario;
const MENTOR_IDLE_HINTS = activeScenarioBundle.mentorIdleHints;
const STAGE_ATTACK_EDGES = activeScenarioBundle.stageAttackEdges;
const STAGE_NODE_CONTEXT = activeScenarioBundle.stageNodeContext;
const STAGE_SUSPICIOUS_NODES = activeScenarioBundle.stageSuspiciousNodes;
const KILL_CHAIN_STAGES = activeScenarioBundle.killChainStages;



  // CYBRAXIS_INITIAL_STAGE_FROM_QUERY
function readInitialStageIndexFromQuery() {
  if (typeof window === "undefined") return 0;

  const rawStage =
    new URLSearchParams(window.location.search).get("stage") ||
    new URLSearchParams(window.location.search).get("stageIdx");

  const parsed = Number.parseInt(rawStage || "0", 10);

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}
const SHOW_BACKEND_SHADOW_PANEL = false;
const SHOW_BACKEND_PARITY_LOGS = false;
const logBackendParity = (...args) => {
  if (SHOW_BACKEND_PARITY_LOGS) {
    console.log(...args);
  }
};

let _hintId = 0;

function buildRequestFallbackHintText(text, trigger, hintId) {
  const originalText = String(text || "").trim();
  const normalizedTrigger = String(trigger || "").toUpperCase();

  const isRequestFallback =
    normalizedTrigger.includes("REQUEST") ||
    normalizedTrigger.includes("FALLBACK");

  if (!isRequestFallback) {
    return originalText;
  }

  const fallbackPool = [
    originalText,
    "Start by confirming the affected asset, then connect the alert to the relevant logs.",
    "Use the investigation cycle before acting: identity, connectivity, controls, activity/evidence, then interpretation.",
    "Check whether the workstation activity and network path support compromise before containment.",
    "Look for the external endpoint, affected host, and repeated communication pattern before choosing a response.",
    "Do not isolate only because an alert is severe; confirm the supporting evidence first."
  ]
    .map(value => String(value || "").trim())
    .filter(Boolean);

  const uniquePool = Array.from(new Set(fallbackPool));

  if (uniquePool.length === 0) {
    return originalText || "Review the available alert, logs, node state, and response options before acting.";
  }

  return uniquePool[Math.max(0, (hintId - 1) % uniquePool.length)];
}

function cybraxisIncrementMentorHintUsage(trigger = "MENTOR", context = {}) {
  if (typeof window === "undefined") return;

  try {
    const normalizedTrigger = String(trigger || "MENTOR").trim().toUpperCase();

    const countable =
      normalizedTrigger === "REQUEST" ||
      normalizedTrigger === "REQUEST_FALLBACK" ||
      normalizedTrigger.startsWith("AI_");

    if (!countable) return;

    const activeUserId =
      String(context.userId || "").trim() ||
      window.localStorage.getItem("cybraxisCurrentPlayerId") ||
      window.localStorage.getItem("cybraxisSelectedPlayerId") ||
      window.localStorage.getItem("cybraxisActivePlayerId") ||
      "demo-user";

    const scenarioId =
      String(context.scenarioId || "").trim() ||
      window.localStorage.getItem("cybraxisLastScenarioId") ||
      window.localStorage.getItem("cybraxisCompletedScenarioId") ||
      "active-scenario";

    const scopedKey = "cybraxisMentorHintUsageTotal:" + activeUserId + ":" + scenarioId;
    const scenarioOnlyKey = "cybraxisMentorHintUsageTotal:" + scenarioId;

    const current = Number(window.localStorage.getItem(scopedKey) || "0");
    const next = Number.isFinite(current) ? current + 1 : 1;

    window.localStorage.setItem(scopedKey, String(next));
    window.localStorage.setItem(scenarioOnlyKey, String(next));
    window.localStorage.setItem("cybraxisMentorHintUsageLastScenarioId", scenarioId);
    window.localStorage.setItem("cybraxisMentorHintUsageLastUserId", activeUserId);

    if (activeUserId) {
      const snapshotKey = "cybraxisUserProgress:" + activeUserId;
      const snapshot = JSON.parse(window.localStorage.getItem(snapshotKey) || "{}") || {};
      const byScenario = snapshot.cybraxisMentorHintUsageTotalByScenario || {};

      byScenario[scenarioId] = next;
      snapshot.cybraxisMentorHintUsageTotalByScenario = byScenario;
      snapshot.cybraxisMentorHintUsageLastScenarioId = scenarioId;
      snapshot.cybraxisMentorHintUsageLastValue = String(next);

      window.localStorage.setItem(snapshotKey, JSON.stringify(snapshot));
    }
  } catch {
    // localStorage is optional for the prototype runtime.
  }
}
function cybraxisIsRealMentorGuidance(text = "", trigger = "") {
  const raw = String(text || "").trim();
  const value = raw.toLowerCase();
  const normalizedTrigger = String(trigger || "").trim().toUpperCase();

  if (!raw) return false;

  if (
    value.includes("ai request completed") ||
    value.includes("adaptive decision recorded") ||
    value.includes("providerstatus") ||
    value.includes("backend parity") ||
    value.includes("debug")
  ) {
    return false;
  }

  if (
    /^(identity|connectivity|controls|activity|interpretation)\s+investigation\s+recorded\.?/i.test(raw) ||
    /investigation\s+coverage\s+is\s+incomplete/i.test(raw) ||
    /response\s+actions\s+may\s+reduce\s+score/i.test(raw) ||
    /this\s+action\s+is\s+not\s+part\s+of\s+the\s+expected\s+response\s+set/i.test(raw) ||
    /selected\s+node\s+or\s+target\s+does\s+not\s+match/i.test(raw)
  ) {
    return false;
  }

  if (
    /^(ip|domain|host|node|traffic|connection|endpoint|asset|alert|account|service)\s+(blocked|isolated|quarantined|contained|allowed|reviewed|selected|confirmed)\b/i.test(raw) ||
    /communication\s+path\s+has\s+been\s+severed/i.test(raw) ||
    /has\s+been\s+(blocked|isolated|quarantined|contained|severed)/i.test(raw)
  ) {
    return false;
  }

  /* CYBRAXIS_SCORE_WARNING_NOT_MENTOR_GUIDANCE */
  if (
    normalizedTrigger.startsWith("ADAPTIVE_WARNING") ||
    /that\s+action\s+reduces\s+your\s+stage\s+score/i.test(raw) ||
    /reduces\s+your\s+stage\s+score/i.test(raw) ||
    /reassess\s+the\s+evidence\s+before\s+proceeding/i.test(raw) ||
    /stage\s+score.*reassess/i.test(raw)
  ) {
    return false;
  }
  if (
    normalizedTrigger === "REQUEST" ||
    normalizedTrigger === "REQUEST_FALLBACK" ||
    normalizedTrigger.startsWith("AI_")
  ) {
    return true;
  }

  return (
    /\b(why|because|before|after|consider|focus|review|confirm|validate|compare|evidence|investigate|reasoning|path|logs|controls|outbound|exfiltration|containment|premature|coverage|what do these events reveal)\b/i.test(raw) &&
    raw.length >= 45
  );
}
function makeHint(text, trigger) {
  const id = ++_hintId;
  return {
    id,
    ts: nowStr(),
    text: buildRequestFallbackHintText(text, trigger, id),
    trigger,
  };
}


function cybraxisNormalizeMentorFocus(value = "") {
  const normalized = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9/ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (normalized.includes("control")) return "controls";
  if (normalized.includes("connect")) return "connectivity";
  if (normalized.includes("identity") || normalized.includes("asset")) return "identity";
  if (normalized.includes("interpret")) return "interpretation";
  return "activity/evidence";
}

function cybraxisBuildControlledAiMentorHint({ decision = {}, stage = {}, stageId = "" } = {}) {
  const focus = cybraxisNormalizeMentorFocus(decision.nextFocus);
  const stageName = String(stage?.name || stage?.title || stageId || "current stage").trim();

  const stageText = `${stageName} ${stageId}`.toLowerCase();

  let stageSpecific = "";

  if (stageText.includes("exfil")) {
    stageSpecific =
      "For this exfiltration stage, verify the external destination, the proxy upload path, and the uploaded archive before blocking or containment.";
  } else if (stageText.includes("contain") || stageText.includes("c2")) {
    stageSpecific =
      "For this containment stage, validate the external C2 indicator, the DNS or control point, the compromised host, and the staged-data risk before acting.";
  } else if (stageText.includes("lateral")) {
    stageSpecific =
      "For this lateral movement stage, confirm the internal source, destination, and trust path before choosing a response.";
  } else if (stageText.includes("execution")) {
    stageSpecific =
      "For this execution stage, connect the suspicious activity to the affected host and supporting logs before containment.";
  } else if (stageText.includes("access") || stageText.includes("foothold")) {
    stageSpecific =
      "For this access stage, confirm the exposed service, affected node, and supporting evidence before escalation.";
  } else if (stageText.includes("recon")) {
    stageSpecific =
      "For this reconnaissance stage, identify the scanning source, exposed service, and evidence that separates probing from normal traffic.";
  } else {
    stageSpecific =
      "For this stage, connect the alert to the affected node, related logs, and required evidence before choosing a response.";
  }

  const focusGuidance = {
    identity:
      "Focus on identity: confirm exactly which asset, endpoint, account, or external indicator is involved.",
    connectivity:
      "Focus on connectivity: trace the source, destination, service, and path that explain the alert.",
    controls:
      "Focus on controls: verify which policy, service, or enforcement point can safely contain the activity.",
    interpretation:
      "Focus on interpretation: decide what the evidence proves, what is still uncertain, and which response is justified.",
    "activity/evidence":
      "Focus on activity and evidence: match the alert with logs, timing, affected nodes, and observed behavior.",
  }[focus] || "Focus on activity and evidence: match the alert with logs, timing, affected nodes, and observed behavior.";

  return `Mentor guidance: ${stageSpecific} ${focusGuidance}`;
}
/* CYBRAXIS_AI_REPORT_HELPERS_START */
const AI_PATTERN_LABELS = {
  premature_containment: "Premature containment",
  incomplete_evidence: "Incomplete evidence",
  wrong_node_focus: "Wrong node focus",
  weak_interpretation: "Weak interpretation",
  mentor_overreliance: "Mentor overreliance",
  none: "No major misconception detected",
};

const AI_FOCUS_LABELS = {
  identity: "Identity",
  connectivity: "Connectivity",
  controls: "Controls",
  "activity/evidence": "Activity/evidence",
  interpretation: "Interpretation",
};

function aiReadable(value, fallback = "Not available") {
  return String(value || fallback)
    .replace(/_/g, " ")
    .replace(/\b\w/g, char => char.toUpperCase());
}

function aiUniqueList(values = []) {
  return Array.from(
    new Set(
      values
        .filter(Boolean)
        .map(value => String(value).trim())
        .filter(Boolean)
    )
  );
}

function aiMostCommon(records = [], key, fallback = "none") {
  const counts = {};

  records.forEach(record => {
    const value = record?.[key];
    if (!value) return;
    counts[value] = (counts[value] || 0) + 1;
  });

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  return sorted[0]?.[0] || fallback;
}

function createAiInterventionRecord(decision = {}, meta = {}) {
  return {
    id: `ai-intervention-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    trigger: meta.trigger || decision.trigger || "unknown",
    outcome: meta.outcome || "live",

    scenarioId: meta.scenarioId || null,
    stageId: meta.stageId || decision.stageId || null,
    stageName: meta.stageName || decision.stageName || decision.stageId || "Current stage",

    adaptiveDecision: decision.adaptiveDecision || decision.interventionType || "continue_current_stage",
    misconceptionDetected: decision.misconceptionDetected || "none",
    supportLevel: decision.supportLevel || "none",
    interventionType: decision.interventionType || decision.adaptiveDecision || "continue_current_stage",
    nextFocus: decision.nextFocus || "activity/evidence",
    progressionRecommendation: decision.progressionRecommendation || "continue_current_scenario",
    confidence: Number.isFinite(Number(decision.confidence)) ? Number(decision.confidence) : null,

    provider: decision.provider || "unknown",
    providerStatus: decision.providerStatus || "unknown",
    validatedByBackend: Boolean(decision.validatedByBackend),

    learnerFacingMessage: decision.learnerFacingMessage || "",
  };
}


/* CYBRAXIS_FULL_SCENARIO_REPORT_HELPERS_START */
function getCybraxisActiveUserId() {
  if (typeof window === "undefined") return "";

  try {
    return (
      window.localStorage.getItem("cybraxisCurrentPlayerId") ||
      window.localStorage.getItem("cybraxisSelectedPlayerId") ||
      window.localStorage.getItem("cybraxisActivePlayerId") ||
      ""
    );
  } catch {
    return "";
  }
}

function getScenarioStorageId(scenario = {}, requestedScenarioId = "") {
  return String(
    scenario?.scenario_id ||
    scenario?.id ||
    requestedScenarioId ||
    "unknown-scenario"
  );
}

function getScenarioStageList(scenario = {}) {
  return Array.isArray(scenario?.stages) ? scenario.stages : [];
}

function getStageStorageKey(userId, scenarioId) {
  return "cybraxisScenarioStageScores:" + userId + ":" + scenarioId;
}

function safeJsonClone(value) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

function normalizeStageScoreSummaryForStorage(summary = {}, index = 0, scenario = {}) {
  const stages = getScenarioStageList(scenario);
  const stageById = stages.find(stage => stage?.id && stage.id === summary?.stageId);
  const stageByIndex = stages[index] || {};
  const stage = stageById || stageByIndex || {};

  const stageId =
    summary?.stageId ||
    stage?.id ||
    "stage-" + String(index + 1);

  const stageIndex = Number.isFinite(Number(summary?.stageIndex))
    ? Number(summary.stageIndex)
    : Math.max(
        0,
        stages.findIndex(item => item?.id === stageId)
      );

  return {
    ...safeJsonClone(summary),
    stageId,
    stageIndex: stageIndex >= 0 ? stageIndex : index,
    stageName: cybraxisBuildSafeStage(
            typeof summary !== "undefined" ? summary : {},
            {},
            0
          ).name || cybraxisBuildSafeStage(
            typeof summary !== "undefined" ? summary : {},
            {},
            0
          ).title ||
      stage?.id ||
      "Stage " + String(index + 1),
    savedAt: new Date().toISOString(),
  };
}

function readSavedStageScoreSummaries(scenario = {}, requestedScenarioId = "") {
  if (typeof window === "undefined") return [];

  try {
    const userId = getCybraxisActiveUserId();
    const scenarioId = getScenarioStorageId(scenario, requestedScenarioId);

    if (!userId || !scenarioId) return [];

    const raw = window.localStorage.getItem(getStageStorageKey(userId, scenarioId));
    const parsed = JSON.parse(raw || "[]");

    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function persistScenarioStageScoreSummaries(summaries = [], scenario = {}, requestedScenarioId = "") {
  if (typeof window === "undefined") return;
  if (!Array.isArray(summaries) || summaries.length === 0) return;

  try {
    const userId = getCybraxisActiveUserId();
    const scenarioId = getScenarioStorageId(scenario, requestedScenarioId);

    if (!userId || !scenarioId) return;

    const storageKey = getStageStorageKey(userId, scenarioId);
    const existing = readSavedStageScoreSummaries(scenario, requestedScenarioId);
    const byStage = new Map();

    existing.forEach((summary, index) => {
      const normalized = normalizeStageScoreSummaryForStorage(summary, index, scenario);
      byStage.set(normalized.stageId || String(normalized.stageIndex), normalized);
    });

    summaries.forEach((summary, index) => {
      const normalized = normalizeStageScoreSummaryForStorage(summary, index, scenario);
      byStage.set(normalized.stageId || String(normalized.stageIndex), normalized);
    });

    const stages = getScenarioStageList(scenario);
    const ordered = Array.from(byStage.values()).sort((a, b) => {
      const aIndex = stages.findIndex(stage => stage?.id === a.stageId);
      const bIndex = stages.findIndex(stage => stage?.id === b.stageId);

      const safeA = aIndex >= 0 ? aIndex : Number(a.stageIndex ?? 999);
      const safeB = bIndex >= 0 ? bIndex : Number(b.stageIndex ?? 999);

      return safeA - safeB;
    });

    window.localStorage.setItem(storageKey, JSON.stringify(ordered));
  } catch {}
}

function getMergedStageScoreSummariesForReport(currentSummaries = [], scenario = {}, requestedScenarioId = "") {
  const saved = readSavedStageScoreSummaries(scenario, requestedScenarioId);
  const byStage = new Map();

  saved.forEach((summary, index) => {
    const normalized = normalizeStageScoreSummaryForStorage(summary, index, scenario);
    byStage.set(normalized.stageId || String(normalized.stageIndex), normalized);
  });

  (Array.isArray(currentSummaries) ? currentSummaries : []).forEach((summary, index) => {
    const normalized = normalizeStageScoreSummaryForStorage(summary, index, scenario);
    byStage.set(normalized.stageId || String(normalized.stageIndex), normalized);
  });

  const stages = getScenarioStageList(scenario);

  return Array.from(byStage.values()).sort((a, b) => {
    const aIndex = stages.findIndex(stage => stage?.id === a.stageId);
    const bIndex = stages.findIndex(stage => stage?.id === b.stageId);

    const safeA = aIndex >= 0 ? aIndex : Number(a.stageIndex ?? 999);
    const safeB = bIndex >= 0 ? bIndex : Number(b.stageIndex ?? 999);

    return safeA - safeB;
  });
}

function buildStageResultsFromScoreSummaries({
  summaries = [],
  scenario = {},
  backendSession = {},
  requestedScenarioId = "",
  mentorGuidanceProfile = {},
  hintsRequested = 0,
}) {
  const stages = getScenarioStageList(scenario);
  const scenarioId = getScenarioStorageId(scenario, requestedScenarioId);

  return summaries.map((summary, index) => {
    const stage =
      stages.find(item => item?.id === summary?.stageId) ||
      stages[index] ||
      {};

    const safeStage = {
      ...stage,
      id:
        stage?.id ||
        summary?.stageId ||
        "stage-" + String(index + 1),
      name:
        stage?.name ||
        stage?.title ||
        summary?.stageName ||
        "Stage " + String(index + 1),
      title:
        stage?.title ||
        stage?.name ||
        summary?.stageName ||
        "Stage " + String(index + 1),
    };
return {
      sessionId: backendSession?.id || "frontend-merged-session",
      stage: cybraxisBuildSafeStage(
            typeof summary !== "undefined" ? summary : {},
            {},
            0
          ),
      scenarioId,
      stageId: cybraxisBuildSafeStage(
            typeof summary !== "undefined" ? summary : {},
            {},
            0
          ).id || summary?.stageId || stage?.id ||
        "stage-" + String(index + 1),
      stageIndex: Number.isFinite(Number(summary?.stageIndex))
        ? Number(summary.stageIndex)
        : index,
      stageName: cybraxisBuildSafeStage(
            typeof summary !== "undefined" ? summary : {},
            {},
            0
          ).name || cybraxisBuildSafeStage(
            typeof summary !== "undefined" ? summary : {},
            {},
            0
          ).title ||
        stage?.id ||
        "Stage " + String(index + 1),
      passed: Boolean(summary?.passed),
      timedOut: Boolean(summary?.timedOut),
      scoreSummary: summary,
      guidanceProfile: mentorGuidanceProfile,
      wrongActionCount: summary?.wrongActionCount || 0,
      hintsRequested,
    };
  });
}

function getNextScenarioIdFromFinalReport(report = {}) {
  const scenarioId = String(
    report?.scenario?.id ||
    report?.scenarioId ||
    report?.scenario?.scenario_id ||
    ""
  ).toLowerCase();

  if (
    scenarioId.includes("scenario2") ||
    scenarioId.includes("scenario_2") ||
    scenarioId.includes("silent_beacon")
  ) {
    return "";
  }

  if (
    scenarioId.includes("scenario1_variant_b") ||
    scenarioId.includes("external_recon_to_exfiltration_1b") ||
    scenarioId.includes("scenario1b") ||
    scenarioId.includes("scenario_1b")
  ) {
    return "scenario2_silent_beacon";
  }

  return "external_recon_to_exfiltration_1b";
}

function getFinalReportNextActionLabel(report = {}) {
  const nextScenarioId = getNextScenarioIdFromFinalReport(report);

  if (!nextScenarioId) {
    return "Training Complete";
  }

  if (nextScenarioId === "scenario2_silent_beacon") {
    return "Continue to Silent Beacon";
  }

  return "Continue Training";
}
/* CYBRAXIS_FULL_SCENARIO_REPORT_HELPERS_END */


/* CYBRAXIS_STABLE_FULL_REPORT_HELPERS_START */
function stableGetActiveUserId() {
  if (typeof window === "undefined") return "";

  try {
    return (
      window.localStorage.getItem("cybraxisCurrentPlayerId") ||
      window.localStorage.getItem("cybraxisSelectedPlayerId") ||
      window.localStorage.getItem("cybraxisActivePlayerId") ||
      ""
    );
  } catch {
    return "";
  }
}

function stableGetScenarioId(scenario = {}, requestedScenarioId = "") {
  return String(
    scenario?.scenario_id ||
    scenario?.id ||
    requestedScenarioId ||
    "unknown-scenario"
  );
}

function stableStageScoreKey(userId, scenarioId) {
  return "cybraxisScenarioStageScores:" + userId + ":" + scenarioId;
}

function stableStageList(scenario = {}) {
  return Array.isArray(scenario?.stages) ? scenario.stages : [];
}

function stableClone(value) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

function stableNormalizeStageSummary(summary = {}, index = 0, scenario = {}) {
  const stages = stableStageList(scenario);
  const stageById = stages.find(stage => stage?.id && stage.id === summary?.stageId);
  const stageByIndex = stages[index] || {};
  const stage = stageById || stageByIndex || {};

  const stageId =
    summary?.stageId ||
    stage?.id ||
    "stage-" + String(index + 1);

  const stageIndexFromScenario = stages.findIndex(item => item?.id === stageId);

  const stageIndex = Number.isFinite(Number(summary?.stageIndex))
    ? Number(summary.stageIndex)
    : stageIndexFromScenario >= 0
      ? stageIndexFromScenario
      : index;

  return {
    ...stableClone(summary),
    stageId,
    stageIndex,
    stageName: cybraxisBuildSafeStage(
            typeof summary !== "undefined" ? summary : {},
            {},
            0
          ).name || cybraxisBuildSafeStage(
            typeof summary !== "undefined" ? summary : {},
            {},
            0
          ).title ||
      stage?.id ||
      "Stage " + String(stageIndex + 1),
    savedAt: summary?.savedAt || new Date().toISOString(),
  };
}

function stableReadSavedStageSummaries(scenario = {}, requestedScenarioId = "") {
  if (typeof window === "undefined") return [];

  try {
    const userId = stableGetActiveUserId();
    const scenarioId = stableGetScenarioId(scenario, requestedScenarioId);

    if (!userId || !scenarioId) return [];

    const raw = window.localStorage.getItem(stableStageScoreKey(userId, scenarioId));
    const parsed = JSON.parse(raw || "[]");

    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function stableOrderStageSummaries(items = [], scenario = {}) {
  const stages = stableStageList(scenario);
  const byStage = new Map();

  items.filter(Boolean).forEach((summary, index) => {
    const normalized = stableNormalizeStageSummary(summary, index, scenario);
    const key = normalized.stageId || String(normalized.stageIndex);
    byStage.set(key, normalized);
  });

  return Array.from(byStage.values()).sort((a, b) => {
    const aIndex = stages.findIndex(stage => stage?.id === a.stageId);
    const bIndex = stages.findIndex(stage => stage?.id === b.stageId);

    const safeA = aIndex >= 0 ? aIndex : Number(a.stageIndex ?? 999);
    const safeB = bIndex >= 0 ? bIndex : Number(b.stageIndex ?? 999);

    return safeA - safeB;
  });
}

function stablePersistStageSummaries(items = [], scenario = {}, requestedScenarioId = "") {
  if (typeof window === "undefined") return;
  if (!Array.isArray(items) || items.length === 0) return;

  try {
    const userId = stableGetActiveUserId();
    const scenarioId = stableGetScenarioId(scenario, requestedScenarioId);

    if (!userId || !scenarioId) return;

    const ordered = stableOrderStageSummaries(items, scenario);
    window.localStorage.setItem(
      stableStageScoreKey(userId, scenarioId),
      JSON.stringify(ordered)
    );
  } catch {}
}

function stableMergeAndPersistStageSummary(previous = [], nextSummary = {}, scenario = {}, requestedScenarioId = "") {
  const saved = stableReadSavedStageSummaries(scenario, requestedScenarioId);
  const merged = stableOrderStageSummaries(
    [
      ...saved,
      ...(Array.isArray(previous) ? previous : []),
      nextSummary,
    ],
    scenario
  );

  stablePersistStageSummaries(merged, scenario, requestedScenarioId);

  return merged;
}

function stableFullStageSummaries(currentSummaries = [], scenario = {}, requestedScenarioId = "") {
  const saved = stableReadSavedStageSummaries(scenario, requestedScenarioId);

  return stableOrderStageSummaries(
    [
      ...saved,
      ...(Array.isArray(currentSummaries) ? currentSummaries : []),
    ],
    scenario
  );
}

function stableBuildStageResultsForReport({
  summaries = [],
  scenario = {},
  backendSession = {},
  requestedScenarioId = "",
  mentorGuidanceProfile = {},
  hintsRequested = 0,
}) {
  const stages = stableStageList(scenario);
  const scenarioId = stableGetScenarioId(scenario, requestedScenarioId);

  return summaries.map((summary, index) => {
    const stage =
      stages.find(item => item?.id === summary?.stageId) ||
      stages[index] ||
      {};

    return {
      sessionId: backendSession?.id || "frontend-full-report-session",
      scenarioId,
      stageId: cybraxisBuildSafeStage(
            typeof summary !== "undefined" ? summary : {},
            {},
            0
          ).id || summary?.stageId || stage?.id ||
        "stage-" + String(index + 1),
      stageIndex: Number.isFinite(Number(summary?.stageIndex))
        ? Number(summary.stageIndex)
        : index,
      stageName: cybraxisBuildSafeStage(
            typeof summary !== "undefined" ? summary : {},
            {},
            0
          ).name || cybraxisBuildSafeStage(
            typeof summary !== "undefined" ? summary : {},
            {},
            0
          ).title ||
        stage?.id ||
        "Stage " + String(index + 1),
      passed: Boolean(summary?.passed),
      timedOut: Boolean(summary?.timedOut),
      scoreSummary: summary,
      guidanceProfile: mentorGuidanceProfile,
      wrongActionCount: summary?.wrongActionCount || 0,
      hintsRequested,
    };
  });
}

function stableBuildFullReportForRender({
  report,
  scenario = {},
  requestedScenarioId = "",
  backendSession = {},
  stageScoreSummaries = [],
  mentorGuidanceProfile = {},
  hintsRequested = 0,
}) {
  if (!report) return report;

  try {
    const fullSummaries = stableFullStageSummaries(
      stageScoreSummaries,
      scenario,
      requestedScenarioId
    );

    const existingStageCount =
      Number(report?.summary?.totalStages || 0) ||
      (Array.isArray(report?.stageBreakdown) ? report.stageBreakdown.length : 0);

    if (fullSummaries.length <= existingStageCount) {
      return report;
    }

    const fullStageResults = stableBuildStageResultsForReport({
      summaries: fullSummaries,
      scenario,
      backendSession,
      requestedScenarioId,
      mentorGuidanceProfile,
      hintsRequested,
    });

    const scenarioId = stableGetScenarioId(scenario, requestedScenarioId);

    const baseReport = createFinalScenarioReport({
      session: {
        ...(backendSession || {}),
        id: backendSession?.id || "frontend-full-report-session",
        stageResults: fullStageResults,
      },
      scenarioId,
      scenarioName: scenario?.name || scenario?.title || "Current scenario",
      stageResults: fullStageResults,
    });

    return enrichFinalReportWithAiInsights(baseReport, []);
  } catch (error) {
    console.error("FULL REPORT RENDER MERGE FAILED", error);
    return report;
  }
}
/* CYBRAXIS_STABLE_FULL_REPORT_HELPERS_END */


/* CYBRAXIS_DIRECT_STAGE_SCORE_STORAGE_START */
function cybraxisGetActivePlayerIdForStageStorage() {
  if (typeof window === "undefined") return "";

  try {
    return (
      window.localStorage.getItem("cybraxisCurrentPlayerId") ||
      window.localStorage.getItem("cybraxisSelectedPlayerId") ||
      window.localStorage.getItem("cybraxisActivePlayerId") ||
      ""
    );
  } catch {
    return "";
  }
}

function cybraxisGetScenarioIdForStageStorage(scenario = {}, requestedScenarioId = "") {
  return String(
    scenario?.scenario_id ||
    scenario?.id ||
    requestedScenarioId ||
    "unknown-scenario"
  );
}

function cybraxisStageScoreStorageKey(playerId, scenarioId) {
  return "cybraxisScenarioStageScores:" + playerId + ":" + scenarioId;
}

function cybraxisNormalizeStageScoreForStorage(summary = {}, scenario = {}) {
  const stages = Array.isArray(scenario?.stages) ? scenario.stages : [];
  const stage =
    stages.find(item => item?.id && item.id === summary?.stageId) ||
    stages[Number(summary?.stageIndex ?? -1)] ||
    {};

  const stageId =
    summary?.stageId ||
    stage?.id ||
    "stage-" + String(Number(summary?.stageIndex ?? 0) + 1);

  const stageIndexFromScenario = stages.findIndex(item => item?.id === stageId);

  return {
    ...summary,
    stageId,
    stageIndex: Number.isFinite(Number(summary?.stageIndex))
      ? Number(summary.stageIndex)
      : stageIndexFromScenario >= 0
        ? stageIndexFromScenario
        : 0,
    stageName: cybraxisBuildSafeStage(
            typeof summary !== "undefined" ? summary : {},
            {},
            0
          ).name || cybraxisBuildSafeStage(
            typeof summary !== "undefined" ? summary : {},
            {},
            0
          ).title ||
      stage?.id ||
      "Stage " + String(Number(summary?.stageIndex ?? 0) + 1),
    savedAt: new Date().toISOString(),
  };
}

function cybraxisReadStoredStageScores(scenario = {}, requestedScenarioId = "") {
  if (typeof window === "undefined") return [];

  try {
    const playerId = cybraxisGetActivePlayerIdForStageStorage();
    const scenarioId = cybraxisGetScenarioIdForStageStorage(scenario, requestedScenarioId);

    if (!playerId || !scenarioId) return [];

    const raw = window.localStorage.getItem(
      cybraxisStageScoreStorageKey(playerId, scenarioId)
    );

    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function cybraxisOrderStageScores(items = [], scenario = {}) {
  const stages = Array.isArray(scenario?.stages) ? scenario.stages : [];
  const byStage = new Map();

  items.filter(Boolean).forEach((item) => {
    const normalized = cybraxisNormalizeStageScoreForStorage(item, scenario);
    byStage.set(normalized.stageId || String(normalized.stageIndex), normalized);
  });

  return Array.from(byStage.values()).sort((a, b) => {
    const aIndex = stages.findIndex(stage => stage?.id === a.stageId);
    const bIndex = stages.findIndex(stage => stage?.id === b.stageId);

    const safeA = aIndex >= 0 ? aIndex : Number(a.stageIndex ?? 999);
    const safeB = bIndex >= 0 ? bIndex : Number(b.stageIndex ?? 999);

    return safeA - safeB;
  });
}


function cybraxisGetActiveProgressUserId() {
  if (typeof window === "undefined") return "";

  return (
    window.localStorage.getItem("cybraxisCurrentPlayerId") ||
    window.localStorage.getItem("cybraxisSelectedPlayerId") ||
    window.localStorage.getItem("cybraxisActivePlayerId") ||
    ""
  );
}

function cybraxisGetScenarioIdentityForProgress(scenario = {}, requestedScenarioId = "") {
  return (
    requestedScenarioId ||
    scenario?.id ||
    scenario?.scenarioId ||
    scenario?.metadata?.id ||
    scenario?.title ||
    ""
  );
}

function cybraxisPersistCompletedStagesSnapshot(stageIds = [], scenario = {}, requestedScenarioId = "") {
  if (typeof window === "undefined") return;

  const userId = cybraxisGetActiveProgressUserId();
  const scenarioId = cybraxisGetScenarioIdentityForProgress(scenario, requestedScenarioId);

  if (!userId || !scenarioId) return;

  const cleanIds = Array.from(
    new Set(
      (Array.isArray(stageIds) ? stageIds : [])
        .map(value => String(value || "").trim())
        .filter(Boolean)
    )
  );

  const completedKey = "cybraxisCompletedStages:" + userId + ":" + scenarioId;
  window.localStorage.setItem(completedKey, JSON.stringify(cleanIds));

  const progressKey = "cybraxisUserProgress:" + userId;
  let snapshot = {};

  try {
    snapshot = JSON.parse(window.localStorage.getItem(progressKey) || "{}") || {};
  } catch {
    snapshot = {};
  }

  window.localStorage.setItem(
    progressKey,
    JSON.stringify({
      ...snapshot,
      cybraxisCompletedStagesKey: completedKey,
      cybraxisCompletedStagesScenarioId: scenarioId,
      cybraxisCompletedStagesCount: String(cleanIds.length),
      cybraxisLastProgressSavedAt: new Date().toISOString(),
    })
  );
}

function cybraxisSaveStageScore(summary = {}, scenario = {}, requestedScenarioId = "") {
  if (typeof window === "undefined" || !summary) return [];

  try {
    const playerId = cybraxisGetActivePlayerIdForStageStorage();
    const scenarioId = cybraxisGetScenarioIdForStageStorage(scenario, requestedScenarioId);

    if (!playerId || !scenarioId) return [];

    const existing = cybraxisReadStoredStageScores(scenario, requestedScenarioId);
    const merged = cybraxisOrderStageScores([...existing, summary], scenario);

    window.localStorage.setItem(
      cybraxisStageScoreStorageKey(playerId, scenarioId),
      JSON.stringify(merged)
    );

    return merged;
  } catch {
    return [];
  }
}

function cybraxisGetFullScenarioStageScores(currentSummaries = [], scenario = {}, requestedScenarioId = "") {
  return cybraxisOrderStageScores(
    [
      ...cybraxisReadStoredStageScores(scenario, requestedScenarioId),
      ...(Array.isArray(currentSummaries) ? currentSummaries : []),
    ],
    scenario
  );
}
/* CYBRAXIS_DIRECT_STAGE_SCORE_STORAGE_END */


/* CYBRAXIS_SAFE_STAGE_REFERENCE_REPAIR_START */
function cybraxisBuildSafeStage(summary = {}, stage = {}, index = 0) {
  const safeIndex = Number.isFinite(Number(index)) ? Number(index) : 0;

  const id =
    stage?.id ||
    summary?.stageId ||
    summary?.stage_id ||
    "stage-" + String(safeIndex + 1);

  const name =
    stage?.name ||
    stage?.title ||
    summary?.stageName ||
    summary?.stage_name ||
    "Stage " + String(safeIndex + 1);

  return {
    ...(stage || {}),
    id,
    name,
    title: stage?.title || name,
    index: Number.isFinite(Number(stage?.index)) ? Number(stage.index) : safeIndex,
  };
}
/* CYBRAXIS_SAFE_STAGE_REFERENCE_REPAIR_END */

function buildAiLearningProfile(records = [], report = {}) {
  const safeRecords = Array.isArray(records) ? records.filter(Boolean) : [];
  const liveRecords = safeRecords.filter(record => record.providerStatus === "live");
  const fallbackRecords = safeRecords.filter(record => record.providerStatus !== "live");

  const meaningfulPatternRecords = liveRecords.filter(
    record => record.misconceptionDetected && record.misconceptionDetected !== "none"
  );

  const primaryMisconception =
    aiMostCommon(meaningfulPatternRecords, "misconceptionDetected", "none");

  const primaryFocus = aiMostCommon(liveRecords, "nextFocus", "activity/evidence");
  const supportLevel = aiMostCommon(liveRecords, "supportLevel", "none");

  const latestLiveRecord =
    [...liveRecords].reverse()[0] ||
    [...safeRecords].reverse()[0] ||
    null;

  const progressionRecommendation =
    latestLiveRecord?.progressionRecommendation ||
    report?.progression?.recommendationType ||
    "continue_current_scenario";

  const patternLabel = AI_PATTERN_LABELS[primaryMisconception] || aiReadable(primaryMisconception);
  const focusLabel = AI_FOCUS_LABELS[primaryFocus] || aiReadable(primaryFocus);

  let primaryImprovementArea = "General investigation consistency";

  if (primaryMisconception === "premature_containment") {
    primaryImprovementArea = "Response sequencing before containment";
  } else if (primaryMisconception === "incomplete_evidence") {
    primaryImprovementArea = "Investigation evidence completion";
  } else if (primaryMisconception === "wrong_node_focus") {
    primaryImprovementArea = "Suspicious node selection";
  } else if (primaryMisconception === "weak_interpretation") {
    primaryImprovementArea = "Evidence interpretation";
  } else if (primaryMisconception === "mentor_overreliance") {
    primaryImprovementArea = "Independent investigation confidence";
  } else if (primaryFocus) {
    primaryImprovementArea = `${focusLabel} consistency`;
  }

  const observations = [];

  if (safeRecords.length === 0) {
    observations.push("No mentor system interventions were recorded during this scenario.");
  } else {
    observations.push(
      `The mentor system produced ${liveRecords.length} learning intervention${liveRecords.length === 1 ? "" : "s"} during the scenario.`
    );

    if (fallbackRecords.length > 0) {
      observations.push(
        `${fallbackRecords.length} mentor fallback event${fallbackRecords.length === 1 ? "" : "s"} occurred when live guidance was unavailable.`
      );
    }

    observations.push(
      `The main adaptive focus was ${focusLabel.toLowerCase()}, with support level marked as ${String(supportLevel || "none").toLowerCase()}.`
    );

    if (primaryMisconception !== "none") {
      observations.push(
        `The main learner pattern identified by the learning review was ${patternLabel.toLowerCase()}.`
      );
    } else {
      observations.push(
        "The learning review did not identify a repeated misconception pattern during the recorded interventions."
      );
    }
  }

  const recommendations = [];

  if (primaryMisconception === "premature_containment") {
    recommendations.push(
      "Practice completing evidence checks before applying containment actions."
    );
  } else if (primaryMisconception === "incomplete_evidence") {
    recommendations.push(
      "Revisit the full investigation cycle before final response decisions, especially activity/evidence validation."
    );
  } else if (primaryMisconception === "wrong_node_focus") {
    recommendations.push(
      "Practice selecting the correct suspicious node before acting on response options."
    );
  } else if (primaryMisconception === "weak_interpretation") {
    recommendations.push(
      "Strengthen interpretation by connecting alerts, logs, node state, and network path evidence."
    );
  } else if (primaryMisconception === "mentor_overreliance") {
    recommendations.push(
      "Recommendation: repeat similar scenarios with fewer hints to build independent investigation confidence."
    );
  } else if (liveRecords.length > 0) {
    recommendations.push(
      `Continue strengthening ${focusLabel.toLowerCase()} reasoning in the next scenario variant.`
    );
  }

  if (progressionRecommendation === "send_to_remedy_premature_containment") {
    recommendations.push("Progression note: premature-containment remediation is recommended if the backend progression rule allows it.");
  } else if (progressionRecommendation === "send_to_remedy_evidence_completion") {
    recommendations.push("Progression note: evidence-completion remediation is recommended if the backend progression rule allows it.");
  } else if (progressionRecommendation === "unlock_equivalent_variant") {
    recommendations.push("Progression note: the learner is ready for an equivalent new scenario variant.");
  }

  return {
    enabled: true,
    interventionCount: safeRecords.length,
    liveInterventionCount: liveRecords.length,
    fallbackCount: fallbackRecords.length,

    primaryMisconception,
    primaryMisconceptionLabel: patternLabel,
    primaryFocus,
    primaryFocusLabel: focusLabel,
    supportLevel,
    progressionRecommendation,
    primaryImprovementArea,

    observations,
    recommendations: aiUniqueList(recommendations),
    dashboardRecommendation:
      recommendations[0] ||
      "Continue scenario practice and maintain complete investigation coverage.",

    history: safeRecords.slice(-8),
    generatedAt: new Date().toISOString(),
  };
}

function enrichFinalReportWithAiInsights(report = {}, aiRecords = []) {
  const aiLearningProfile = buildAiLearningProfile(aiRecords, report);
  const aiRecommendations = aiLearningProfile.recommendations || [];

  return {
    ...report,

    aiLearningProfile,

    summary: {
      ...(report.summary || {}),
      aiInterventionCount: aiLearningProfile.interventionCount,
      aiPrimaryFocus: aiLearningProfile.primaryFocus,
      aiPrimaryMisconception: aiLearningProfile.primaryMisconception,
    },

    weaknesses: aiLearningProfile.primaryMisconception !== "none"
      ? aiUniqueList([
          ...(report.weaknesses || []),
          `Observed pattern: ${aiLearningProfile.primaryMisconceptionLabel}`,
        ])
      : (report.weaknesses || []),

    recommendations: aiUniqueList([
      ...(report.recommendations || []),
      ...aiRecommendations,
    ]),

    finalFeedback: report.finalFeedback || "Final feedback generated from scenario performance and learning observations.",
  };
}



function persistAiLearningProfile(aiLearningProfile) {
  if (typeof window === "undefined" || !aiLearningProfile) return;

  try {
    window.localStorage.setItem(
      "cybraxisLatestAiLearningProfile",
      JSON.stringify(aiLearningProfile)
    );
  } catch {}
}
/* CYBRAXIS_AI_REPORT_HELPERS_END */

export default function App() {

  /* CYBRAXIS_AUTH_STATE_START */
  const [authenticated, setAuthenticated] = useState(() => {
    if (typeof window === "undefined") return false;

    try {
      const rawSession = window.localStorage.getItem("cybraxisAuthSession");
      if (!rawSession) return false;

      const session = JSON.parse(rawSession);
      const sessionUserId = String(session?.userId || "").trim();

      if (!sessionUserId) return false;

      const currentUserId =
        window.localStorage.getItem("cybraxisCurrentPlayerId") ||
        window.localStorage.getItem("cybraxisSelectedPlayerId") ||
        window.localStorage.getItem("cybraxisActivePlayerId") ||
        "";

      return Boolean(
        session?.loggedIn !== false &&
        (!currentUserId || String(currentUserId).trim() === sessionUserId)
      );
    } catch {
      return false;
    }
  });

  const handleLogin = (userOrId) => {
    if (typeof window === "undefined") return;

    const userId =
      typeof userOrId === "string"
        ? userOrId.trim()
        : String(userOrId?.id || "").trim();

    if (!userId) return;

    const displayName =
      typeof userOrId === "object" && userOrId
        ? userOrId.displayName || userOrId.name || userOrId.username || "Learner"
        : "Learner";

    window.localStorage.setItem(
      "cybraxisAuthSession",
      JSON.stringify({
        userId,
        loggedIn: true,
        loginTime: Date.now()
      })
    );

    window.localStorage.setItem("cybraxisCurrentPlayerId", userId);
    window.localStorage.setItem("cybraxisSelectedPlayerId", userId);
    window.localStorage.setItem("cybraxisActivePlayerId", userId);
    window.localStorage.setItem("cybraxisPlayerName", displayName);

    setAuthenticated(true);
  };
  /* CYBRAXIS_AUTH_STATE_END */

  const [actionResult, setActionResult] = useState(null);

  const [backendSession, setBackendSession] = useState(null);
  const backendSessionCreatedRef = useRef(false);
  const savedStageResultKeysRef = useRef(new Set());
  const finalReportCreatedRef = useRef(false);
  const [finalReportVisible, setFinalReportVisible] = useState(false);
  const [latestBackendActionEvaluation, setLatestBackendActionEvaluation] = useState(null);

const [backendLogPacing, setBackendLogPacing] = useState(null);
const backendLogPacingRef = useRef(null);

  const [stageScore, setStageScore] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [completedStageActions, setCompletedStageActions] = useState(new Set());
  const [stageActionHistory, setStageActionHistory] = useState([]);
  const [investigationEvents, setInvestigationEvents] = useState([]);

  const [stageScoreSummaries, setStageScoreSummaries] = useState([]);

  /* CYBRAXIS_STAGE_SCORE_RUNTIME_SAVE_EFFECT_START */
  useEffect(() => {
    try {
      if (!Array.isArray(stageScoreSummaries) || stageScoreSummaries.length === 0) return;
      if (typeof cybraxisSaveStageScore !== "function") return;

      stageScoreSummaries.forEach(summary => {
        cybraxisSaveStageScore(summary, scenario, requestedScenarioId);
      });
    } catch {}
  }, [stageScoreSummaries, scenario, requestedScenarioId]);
  /* CYBRAXIS_STAGE_SCORE_RUNTIME_SAVE_EFFECT_END */

  /* CYBRAXIS_STAGE_SCORE_PERSISTENCE_EFFECT_START */
  useEffect(() => {
    persistScenarioStageScoreSummaries(
      stageScoreSummaries,
      scenario,
      requestedScenarioId
    );
  }, [stageScoreSummaries, scenario, requestedScenarioId]);
  /* CYBRAXIS_STAGE_SCORE_PERSISTENCE_EFFECT_END */
  const [wrongActionCount, setWrongActionCount] = useState(0);
  const [hintsRequested, setHintsRequested] = useState(0);

  const [stageIdx, setStageIdx] = useState(readInitialStageIndexFromQuery);

  // CYBRAXIS_LAST_POSITION_SAVE
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const scenarioFromUrl = params.get("scenario");
      const menuFromUrl = params.get("menu");

      /*
        Important:
        Do NOT save progress while the main menu is being rendered.
        Without this guard, opening or refreshing ?menu=home overwrites the real
        saved scenario position with the default Scenario 1A / Stage 0 state.
      */
      if (menuFromUrl || !scenarioFromUrl) {
        return;
      }

      const safeScenarioId = scenarioFromUrl || requestedScenarioId;
      const safeStageIndex = Math.max(0, Number(stageIdx) || 0);
      const activeUserId =
        window.localStorage.getItem("cybraxisCurrentPlayerId") ||
        window.localStorage.getItem("cybraxisSelectedPlayerId") ||
        window.localStorage.getItem("cybraxisActivePlayerId") ||
        "";

      window.localStorage.setItem("cybraxisLastScenarioId", safeScenarioId);
      window.localStorage.setItem("cybraxisLastStageIndex", String(safeStageIndex));
      window.localStorage.setItem("cybraxisHasTrainingProgress", "true");

      if (activeUserId) {
        const progressKey = "cybraxisUserProgress:" + activeUserId;
        let snapshot = {};

        try {
          snapshot = JSON.parse(window.localStorage.getItem(progressKey) || "{}") || {};
        } catch {
          snapshot = {};
        }

        const playerName =
          window.localStorage.getItem("cybraxisPlayerName") ||
          snapshot.cybraxisPlayerName ||
          "Student Analyst";

        window.localStorage.setItem(
          progressKey,
          JSON.stringify({
            ...snapshot,
            cybraxisPlayerName: playerName,
            cybraxisLastScenarioId: safeScenarioId,
            cybraxisLastStageIndex: String(safeStageIndex),
            cybraxisHasTrainingProgress: "true",
            cybraxisLastProgressSavedAt: new Date().toISOString(),
          })
        );
      }
    } catch {}
  }, [stageIdx]);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [hlLogId, setHlLogId] = useState(null);

  const currentScenarioStage = scenario?.stages?.[stageIdx];
  const [replayedStageIds, setReplayedStageIds] = useState(() => new Set());
  const [replayReturnStageIndex, setReplayReturnStageIndex] = useState(null);
  useEffect(() => {
    if (backendSessionCreatedRef.current) return;

    backendSessionCreatedRef.current = true;

    createSession({
      scenarioId: scenario?.scenario_id || "unknown-scenario",
      scenarioName: scenario?.name || "Untitled Scenario",
      userId: "local-user",
      totalStages: scenario?.stages?.length || 0,
    })
      .then(session => {
        const sessionWithStageCount = {
          ...session,
          progress: {
            ...session.progress,
            totalStages: scenario?.stages?.length || 0,
          },
        };

        setBackendSession(sessionWithStageCount);

        logBackendParity("BACKEND SESSION CREATED", sessionWithStageCount);
      })
      .catch(error => {
        console.error("BACKEND SESSION CREATE FAILED", error);
      });
  }, []);

  useEffect(() => {
  setLatestBackendActionEvaluation(null);
  setBackendLogPacing(null);
  backendLogPacingRef.current = null;
}, [stageIdx]);

  const actionIdToScenarioAction = DEFAULT_ACTION_ID_MAP;

  const [mentorOpen, setMentorOpen] = useState(false);
  const mentorOpenRef = useRef(false);

  useEffect(() => {
    mentorOpenRef.current = mentorOpen;
  }, [mentorOpen]);
  const [mentorHints, setMentorHints] = useState([]);

  useEffect(() => {
    try {
      const resetKey = "cybraxisMentorHintCounterSchema:v2";
      if (window.localStorage.getItem(resetKey) !== "real-guidance-only") {
        window.localStorage.setItem("cybraxisMentorHintUsageCount", "0");
        window.localStorage.setItem(resetKey, "real-guidance-only");
      }
    } catch {
      // Local storage is optional for the prototype runtime.
    }
  }, []);
  /* CYBRAXIS_RESET_POLLUTED_MENTOR_COUNTER_ONCE */
const [mentorBarHint, setMentorBarHint] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [mentorPulsing, setMentorPulsing] = useState(false);
  const [mentorFlash, setMentorFlash] = useState(false);
  
  const [, setLatestAiAdaptiveDecision] = useState(null);
    const aiInterventionHistoryRef = useRef([]);
  const aiAutomaticInterventionRef = useRef(new Set());
const aiAutoVisibleHintGateRef = useRef(0);
  const lastAutoWrongActionCountRef = useRef(0);
  const lastAutoStageReviewKeyRef = useRef("");
const [aiAdaptiveLoading, setAiAdaptiveLoading] = useState(false);
  const aiAdaptiveLoadingRef = useRef(false);

  useEffect(() => {
    aiAdaptiveLoadingRef.current = aiAdaptiveLoading;
  }, [aiAdaptiveLoading]);
  const aiAdaptiveRequestRef = useRef(0);
  const mentorPulseTimer = useRef(null);
  const mentorHintGateRef = useRef(new Map());
  const adaptiveCheckpointGateRef = useRef(new Map());
  const adaptiveLastStageActionCountRef = useRef(0);
  const adaptiveLastInvestigationCountRef = useRef(0);
  const adaptiveLastWrongActionCountRef = useRef(0);
  const stageTransitionPendingRef = useRef(false);

  const [pendingStageAdvance, setPendingStageAdvance] = useState(null);

  const [completedStages, setCompletedStages] = useState(new Set());

  /* CYBRAXIS_COMPLETED_STAGES_RUNTIME_SAVE_START */
  useEffect(() => {
    if (!(completedStages instanceof Set)) return;

    const completedStageIds = Array.from(completedStages).filter(Boolean);

    /* CYBRAXIS_DASHBOARD_EMPTY_COMPLETION_OVERWRITE_GUARD
       Do not persist an empty completed-stage set over an already completed
       scenario. During refresh/remount, completedStages can temporarily be
       empty before runtime state is rebuilt; writing [] here caused the
       dashboard to fall back to stale 3/5 progress.
    */
    if (!completedStageIds.length) {
      const scenarioId = String(scenario?.id || requestedScenarioId || "");
      const completedScenarioId = window.localStorage.getItem("cybraxisCompletedScenarioId") || "";
      if (scenarioId && completedScenarioId === scenarioId) return;
      return;
    }

    cybraxisPersistCompletedStagesSnapshot(
      completedStageIds,
      scenario,
      requestedScenarioId
    );
  }, [completedStages, scenario, requestedScenarioId]);
  /* CYBRAXIS_COMPLETED_STAGES_RUNTIME_SAVE_END */


  /* CYBRAXIS_MARK_SCENARIO_COMPLETE_FOR_DASHBOARD_START */
  const markCurrentScenarioCompleteForDashboard = useCallback(() => {
    try {
      const stageIds = (Array.isArray(scenario?.stages) ? scenario.stages : [])
        .map((stage, index) => String(stage?.id || stage?.stageId || stage?.name || "stage-" + String(index + 1)))
        .filter(Boolean);

      if (!stageIds.length) return;

      const scenarioId = String(scenario?.id || requestedScenarioId || "active-scenario");

      setCompletedStages(new Set(stageIds));
      cybraxisPersistCompletedStagesSnapshot(stageIds, scenario, requestedScenarioId);

      window.localStorage.setItem("cybraxisLastScenarioId", scenarioId);
      window.localStorage.setItem("cybraxisLastStageIndex", String(Math.max(0, stageIds.length - 1)));
      window.localStorage.setItem("cybraxisCompletedScenarioId", scenarioId);
      window.localStorage.setItem("cybraxisCompletedScenarioStageCount", String(stageIds.length));

      const activeUserId =
        window.localStorage.getItem("cybraxisCurrentPlayerId") ||
        window.localStorage.getItem("cybraxisSelectedPlayerId") ||
        window.localStorage.getItem("cybraxisActivePlayerId") ||
        "";


      /* CYBRAXIS_AUTHORITATIVE_COMPLETED_STAGE_IDS_WRITE */
      if (activeUserId) {
        const completedKey = "cybraxisCompletedStages:" + activeUserId + ":" + scenarioId;
        window.localStorage.setItem(completedKey, JSON.stringify(stageIds));
      }
      if (activeUserId) {
        const snapshotKey = "cybraxisUserProgress:" + activeUserId;
        const snapshot = JSON.parse(window.localStorage.getItem(snapshotKey) || "{}") || {};

        snapshot.cybraxisLastScenarioId = scenarioId;
        snapshot.cybraxisLastStageIndex = String(Math.max(0, stageIds.length - 1));
        snapshot.cybraxisCompletedScenarioId = scenarioId;
        snapshot.cybraxisCompletedScenarioStageCount = String(stageIds.length);
        snapshot.cybraxisCompletedStageIdsByScenario = {
          ...(snapshot.cybraxisCompletedStageIdsByScenario || {}),
          [scenarioId]: stageIds,
        };

        window.localStorage.setItem(snapshotKey, JSON.stringify(snapshot));
      }
    } catch {
      // Dashboard completion persistence is best-effort for the prototype.
    }
  }, [scenario, requestedScenarioId]);
  /* CYBRAXIS_MARK_SCENARIO_COMPLETE_FOR_DASHBOARD_END */
  /* CYBRAXIS_FINAL_REPORT_COMPLETION_WRITE */

  const [nodeRuntime, setNodeRuntime] = useState({});
  const [blockedConnections, setBlockedConnections] = useState(new Set());
  const [highlightedEdges, setHighlightedEdges] = useState(new Set());

  const [resolvedAlerts, setResolvedAlerts] = useState(new Set());

  const [displayedLogs, setDisplayedLogs] = useState([]);
  const [actionLogs, setActionLogs] = useState([]);
  const logRevealRef = useRef(null);

  const idleRef = useRef(null);
  const idleHintIdx = useRef(0);

  const [stageTimeRemaining, setStageTimeRemaining] = useState(0);
  const [stageTimerState, setStageTimerState] = useState(TIMER_STATES.NORMAL);
  const [stageLocked, setStageLocked] = useState(false);
  const [stageLockReason, setStageLockReason] = useState(null);
  const timerIntervalRef = useRef(null);
  const timerWarningIssuedRef = useRef(false);
  const timeoutHandledRef = useRef(false);

  const [stageEscalations, setStageEscalations] = useState({});

  const safeStageIdx = Math.min(stageIdx, KILL_CHAIN_STAGES.length - 1);
  const stageId = KILL_CHAIN_STAGES[safeStageIdx]?.id;

  const scenarioSuspiciousNodes = currentScenarioStage?.suspicious_nodes || [];
  const suspNodes = scenarioSuspiciousNodes.length > 0
    ? scenarioSuspiciousNodes
    : STAGE_SUSPICIOUS_NODES[stageId] || [];

  const atkEdges = STAGE_ATTACK_EDGES[stageId] || [];
  const allLogs = [...displayedLogs, ...actionLogs].filter(Boolean);
  const isLastStage = stageIdx >= (scenario?.stages?.length || 1) - 1;
  const advisorVisibleMentorHints = mentorHints.filter(hint =>
  cybraxisIsRealMentorGuidance(hint?.text, hint?.trigger)
);
const latestMentorHint = advisorVisibleMentorHints.length > 0
  ? advisorVisibleMentorHints[advisorVisibleMentorHints.length - 1]
  : null;

  const stageExpectedActions = currentScenarioStage?.expected_actions || [];
  const stageRequiredInvestigation = currentScenarioStage?.required_investigation || {};

  const requiredCoverageDimensions =
    Array.isArray(stageRequiredInvestigation.dimensions) &&
    stageRequiredInvestigation.dimensions.length > 0
      ? stageRequiredInvestigation.dimensions
      : getRequiredInvestigationDimensions(stageExpectedActions);

  const coverageTargetIds = getCoverageTargetIds(stageRequiredInvestigation, suspNodes);

  const investigationCoverage = getInvestigationCoverage(investigationEvents, stageId);

  const investigationTargetCoverage = getStageTargetCoverage(
    investigationEvents,
    stageId,
    coverageTargetIds,
    requiredCoverageDimensions
  );

  const currentEscalation = stageEscalations[stageId] || null;

  const latestStageScoreSummary =
    stageScoreSummaries.length > 0
      ? stageScoreSummaries[stageScoreSummaries.length - 1]
      : null;

  const currentStageScoreSummary =
    [...stageScoreSummaries]
      .reverse()
      .find(summary => summary.stageId === stageId) || null;

  const expectedGuidanceLevel =
    currentScenarioStage?.mentor?.expected_guidance_level || null;

  const mentorGuidanceProfile = calculateMentorGuidanceProfile({
    expectedGuidanceLevel,
    stageScoreSummary: currentStageScoreSummary || latestStageScoreSummary,
    investigationTargetCoverage,
    stageTimerState,
    wrongActionCount,
    hintsRequested,
    stageDifficulty: currentScenarioStage?.difficulty || "easy",
  });

  const getCurrentMentorContext = useCallback(() => {
    return buildMentorContext({
      stage: currentScenarioStage,
      stageId,
      stageIndex: stageIdx,
      selectedNodeId,
      selectedAlert,
      investigationCoverage,
      investigationTargetCoverage,
      stageScoreSummary: currentStageScoreSummary || latestStageScoreSummary,
      guidanceProfile: mentorGuidanceProfile,
      stageTimerState,
      stageLocked,
      stageLockReason,
      wrongActionCount,
      hintsRequested,
      escalation: currentEscalation,
    });
  }, [
    currentScenarioStage,
    stageId,
    stageIdx,
    selectedNodeId,
    selectedAlert,
    investigationCoverage,
    investigationTargetCoverage,
    currentStageScoreSummary,
    latestStageScoreSummary,
    mentorGuidanceProfile,
    stageTimerState,
    stageLocked,
    stageLockReason,
    wrongActionCount,
    hintsRequested,
    currentEscalation,
  ]);

  const stageScoring = currentScenarioStage?.scoring || {};
  const correctActionScore = stageScoring.correct_action_score || 0;
  const wrongActionPenalty = stageScoring.wrong_action_penalty || 0;
  const passScore = stageScoring.pass_score || 0;
  const maxScore = stageScoring.max_score || 0;
  const minimumActionsToPass = currentScenarioStage?.minimum_actions_to_pass || 1;
  const preferredActionOrder = currentScenarioStage?.preferred_action_order || [];

  const stageConsequences = currentScenarioStage?.consequences || {};
  const correctConsequences = stageConsequences.correct || {};
  const wrongConsequences = stageConsequences.wrong || {};

  const jsonEvents = useMemo(() => currentScenarioStage?.events || [], [currentScenarioStage]);
  const jsonAlertEvents = jsonEvents.filter(event => event.type === 'alert');

  const alerts = jsonAlertEvents.map((event, index) => ({
    id: event.id || `json-alert-${stageIdx}-${index}`,
    event: event.event || event.message,
    severity: normalizeSeverity(event.severity),
    relatedNode: event.relatedNode || event.related_node || null,
    relatedLog: event.relatedLog || event.related_log || null,
    sourceIp: event.sourceIp || event.source_ip || event.source || 'N/A',
    timestamp: event.timestamp || event.time || nowStr(),
    type: 'alert',
  }));

  const addMentorHint = useCallback((text, trigger) => {
    const normalizedText = String(text || "")
      .replace(/^AI\s+adaptive\s+note\s+for\s+[^:]+:\s*/i, "")
      .replace(/^AI\s+adaptive\s+note:\s*/i, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!normalizedText) return;

    const normalizedTrigger = String(trigger || "MENTOR").trim() || "MENTOR";

    /*
      Presentation safety:
      The SOC Advisor hint list should show useful learner guidance, not every
      internal action/evidence event. Operational feedback can still appear in
      the top status/action areas, but it should not pollute Mentor Hints.
    */
    const operationalNoiseHint =
      /^(identity|connectivity|controls|activity|interpretation)\s+investigation\s+recorded\\.?/i.test(normalizedText) ||
      /this\s+action\s+is\s+not\s+part\s+of\s+the\s+expected\s+response\s+set\s+for\s+the\s+current\s+stage/i.test(normalizedText) ||
      /selected\s+node\s+or\s+target\s+does\s+not\s+match\s+the\s+action\s+objective/i.test(normalizedText);

    const learnerRequestedHint =
      normalizedTrigger === "REQUEST" ||
      normalizedTrigger === "REQUEST_FALLBACK" ||
      normalizedTrigger === "STAGE" ||
      normalizedTrigger === "ALERT" ||
      normalizedTrigger === "ESCALATED_STAGE" ||
      normalizedTrigger === "AI_VALIDATED_FALLBACK";

    if (operationalNoiseHint && !learnerRequestedHint) {
      return;
    }

    const hintKey = normalizedText
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const now = Date.now();

    const repeatedCoverageHint =
      /(?:investigation|evidence)\s+coverage\s+(?:is\s+)?incomplete/i.test(normalizedText) ||
      /validate\s+required\s+evidence\s+before\s+taking\s+this\s+response\s+action/i.test(normalizedText);

    const userRequestedHint =
      normalizedTrigger === "REQUEST" ||
      normalizedTrigger === "REQUEST_FALLBACK";

    const repeatedStageHint = [
      "STAGE",
      "ALERT",
      "AI_VALIDATED_FALLBACK",
    ].includes(normalizedTrigger);

    const cooldownMs = repeatedCoverageHint
      ? 45000
      : repeatedStageHint
        ? 8000
        : 12000;

    const previousAt = mentorHintGateRef.current.get(hintKey) || 0;

    if (!userRequestedHint && previousAt && now - previousAt < cooldownMs) {
      return;
    }

    mentorHintGateRef.current.set(hintKey, now);

    if (mentorHintGateRef.current.size > 80) {
      mentorHintGateRef.current = new Map(
        Array.from(mentorHintGateRef.current.entries()).slice(-40)
      );
    }

    const createdMentorHint = makeHint(normalizedText, normalizedTrigger);
    const visibleAdvisorHint = cybraxisIsRealMentorGuidance(normalizedText, normalizedTrigger);
    /* CYBRAXIS_REAL_GUIDANCE_COUNT_GATE */
    if (visibleAdvisorHint) {
      cybraxisIncrementMentorHintUsage(normalizedTrigger, {
        scenarioId: String(scenario?.id || requestedScenarioId || "active-scenario"),
      });
    }

    setMentorHints(prev => {
      const recentDuplicate = prev.slice(-8).some(existing => {
        const existingKey = String(existing?.text || "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        return existingKey === hintKey;
      });

      if (recentDuplicate) {
        return prev;
      }

      const next = [...prev, createdMentorHint];
      return next.length > 10 ? next.slice(-10) : next;
    });

    if (visibleAdvisorHint) {
      if (!mentorOpenRef.current) {
        setUnreadCount(prev => prev + 1);
      }

      setMentorFlash(true);
      setTimeout(() => setMentorFlash(false), 800);

      clearTimeout(mentorPulseTimer.current);
      setMentorPulsing(true);
      mentorPulseTimer.current = setTimeout(() => setMentorPulsing(false), 1100);
    }
  }, []);

  /* CYBRAXIS_HYBRID_ADAPTIVE_CHECKPOINTS_START
     Immediate adaptive checkpoints are rule-triggered from learner state,
     while the AI mentor remains available for requested and richer guidance.
     This protects scenario truth and gives reliable visible adaptivity.
  */
  const getAdaptiveCheckpointFacts = useCallback(() => {
    const stageName = String(
      currentScenarioStage?.name ||
        currentScenarioStage?.title ||
        stageId ||
        "current stage"
    ).trim();

    const selectedNodeLabel = String(
      selectedNodeId ||
        selectedAlert?.relatedNode ||
        selectedAlert?.related_node ||
        selectedAlert?.sourceIp ||
        selectedAlert?.source_ip ||
        "the currently selected asset"
    ).trim();

    const dimensionLabel = value =>
      String(value || "")
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const isDimensionCovered = dimension => {
      if (!dimension) return false;

      const directCoverage =
        investigationCoverage?.[dimension] ||
        investigationCoverage?.dimensions?.[dimension] ||
        investigationCoverage?.completed?.[dimension];

      const targetCoverage =
        investigationTargetCoverage?.[dimension] ||
        investigationTargetCoverage?.dimensions?.[dimension] ||
        investigationTargetCoverage?.completed?.[dimension];

      return Boolean(directCoverage || targetCoverage);
    };

    const missingDimensions = (Array.isArray(requiredCoverageDimensions)
      ? requiredCoverageDimensions
      : [])
      .filter(dimension => !isDimensionCovered(dimension))
      .map(dimensionLabel)
      .filter(Boolean);

    const expectedActionLabels = (Array.isArray(stageExpectedActions)
      ? stageExpectedActions
      : [])
      .map(action =>
        String(
          action?.label ||
            action?.name ||
            action?.action ||
            action?.id ||
            action ||
            ""
        ).trim()
      )
      .filter(Boolean);

    const scenarioFocus = String(
      currentScenarioStage?.mentor?.stage_hint ||
        currentScenarioStage?.mentor?.focus ||
        currentScenarioStage?.description ||
        "connect the evidence before choosing a response"
    )
      .replace(/\s+/g, " ")
      .trim();

    return {
      stageName,
      selectedNodeLabel,
      missingDimensions,
      missingText: missingDimensions.length
        ? missingDimensions.slice(0, 3).join(", ")
        : "the required evidence dimensions",
      expectedActionText: expectedActionLabels.length
        ? expectedActionLabels.slice(0, 2).join(" then ")
        : "the next response action",
      scenarioFocus,
      stageId: String(stageId || "current-stage"),
    };
  }, [
    currentScenarioStage,
    stageId,
    selectedNodeId,
    selectedAlert,
    investigationCoverage,
    investigationTargetCoverage,
    requiredCoverageDimensions,
    stageExpectedActions,
  ]);

  const emitAdaptiveCheckpointHint = useCallback((pattern, detail = {}) => {
    const facts = getAdaptiveCheckpointFacts();
    const now = Date.now();
    const patternKey = String(pattern || "checkpoint");
    const gateKey = [facts.stageId, patternKey, detail.actionId || "stage"].join(":");
    const previousAt = adaptiveCheckpointGateRef.current.get(gateKey) || 0;

    const cooldownMs = Number.isFinite(Number(detail.cooldownMs))
      ? Number(detail.cooldownMs)
      : patternKey === "stage_start"
        ? 45000
        : 9000;

    if (previousAt && now - previousAt < cooldownMs) return;
    adaptiveCheckpointGateRef.current.set(gateKey, now);

    if (adaptiveCheckpointGateRef.current.size > 60) {
      adaptiveCheckpointGateRef.current = new Map(
        Array.from(adaptiveCheckpointGateRef.current.entries()).slice(-30)
      );
    }

    const attemptedAction = String(
      detail.actionLabel || detail.actionId || facts.expectedActionText
    ).trim();

    const templateSeed = [
      facts.stageId,
      patternKey,
      facts.selectedNodeLabel,
      facts.missingText,
      attemptedAction,
      advisorVisibleMentorHints.length,
      wrongActionCount,
    ].join("|");

    const templateIndex = Array.from(templateSeed).reduce(
      (total, character) => total + character.charCodeAt(0),
      0
    );

    const templates = {
      stage_start: [
        `In ${facts.stageName}, start by linking the alert to ${facts.selectedNodeLabel} and confirm ${facts.missingText} before choosing a response.`,
        `${facts.stageName} needs evidence-driven reasoning: check ${facts.missingText}, then decide whether ${facts.selectedNodeLabel} is part of the attack path.`,
        `For this stage, keep the investigation cycle active. Focus on ${facts.missingText} before moving from analysis to response.`,
      ],
      investigation_progress: [
        `Good investigation progress. Now connect ${facts.selectedNodeLabel} to ${facts.missingText} so the response is based on evidence, not only suspicion.`,
        `You have collected some evidence in ${facts.stageName}. Before acting, check whether ${facts.missingText} is still missing.`,
        `Pause and interpret the evidence path: does ${facts.selectedNodeLabel} explain the stage activity, and is ${facts.missingText} covered?`,
      ],
      premature_response: [
        `That response may be early. Before ${attemptedAction}, confirm ${facts.missingText} for ${facts.selectedNodeLabel}.`,
        `Containment or blocking should follow evidence. In ${facts.stageName}, review ${facts.missingText} before committing to ${attemptedAction}.`,
        `The selected response needs stronger support. Validate ${facts.selectedNodeLabel}, ${facts.missingText}, and the likely path before acting.`,
      ],
      wrong_action: [
        `This action does not match the strongest evidence yet. Re-check ${facts.selectedNodeLabel} and compare it with ${facts.missingText}.`,
        `The response choice looks misaligned with the current stage. Return to ${facts.missingText} before selecting the next action.`,
        `Use the investigation cycle here: confirm identity, activity, and controls around ${facts.selectedNodeLabel} before another response.`,
      ],
      sequence_check: [
        `Check the action order. In ${facts.stageName}, ${facts.expectedActionText} should follow the missing evidence review, not replace it.`,
        `The next response should follow the confirmed path. Review ${facts.missingText}, then continue with ${facts.expectedActionText}.`,
        `Sequence matters here. Tie ${facts.selectedNodeLabel} to the evidence path before moving to ${facts.expectedActionText}.`,
      ],
    };

    const options = templates[patternKey] || templates.investigation_progress;
    const message = options[templateIndex % options.length];

    addMentorHint(message, "AI_AUTO_CHECKPOINT");
  }, [
    addMentorHint,
    advisorVisibleMentorHints.length,
    getAdaptiveCheckpointFacts,
    wrongActionCount,
  ]);

  useEffect(() => {
    if (!currentScenarioStage || currentStageScoreSummary) return;

    const timer = window.setTimeout(() => {
      emitAdaptiveCheckpointHint("stage_start", { cooldownMs: 45000 });
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [currentScenarioStage, currentStageScoreSummary, emitAdaptiveCheckpointHint]);

  useEffect(() => {
    const investigationCount = Array.isArray(investigationEvents)
      ? investigationEvents.length
      : 0;

    if (investigationCount <= adaptiveLastInvestigationCountRef.current) return;
    adaptiveLastInvestigationCountRef.current = investigationCount;

    if (investigationCount >= 2 && !currentStageScoreSummary) {
      emitAdaptiveCheckpointHint("investigation_progress", { cooldownMs: 10000 });
    }
  }, [
    investigationEvents,
    currentStageScoreSummary,
    emitAdaptiveCheckpointHint,
  ]);

  useEffect(() => {
    const actionCount = Array.isArray(stageActionHistory)
      ? stageActionHistory.length
      : 0;

    if (actionCount <= adaptiveLastStageActionCountRef.current) return;
    adaptiveLastStageActionCountRef.current = actionCount;

    if (currentStageScoreSummary) return;

    const facts = getAdaptiveCheckpointFacts();
    const hasMissingEvidence = facts.missingDimensions.length > 0;

    if (hasMissingEvidence) {
      emitAdaptiveCheckpointHint("premature_response", { cooldownMs: 9000 });
    } else {
      emitAdaptiveCheckpointHint("sequence_check", { cooldownMs: 12000 });
    }
  }, [
    stageActionHistory,
    currentStageScoreSummary,
    emitAdaptiveCheckpointHint,
    getAdaptiveCheckpointFacts,
  ]);

  useEffect(() => {
    const currentWrongCount = Number(wrongActionCount || 0);

    if (currentWrongCount <= adaptiveLastWrongActionCountRef.current) return;
    adaptiveLastWrongActionCountRef.current = currentWrongCount;

    emitAdaptiveCheckpointHint("wrong_action", { cooldownMs: 7000 });
  }, [wrongActionCount, emitAdaptiveCheckpointHint]);
  /* CYBRAXIS_HYBRID_ADAPTIVE_CHECKPOINTS_END */
  const recordAiIntervention = useCallback((decision = {}, meta = {}) => {
    const record = createAiInterventionRecord(decision, {
      ...meta,
      scenarioId: scenario?.scenario_id || "unknown-scenario",
    });

    aiInterventionHistoryRef.current = [
      ...aiInterventionHistoryRef.current,
      record,
    ].slice(-30);

    try {
      window.localStorage.setItem(
        "cybraxisAiInterventionHistory",
        JSON.stringify(aiInterventionHistoryRef.current)
      );
    } catch {}

    return record;
  }, [scenario]);


  const runBackendAdaptiveAi = useCallback(async (trigger, options = {}) => {
    const requestId = aiAdaptiveRequestRef.current + 1;
    aiAdaptiveRequestRef.current = requestId;

    setLatestAiAdaptiveDecision({
      provider: "cybraxis-ai-server",
      providerStatus: "pending",
      validatedByBackend: false,
      trigger,
      stageId,
      stageName: currentScenarioStage?.name || stageId,
      nextFocus: "activity/evidence",
      supportLevel: "low",
      misconceptionDetected: "none",
      progressionRecommendation: "continue_current_scenario",
      learnerFacingMessage: "Backend AI is analyzing the current learner state.",
    });

    setAiAdaptiveLoading(true);

    const factPack = buildAdaptiveLearnerFactPack({
      scenario,
      stage: currentScenarioStage,
      stageId,
      stageIndex: stageIdx,
      selectedNodeId,
      selectedAlert,
      displayedLogs,
      actionLogs,
      actionHistory: stageActionHistory,
      investigationCoverage,
      investigationTargetCoverage,
      requiredCoverageDimensions,
      mentorGuidanceProfile,
      stageScoreSummary: currentStageScoreSummary || latestStageScoreSummary,
      wrongActionCount,
      hintsRequested,
      stageTimerState,
      stageLocked,
      stageLockReason,
      trigger,
      reasonCodes: options.reasonCodes || [],
      wrongActions: options.wrongActions || [],
    });

    try {
      const decision = await requestAdaptiveIntervention(factPack);

      if (requestId !== aiAdaptiveRequestRef.current) return false;

      const enrichedDecision = {
        ...decision,
        trigger,
        stageId: factPack.stageId,
        stageName: factPack.currentStage?.name || factPack.stageId,
      };

      setLatestAiAdaptiveDecision(enrichedDecision);

      
      recordAiIntervention(enrichedDecision, {
        outcome: "live",
        trigger,
        stageId: factPack.stageId,
        stageName: factPack.currentStage?.name || factPack.stageId,
      });
            if (options.addHint !== false) {
        const serverMentorHintText = String(decision?.learnerFacingMessage || "").trim();
        const controlledAiHintText =
          serverMentorHintText ||
          cybraxisBuildControlledAiMentorHint({
            decision,
            stage: currentScenarioStage,
            stageId,
          });

        addMentorHint(
          controlledAiHintText,
          `AI_${String(decision.interventionType || "adaptive").toUpperCase()}`
        );
      }
      return true;
    } catch (error) {
      if (requestId !== aiAdaptiveRequestRef.current) return false;

      setLatestAiAdaptiveDecision({
        provider: "cybraxis-ai-server",
        providerStatus: "frontend_error",
        providerError: error?.message || String(error),
        validatedByBackend: false,
        trigger,
        stageId,
        stageName: currentScenarioStage?.name || stageId,
        nextFocus: "activity/evidence",
        supportLevel: "low",
        misconceptionDetected: "none",
        progressionRecommendation: "continue_current_scenario",
        learnerFacingMessage:
          "Backend AI could not be reached. The deterministic SOC Advisor fallback was used.",
      });

      return false;
    } finally {
      if (requestId === aiAdaptiveRequestRef.current) {
        setAiAdaptiveLoading(false);
      }
    }
  }, [
    scenario,
    currentScenarioStage,
    stageId,
    stageIdx,
    selectedNodeId,
    selectedAlert,
    displayedLogs,
    actionLogs,
    stageActionHistory,
    investigationCoverage,
    investigationTargetCoverage,
    requiredCoverageDimensions,
    mentorGuidanceProfile,
    currentStageScoreSummary,
    latestStageScoreSummary,
    wrongActionCount,
    hintsRequested,
    stageTimerState,
    stageLocked,
    stageLockReason,
    addMentorHint,
    recordAiIntervention,
  ]);

  const runAutomaticAiIntervention = useCallback((trigger, options = {}) => {
    if (aiAdaptiveLoadingRef.current) {
      const retryReasonCodes = Array.isArray(options.reasonCodes)
        ? options.reasonCodes
        : [];

      window.setTimeout(() => {
        if (aiAdaptiveLoadingRef.current) return;

        runBackendAdaptiveAi(trigger, {
          ...options,
          reasonCodes: retryReasonCodes,
          addHint: options.addHint !== false,
        });
      }, Number.isFinite(Number(options.retryMs)) ? Number(options.retryMs) : 900);

      return;
    }

    const reasonCodes = Array.isArray(options.reasonCodes)
      ? options.reasonCodes
      : [];

    const stageKey = stageId || currentScenarioStage?.id || "unknown-stage";
    const reasonKey = reasonCodes.join("|") || "general";
    const wrongKey = String(wrongActionCount || 0);
    const historyKey = String(stageActionHistory?.length || 0);
    /* CYBRAXIS_AUTO_VISIBLE_HINT_GATE_START */
    if (options.addHint !== false) {
      const now = Date.now();
      const cooldownMs = Number.isFinite(Number(options.visibleCooldownMs))
        ? Number(options.visibleCooldownMs)
        : 18000;

      if (aiAutoVisibleHintGateRef.current && now - aiAutoVisibleHintGateRef.current < cooldownMs) {
        return;
      }

      aiAutoVisibleHintGateRef.current = now;
    }
    /* CYBRAXIS_AUTO_VISIBLE_HINT_GATE_END */

    const autoKey = `${trigger}::${stageKey}::${reasonKey}::${wrongKey}::${historyKey}`;

    if (aiAutomaticInterventionRef.current.has(autoKey)) return;

    aiAutomaticInterventionRef.current.add(autoKey);

    window.setTimeout(() => {
      runBackendAdaptiveAi(trigger, {
        ...options,
        reasonCodes,
        addHint: options.addHint !== false,
      });
    }, Number.isFinite(Number(options.delayMs)) ? Number(options.delayMs) : 150);
  }, [
    aiAdaptiveLoading,
    stageId,
    currentScenarioStage,
    wrongActionCount,
    stageActionHistory,
    runBackendAdaptiveAi,
  ]);





  const addEngineMentorHint = useCallback((trigger, fallbackText = null) => {
    const context = getCurrentMentorContext();

    const mentorMessage = buildMentorMessage({
      trigger,
      context,
      fallbackText,
    });

    addMentorHint(mentorMessage.text, mentorMessage.trigger);

    logBackendParity("MENTOR ENGINE MESSAGE", mentorMessage);
  }, [
    getCurrentMentorContext,
    addMentorHint,
  ]);

  const applyBackendMentorGuidance = useCallback((backendResult, options = {}) => {
    const {
      suppressForAuthoritativeBlock = false,
      source = "action",
    } = options;

    if (suppressForAuthoritativeBlock) return null;

    const backendMentorHint = buildBackendMentorHint(backendResult);

    if (!backendMentorHint.shouldDisplay) {
      return backendMentorHint;
    }

    addMentorHint(backendMentorHint.text, backendMentorHint.trigger);

    logBackendParity("BACKEND MENTOR AUTHORITY", {
      source,
      backendMentorHint,
      guidance: backendResult?.guidance || null,
      adaptiveRuntime: backendResult?.adaptiveRuntime || null,
    });

    return backendMentorHint;
  }, [addMentorHint]);

  const applyBackendAdaptiveWarning = useCallback((backendResult, options = {}) => {
    const {
      suppressForAuthoritativeBlock = false,
      source = "action",
    } = options;

    if (suppressForAuthoritativeBlock) return null;

    const backendWarning = buildBackendAdaptiveWarning(backendResult);

    if (!backendWarning.shouldDisplay) {
      return backendWarning;
    }

    addMentorHint(
      backendWarning.message,
      `ADAPTIVE_WARNING_${backendWarning.level.toUpperCase()}`
    );

    logBackendParity("BACKEND ADAPTIVE WARNING AUTHORITY", {
      source,
      backendWarning,
      adaptiveRuntime: backendResult?.adaptiveRuntime || null,
    });

    /* CYBRAXIS_BACKEND_WARNING_AUTO_AI_START
       When the backend detects weak behavior, schedule exactly one visible
       adaptive AI review quickly. The wrong-action effect remains as fallback,
       while the visible cooldown prevents duplicate overlapping guidance.
    */
    if (source === "action") {
      const warningReasonCodes = Array.from(new Set([
        "backend_adaptive_warning",
        backendWarning?.reasonCode,
        backendWarning?.reason,
        backendWarning?.level ? "backend_" + backendWarning.level : null,
        backendResult?.adaptiveRuntime?.reasonCode,
        backendResult?.adaptiveRuntime?.classification,
        backendResult?.guidance?.reasonCode,
      ].filter(Boolean).map(String))).slice(0, 6);

      runAutomaticAiIntervention("auto_backend_adaptive_warning", {
        reasonCodes: warningReasonCodes,
        delayMs: 150,
        retryMs: 900,
        addHint: true,
        visibleCooldownMs: 7000,
      });
    }
    /* CYBRAXIS_BACKEND_WARNING_AUTO_AI_END */

    return backendWarning;
  }, [addMentorHint, runAutomaticAiIntervention]);

const applyBackendLogPacing = useCallback((backendResult, options = {}) => {
  const { source = "action" } = options;

  const pacing = buildBackendLogPacing(backendResult);

  backendLogPacingRef.current = pacing;
  setBackendLogPacing(pacing);

  logBackendParity("BACKEND LOG PACING AUTHORITY", {
    source,
    pacing,
    adaptiveRuntime: backendResult?.adaptiveRuntime || null,
  });

  return pacing;
}, []);

  const saveBackendEvent = useCallback((eventRecord) => {
    if (!backendSession?.id || !eventRecord) return;

    saveEvent(backendSession.id, eventRecord)
      .then(updatedSession => {
        setBackendSession(updatedSession);

        logBackendParity("BACKEND EVENT SAVED", {
          eventRecord,
          updatedSession,
        });
      })
      .catch(error => {
        console.error("BACKEND EVENT SAVE FAILED", error);
      });
  }, [
    backendSession,
  ]);

  useEffect(() => {
    if (!backendSession) return;
    if (!stageLocked) return;
    if (!currentStageScoreSummary) return;
    if (!stageId) return;

    const saveKey = `${backendSession.id}-${stageId}-${stageLockReason || "locked"}`;

    if (savedStageResultKeysRef.current.has(saveKey)) {
      return;
    }

    savedStageResultKeysRef.current.add(saveKey);

    const stageResultRecord = createStageResultRecord({
      sessionId: backendSession.id,
      scenarioId: scenario?.scenario_id || "unknown-scenario",

      stageId,
      stageIndex: stageIdx,
      stageName: currentScenarioStage?.name || stageId,

      passed: Boolean(currentStageScoreSummary?.passed),
      timedOut: Boolean(currentStageScoreSummary?.timedOut),
      lockReason: stageLockReason,

      scoreSummary: currentStageScoreSummary,
      guidanceProfile: mentorGuidanceProfile,
      investigationTargetCoverage,
      investigationCoverage,

      actionHistory: stageActionHistory,
      preferredActionOrder,
      wrongActionCount,
      hintsRequested,

      timeLimitSeconds:
        currentStageScoreSummary?.evaluation?.timeLimitSeconds ||
        currentScenarioStage?.time_limit_seconds ||
        currentScenarioStage?.timeLimitSeconds ||
        null,

      timeRemaining:
        currentStageScoreSummary?.evaluation?.timeRemaining ??
        stageTimeRemaining ??
        null,

      escalation: currentEscalation || null,
    });

    saveStageResult(backendSession.id, stageResultRecord)
      .then(updatedSession => {
        setBackendSession(updatedSession);

        logBackendParity("BACKEND STAGE RESULT SAVED", {
          stageResultRecord,
          updatedSession,
        });
      })
      .catch(error => {
        console.error("BACKEND STAGE RESULT SAVE FAILED", error);
      });
  }, [
    backendSession,
    stageLocked,
    currentStageScoreSummary,
    stageId,
    stageLockReason,
    stageIdx,
    currentScenarioStage,
    mentorGuidanceProfile,
    investigationTargetCoverage,
    investigationCoverage,
    stageActionHistory,
    wrongActionCount,
    hintsRequested,
    stageTimeRemaining,
    currentEscalation,
    preferredActionOrder,
  ]);

  useEffect(() => {
    lastAutoWrongActionCountRef.current = wrongActionCount || 0;
    lastAutoStageReviewKeyRef.current = "";
    aiAutomaticInterventionRef.current = new Set();
  }, [stageId]);



    useEffect(() => {
  if (!backendSession?.id) return;
  if (finalReportCreatedRef.current) return;

  const stageResults = backendSession.stageResults || [];
  const totalScenarioStages = scenario?.stages?.length || 0;

  if (totalScenarioStages === 0) return;
  if (stageResults.length < totalScenarioStages) return;

  finalReportCreatedRef.current = true;

  const baseFrontendFallbackReport = createFinalScenarioReport({
    session: backendSession,
    scenarioId: scenario?.scenario_id || "unknown-scenario",
    scenarioName: scenario?.name || "Untitled Scenario",
    stageResults,
  });

  const frontendFallbackReport = enrichFinalReportWithAiInsights(
    baseFrontendFallbackReport,
    aiInterventionHistoryRef.current
  );

  persistAiLearningProfile(frontendFallbackReport.aiLearningProfile);

  generateFinalReport(backendSession.id)
    .then(updatedSession => {
      const aiEnhancedBackendReport = enrichFinalReportWithAiInsights(
        updatedSession?.finalReport || frontendFallbackReport,
        aiInterventionHistoryRef.current
      );

      persistAiLearningProfile(aiEnhancedBackendReport.aiLearningProfile);

      const updatedSessionWithAi = {
        ...updatedSession,
        finalReport: aiEnhancedBackendReport,
      };

      setBackendSession(updatedSessionWithAi);

      logBackendParity("BACKEND FINAL REPORT GENERATED", {
        backendReport: updatedSession?.finalReport,
        frontendFallbackReport,
        backendTotalScore: updatedSession?.finalReport?.totalScore,
        frontendTotalScore: frontendFallbackReport.totalScore,
      });
    })
    .catch(error => {
      console.error(
        "BACKEND FINAL REPORT GENERATE FAILED; USING FRONTEND FALLBACK",
        error
      );

      finishSession(backendSession.id, frontendFallbackReport)
        .then(updatedSession => {
          const aiEnhancedFallbackReport = enrichFinalReportWithAiInsights(
            updatedSession?.finalReport || frontendFallbackReport,
            aiInterventionHistoryRef.current
          );

          persistAiLearningProfile(aiEnhancedFallbackReport.aiLearningProfile);

          setBackendSession({
            ...updatedSession,
            finalReport: aiEnhancedFallbackReport,
          });

          logBackendParity("FRONTEND FALLBACK FINAL REPORT SAVED", {
            frontendFallbackReport,
            updatedSession,
          });
        })
        .catch(fallbackError => {
          finalReportCreatedRef.current = false;
          console.error("FINAL REPORT FALLBACK SAVE FAILED", fallbackError);
        });
    });
}, [
  backendSession,
]);

  const resetIdleTimer = useCallback(() => {
    clearTimeout(idleRef.current);
    idleRef.current = setTimeout(() => {
      const hints = MENTOR_IDLE_HINTS;
      addMentorHint(hints[idleHintIdx.current % hints.length], 'IDLE');
      idleHintIdx.current++;
    }, 30000);
  }, [addMentorHint]);

  function getConsequenceBranchFromTrigger(trigger) {
    if (String(trigger || "").includes("CORRECT")) return "correct";
    if (String(trigger || "").includes("WRONG")) return "wrong";
    if (String(trigger || "").includes("TIMEOUT")) return "timeout";

    return "none";
  }

    const applyConsequence = useCallback(async (consequence, trigger) => {
  const requestedBranch = getConsequenceBranchFromTrigger(trigger);

  const frontendPreviewEffects = buildConsequenceEffects({
    consequence,
    selectedNodeId,
  });

  let appliedBranch = requestedBranch;
  let backendConsequenceResult = null;
  let effects = frontendPreviewEffects;

  if (backendSession?.id && currentScenarioStage?.id) {
    try {
      backendConsequenceResult = await evaluateConsequenceBackend({
        sessionId: backendSession.id,
        scenarioId: scenario?.scenario_id || scenario?.id || null,
        stageId: currentScenarioStage?.id || stageId || null,
        stageIndex: stageIdx,
        selectedNodeId,
        trigger,
        requestedBranch,
        consequence,
        frontendAppliedBranch: requestedBranch,
        frontendEffects: frontendPreviewEffects,
      });

      if (!backendConsequenceResult?.consequenceParity?.matches) {
        console.warn(
          "BACKEND CONSEQUENCE PARITY MISMATCH",
          backendConsequenceResult?.consequenceParity
        );
      }

      logBackendParity(
        "BACKEND CONSEQUENCE PARITY",
        backendConsequenceResult?.consequenceParity
      );

      const backendBranch =
        backendConsequenceResult?.backendConsequenceDecision?.branch;

      const backendEffects =
        backendConsequenceResult?.backendConsequenceDecision?.effects;

      if (
        backendBranch &&
        backendBranch !== "none" &&
        currentScenarioStage?.consequences?.[backendBranch]
      ) {
        appliedBranch = backendBranch;
      }

      if (backendEffects) {
        effects = backendEffects;
      }

      logBackendParity("BACKEND AUTHORITATIVE CONSEQUENCE BRANCH DECISION", {
        stageId,
        trigger,
        requestedBranch,
        backendBranch,
        appliedBranch,
      });

      logBackendParity("BACKEND AUTHORITATIVE CONSEQUENCE EFFECT DECISION", {
        stageId,
        trigger,
        appliedBranch,
        frontendPreviewEffects,
        backendEffects,
        appliedEffects: effects,
      });
    } catch (error) {
      console.warn("BACKEND CONSEQUENCE EFFECT AUTHORITY FAILED - FRONTEND FALLBACK USED", {
        stageId,
        trigger,
        error,
      });

      effects = frontendPreviewEffects;
    }
  }

  if (!effects) return null;

  if (effects.mentorFeedback) {
    addMentorHint(effects.mentorFeedback, trigger);
  }

  if (effects.actionLogMessage) {
    setActionLogs(prev => [
      ...prev,
      {
        id: `cons-${trigger}-${effects.timestamp}-${prev.length}`,
        time: effects.timestamp,
        msg: effects.actionLogMessage,
        type: 'action',
      },
    ]);
  }

  if (effects.nodeRuntimePatch) {
    setNodeRuntime(prev => {
      const currentNodeRuntime = prev[selectedNodeId] || {};

      return {
        ...prev,
        [selectedNodeId]: {
          ...currentNodeRuntime,
          status: effects.nodeRuntimePatch.status,
          activity:
            effects.nodeRuntimePatch.activity ||
            currentNodeRuntime.activity,
          interpretation:
            effects.nodeRuntimePatch.interpretation ||
            currentNodeRuntime.interpretation,
        },
      };
    });
  }

  return {
    effects,
    appliedBranch,
    backendConsequenceResult,
  };
}, [
  selectedNodeId,
  addMentorHint,
  backendSession,
  currentScenarioStage,
  stageId,
]);
  const evaluateTimeoutEscalationParity = useCallback(async (frontendDecision) => {
    if (!backendSession?.id || !currentScenarioStage?.id) {
      return null;
    }

    try {
      const result = await evaluateTimeoutBackend({
        sessionId: backendSession.id,
        scenarioId: scenario?.scenario_id || scenario?.id || null,
        stageId,
        stageIndex: stageIdx,
        totalStages: scenario?.stages?.length || 1,
        isLastStage,
        timestamp: frontendDecision?.timestamp || null,
        investigationTargetCoverage,
        actionHistory: stageActionHistory,
        preferredActionOrder,
        wrongActionCount,
        frontendDecision,
      });

      logBackendParity(
        "BACKEND TIMEOUT ESCALATION PARITY",
        result?.timeoutEscalationParity
      );

      if (!result?.timeoutEscalationParity?.matches) {
        console.warn(
          "BACKEND TIMEOUT ESCALATION PARITY MISMATCH",
          result?.timeoutEscalationParity
        );
      }

      return result?.backendTimeoutDecision || null;
    } catch (error) {
      console.warn("BACKEND TIMEOUT ESCALATION PARITY FAILED", {
        stageId,
        error,
      });

      return null;
    }
  }, [
    backendSession,
    currentScenarioStage,
    scenario,
    stageId,
    stageIdx,
    isLastStage,
    investigationTargetCoverage,
    stageActionHistory,
    preferredActionOrder,
    wrongActionCount,
  ]);
  const handleStageTimeout = useCallback(async () => {
    if (timeoutHandledRef.current || stageLocked) return;

    timeoutHandledRef.current = true;
    stageTransitionPendingRef.current = true;

    if (shouldLockStageOnTimeout(currentScenarioStage)) {
      setStageLocked(true);
      setStageLockReason(STAGE_LOCK_REASONS.TIMEOUT);
    }

    setStageTimerState(TIMER_STATES.EXPIRED);
    setStageTimeRemaining(0);

    const timeoutScoreSummary = calculateStageScoreSummary({
      stageId,
      passed: false,
      timedOut: true,
      investigationTargetCoverage,
      actionHistory: stageActionHistory,
      preferredActionOrder,
      timeLimitSeconds: getStageTimeLimit(currentScenarioStage),
      timeRemaining: 0,
      wrongActionCount,
      prematureContainmentCount: 0,
      wrongAbstractionLevelCount: 0,
    });

    setStageScoreSummaries(prev =>
        stableMergeAndPersistStageSummary(
          prev,
          timeoutScoreSummary,
          scenario,
          requestedScenarioId
        )
      );

    logBackendParity("TIMEOUT SCORE SUMMARY", timeoutScoreSummary);
    logBackendParity("MENTOR GUIDANCE PROFILE", mentorGuidanceProfile);

    addEngineMentorHint(
      MENTOR_TRIGGERS.TIMEOUT,
      getTimeoutFeedbackText(currentScenarioStage)
    );

    const timeoutLog = buildTimeoutLog(currentScenarioStage, stageId);

    if (timeoutLog) {
      setActionLogs(prev => [...prev, timeoutLog]);
    }

    const nextStageEscalation = getEscalationForNextStage({
      scenario,
      currentStageIndex: stageIdx,
      currentStage: currentScenarioStage,
      isLastStage,
    });

    const timeoutTimestamp = timeoutLog?.time || nowStr();

    const frontendTimeoutDecision = {
      stageId,
      stageIndex: stageIdx,
      timerState: TIMER_STATES.EXPIRED,
      timeRemaining: 0,
      lockStage: shouldLockStageOnTimeout(currentScenarioStage),
      lockReason: shouldLockStageOnTimeout(currentScenarioStage)
        ? STAGE_LOCK_REASONS.TIMEOUT
        : null,
      terminal: isTimeoutTerminal(currentScenarioStage, isLastStage),
      timeoutScoreInput: {
        stageId,
        passed: false,
        timedOut: true,
        investigationTargetCoverage,
        actionHistory: stageActionHistory,
        preferredActionOrder,
        timeLimitSeconds: getStageTimeLimit(currentScenarioStage),
        timeRemaining: 0,
        wrongActionCount,
        prematureContainmentCount: 0,
        wrongAbstractionLevelCount: 0,
      },
      mentorHint: {
        trigger: MENTOR_TRIGGERS.TIMEOUT,
        text: getTimeoutFeedbackText(currentScenarioStage),
      },
      timeoutLog: timeoutLog
        ? {
            msg: timeoutLog.msg,
            type: timeoutLog.type,
            severity: timeoutLog.severity,
          }
        : null,
      nextStageEscalation,
      degradedCompletion: isTimeoutTerminal(currentScenarioStage, isLastStage)
        ? {
            text: getDegradedCompletionText(currentScenarioStage),
            trigger: "COMPLETE_DEGRADED",
          }
        : null,
      transition: isTimeoutTerminal(currentScenarioStage, isLastStage)
        ? (
            isLastStage
              ? {
                  reason: "scenario_complete_degraded",
                  nextStageIndex: null,
                  label: "View Final Report",
                  showFinalReport: true,
                }
              : null
          )
        : {
            reason: STAGE_LOCK_REASONS.TIMEOUT,
            nextStageIndex: Math.min(stageIdx + 1, (scenario?.stages?.length || 1) - 1),
            label: "Continue to Escalated Stage",
            showFinalReport: false,
          },
      stageTransitionPending:
        !isTimeoutTerminal(currentScenarioStage, isLastStage) ||
        isLastStage,
      timestamp: timeoutTimestamp,
    };

    const backendTimeoutDecision =
      await evaluateTimeoutEscalationParity(frontendTimeoutDecision);

    const appliedTimeoutDecision =
      backendTimeoutDecision || frontendTimeoutDecision;

    if (appliedTimeoutDecision.lockStage) {
      setStageLocked(true);
      setStageLockReason(
        appliedTimeoutDecision.lockReason || STAGE_LOCK_REASONS.TIMEOUT
      );
    } else {
      setStageLocked(false);
      setStageLockReason(null);
    }

    stageTransitionPendingRef.current =
      Boolean(appliedTimeoutDecision.stageTransitionPending);

    logBackendParity("BACKEND AUTHORITATIVE TIMEOUT DECISION", {
      stageId,
      frontendTimeoutDecision,
      backendTimeoutDecision,
      appliedTimeoutDecision,
    });

    if (nextStageEscalation) {
      setStageEscalations(prev => ({
        ...prev,
        [nextStageEscalation.nextStageId]: nextStageEscalation.modifier,
      }));
    }

    if (appliedTimeoutDecision.terminal) {
  addMentorHint(
    getDegradedCompletionText(currentScenarioStage),
    "COMPLETE_DEGRADED"
  );

  if (isLastStage) {
    setPendingStageAdvance({
      reason: "scenario_complete_degraded",
      nextStageIndex: null,
      label: "View Final Report",
      showFinalReport: true,
    });
  } else {
    setPendingStageAdvance(null);
  }

  stageTransitionPendingRef.current = false;
  return;
}

    setPendingStageAdvance({
      reason: STAGE_LOCK_REASONS.TIMEOUT,
      nextStageIndex: Math.min(stageIdx + 1, (scenario?.stages?.length || 1) - 1),
      label: "Continue to Escalated Stage",
    });
  }, [
  stageLocked,
  currentScenarioStage,
  addEngineMentorHint,
  addMentorHint,
  stageId,
  stageIdx,
  isLastStage,
  scenario,
  investigationTargetCoverage,
  stageActionHistory,
  preferredActionOrder,
  wrongActionCount,
  mentorGuidanceProfile,
  evaluateTimeoutEscalationParity,
]);

  useEffect(() => {
    stageTransitionPendingRef.current = false;
    timeoutHandledRef.current = false;
    timerWarningIssuedRef.current = false;

    setSelectedAlert(null);
    setSelectedNodeId(null);
    setHlLogId(null);
    setResolvedAlerts(new Set());

    const initialRuntime = buildInitialNodeRuntime({
      scenario: SCENARIO,
      stageId,
      stageNodeContext: STAGE_NODE_CONTEXT,
    });

    const escalatedRuntime = applyEscalationToRuntime({
      initialRuntime,
      escalation: currentEscalation,
    });

    setNodeRuntime(escalatedRuntime);
    setBlockedConnections(new Set());
    setHighlightedEdges(new Set());
    setActionLogs([]);
    setStageScore(0);
    setCompletedStageActions(new Set());
    setStageActionHistory([]);
    setWrongActionCount(0);
    setHintsRequested(0);
    setPendingStageAdvance(null);

    setStageLocked(false);
    setStageLockReason(null);
    setStageTimerState(TIMER_STATES.NORMAL);
    setStageTimeRemaining(getStageTimeLimit(currentScenarioStage));

    const jsonLogEvents = jsonEvents.filter(event => event.type === 'log');
    const formattedLogSource = mergeEscalationLogs(jsonLogEvents, currentEscalation);

    const formattedJsonLogs = formattedLogSource.map((event, index) => ({
      id: event.id || `json-log-${stageIdx}-${index}`,
      time: event.time || nowStr(),
      msg: event.message,
      type: event.type || 'log',
      severity: event.severity || 'low',
    }));

    setDisplayedLogs([]);
    clearInterval(logRevealRef.current);

    let idx = 0;

logRevealRef.current = setInterval(() => {
  if (idx < formattedJsonLogs.length) {
    const pacing = backendLogPacingRef.current || {};
    const maxNewLogsPerTick =
      Number.isFinite(Number(pacing.maxNewLogsPerTick)) &&
      Number(pacing.maxNewLogsPerTick) > 0
        ? Math.max(1, Math.min(Number(pacing.maxNewLogsPerTick), 5))
        : 1;

    const nextLogs = formattedJsonLogs
      .slice(idx, idx + maxNewLogsPerTick)
      .filter(Boolean);

    setDisplayedLogs(prev => [...prev, ...nextLogs]);

    idx += nextLogs.length;

    logBackendParity("BACKEND LOG PACING APPLIED", {
      stageId,
      pacing,
      revealedThisTick: nextLogs.length,
      nextIndex: idx,
      totalLogs: formattedJsonLogs.length,
    });
  } else {
    clearInterval(logRevealRef.current);
  }
}, 2200);

    const stageHint = getEscalatedStageHint(
      currentScenarioStage,
      currentEscalation
    );

    // Stage-entry local hints disabled; Request Hint owns learner-facing mentor guidance.

    resetIdleTimer();

    return () => {
      clearInterval(logRevealRef.current);
      clearTimeout(idleRef.current);
    };
  }, [
    stageIdx,
    stageId,
    jsonEvents,
    currentScenarioStage,
    currentEscalation,
    addMentorHint,
    resetIdleTimer
  ]);

  useEffect(() => {
    clearInterval(timerIntervalRef.current);

    const limit = getStageTimeLimit(currentScenarioStage);
    if (!limit || stageLocked) return;

    timerIntervalRef.current = setInterval(() => {
      setStageTimeRemaining(prev => {
        const next = Math.max(prev - 1, 0);
        const warningSecond = getWarningSecond(currentScenarioStage);

        if (
          next <= warningSecond &&
          next > 0 &&
          !timerWarningIssuedRef.current
        ) {
          timerWarningIssuedRef.current = true;
          setStageTimerState(TIMER_STATES.WARNING);

          addEngineMentorHint(
            MENTOR_TRIGGERS.TIME_WARNING,
            getTimeoutWarningText(currentScenarioStage)
          );
        }

        if (next <= 0) {
          clearInterval(timerIntervalRef.current);
          handleStageTimeout();
        }

        return next;
      });
    }, 1000);

    return () => clearInterval(timerIntervalRef.current);
  }, [
    currentScenarioStage,
    stageLocked,
    addEngineMentorHint,
    handleStageTimeout
  ]);

  const goToStage = useCallback((idx) => {
  const maxIdx = (scenario?.stages?.length || 1) - 1;

  if (idx < 0 || idx > maxIdx) return;

  if (idx > stageIdx) {
    addMentorHint(
      "Future stages unlock only after completing the current stage.",
      "STAGE_LOCKED"
    );
    return;
  }

  const targetStage = scenario?.stages?.[idx];

  if (!targetStage?.id) return;

  if (!completedStages.has(targetStage.id)) {
    addMentorHint(
      "Only completed previous stages can be replayed.",
      "STAGE_LOCKED"
    );
    return;
  }

  if (replayedStageIds.has(targetStage.id)) {
    addMentorHint(
      "This stage has already been replayed once.",
      "STAGE_REPLAY_LIMIT"
    );
    return;
  }

  setReplayedStageIds(prev => {
    const next = new Set(prev);
    next.add(targetStage.id);
    return next;
  });

  setReplayReturnStageIndex(stageIdx);
  setStageIdx(idx);
}, [
  scenario,
  stageIdx,
  completedStages,
  replayedStageIds,
  addMentorHint,
]);

    const handleContinueStage = useCallback(async () => {
  if (!pendingStageAdvance) return;

  if (pendingStageAdvance.showFinalReport) {
    /* CYBRAXIS_FULL_SCENARIO_REPORT_OPEN_MERGE_START */
    try {
      const mergedStageSummariesForFullReport =
        getMergedStageScoreSummariesForReport(
          stageScoreSummaries,
          scenario,
          requestedScenarioId
        );

      const currentSessionStageCount = Array.isArray(stageScoreSummaries)
        ? stageScoreSummaries.length
        : 0;

      const backendReportStageCount =
        Number(backendSession?.finalReport?.summary?.totalStages || 0) ||
        (Array.isArray(backendSession?.finalReport?.stageBreakdown)
          ? backendSession.finalReport.stageBreakdown.length
          : 0);

      const shouldBuildFullScenarioReport =
        mergedStageSummariesForFullReport.length > Math.max(
          currentSessionStageCount,
          backendReportStageCount
        );

      if (shouldBuildFullScenarioReport) {
        const mergedStageResults = buildStageResultsFromScoreSummaries({
          summaries: mergedStageSummariesForFullReport,
          scenario,
          backendSession,
          requestedScenarioId,
          mentorGuidanceProfile,
          hintsRequested,
        });

        const baseMergedReport = createFinalScenarioReport({
          session: {
            ...(backendSession || {}),
            id: backendSession?.id || "frontend-merged-session",
            stageResults: mergedStageResults,
          },
          scenarioId:
            scenario?.scenario_id ||
            scenario?.id ||
            requestedScenarioId ||
            "unknown-scenario",
          scenarioName: scenario?.name || scenario?.title || "Current scenario",
          stageResults: mergedStageResults,
        });

        const mergedReport = enrichFinalReportWithAiInsights(baseMergedReport, []);

        persistAiLearningProfile(mergedReport.aiLearningProfile);

        setBackendSession(prev => ({
          ...(prev || backendSession || {}),
          id:
            prev?.id ||
            backendSession?.id ||
            "frontend-merged-session",
          scenario:
            prev?.scenario ||
            backendSession?.scenario ||
            {
              id:
                scenario?.scenario_id ||
                scenario?.id ||
                requestedScenarioId ||
                "unknown-scenario",
              name: scenario?.name || scenario?.title || "Current scenario",
            },
          stageResults: mergedStageResults,
          finalReport: mergedReport,
        }));

        markCurrentScenarioCompleteForDashboard();
      setFinalReportVisible(true);
        setPendingStageAdvance(null);
        stageTransitionPendingRef.current = false;
        return;
      }
    } catch (mergeReportError) {
      console.error("FULL SCENARIO REPORT MERGE FAILED", mergeReportError);
    }
    /* CYBRAXIS_FULL_SCENARIO_REPORT_OPEN_MERGE_END */
    if (backendSession?.finalReport) {
      markCurrentScenarioCompleteForDashboard();
      setFinalReportVisible(true);
      setPendingStageAdvance(null);
      stageTransitionPendingRef.current = false;
      return;
    }

    if (backendSession?.id) {
      try {
        const refreshedSession = await getSession(backendSession.id);

        if (refreshedSession?.finalReport) {
          setBackendSession(refreshedSession);
          markCurrentScenarioCompleteForDashboard();
      setFinalReportVisible(true);
          setPendingStageAdvance(null);
          stageTransitionPendingRef.current = false;
          return;
        }
      } catch (error) {
        console.error("FINAL REPORT REFRESH FAILED", error);
      }
    }

    /*
      Emergency-safe frontend report.
      This prevents the UI from getting stuck when backend stageResults are delayed
      or when the backend report generation does not finish before the user clicks.
    */
    try {
      const backendStageResults = Array.isArray(backendSession?.stageResults)
        ? backendSession.stageResults
        : [];

      /* CYBRAXIS_FULL_REPORT_FALLBACK_STAGE_OBJECT_FIX */
      const fullScenarioSummaries = cybraxisGetFullScenarioStageScores(
        stageScoreSummaries,
        scenario,
        requestedScenarioId
      );

      const localStageResults = (fullScenarioSummaries || []).map((summary, index) => {
        const matchingStage =
          scenario?.stages?.find(stage => stage?.id === summary?.stageId) ||
          scenario?.stages?.[index] ||
          {};

        const safeStage = {
          ...matchingStage,
          id:
            matchingStage?.id ||
            summary?.stageId ||
            "stage-" + String(index + 1),
          name:
            matchingStage?.name ||
            matchingStage?.title ||
            summary?.stageName ||
            "Stage " + String(index + 1),
          title:
            matchingStage?.title ||
            matchingStage?.name ||
            summary?.stageName ||
            "Stage " + String(index + 1),
        };

        return {
          sessionId: backendSession?.id || "frontend-fallback-session",
          scenarioId:
            scenario?.scenario_id ||
            scenario?.id ||
            requestedScenarioId ||
            "unknown-scenario",
          stage: cybraxisBuildSafeStage(
            typeof summary !== "undefined" ? summary : {},
            {},
            0
          ),
          stageId: cybraxisBuildSafeStage(
            typeof summary !== "undefined" ? summary : {},
            {},
            0
          ).id,
          stageIndex: Number.isFinite(Number(summary?.stageIndex))
            ? Number(summary.stageIndex)
            : index,
          stageName: cybraxisBuildSafeStage(
            typeof summary !== "undefined" ? summary : {},
            {},
            0
          ).name || cybraxisBuildSafeStage(
            typeof summary !== "undefined" ? summary : {},
            {},
            0
          ).title,
          passed: Boolean(summary?.passed),
          timedOut: Boolean(summary?.timedOut),
          scoreSummary: summary,
          guidanceProfile: mentorGuidanceProfile,
          wrongActionCount: summary?.wrongActionCount || 0,
          hintsRequested,
        };
      });

      const mergedStageResults =
        backendStageResults.length >= localStageResults.length
          ? backendStageResults
          : localStageResults;

      if (mergedStageResults.length === 0 && currentStageScoreSummary) {
        mergedStageResults.push({
          sessionId: backendSession?.id || "frontend-fallback-session",
          scenarioId:
            scenario?.scenario_id ||
            scenario?.id ||
            requestedScenarioId ||
            "unknown-scenario",
          stageId: stageId || currentScenarioStage?.id || "final-stage",
          stageIndex: stageIdx,
          stageName:
            currentScenarioStage?.name ||
            currentScenarioStage?.title ||
            stageId ||
            "Final stage",
          passed: Boolean(currentStageScoreSummary?.passed),
          timedOut: Boolean(currentStageScoreSummary?.timedOut),
          scoreSummary: currentStageScoreSummary,
          guidanceProfile: mentorGuidanceProfile,
          wrongActionCount,
          hintsRequested,
        });
      }

      const baseFallbackReport = createFinalScenarioReport({
        session: {
          ...(backendSession || {}),
          id: backendSession?.id || "frontend-fallback-session",
          stageResults: mergedStageResults,
        },
        scenarioId:
          scenario?.scenario_id ||
          scenario?.id ||
          requestedScenarioId ||
          "unknown-scenario",
        scenarioName: scenario?.name || scenario?.title || "Current scenario",
        stageResults: mergedStageResults,
      });

      const fallbackReport = enrichFinalReportWithAiInsights(
        baseFallbackReport,
        []
      );

      persistAiLearningProfile(fallbackReport.aiLearningProfile);

      setBackendSession(prev => ({
        ...(prev || backendSession || {}),
        id:
          prev?.id ||
          backendSession?.id ||
          "frontend-fallback-session",
        scenario:
          prev?.scenario ||
          backendSession?.scenario ||
          {
            id:
              scenario?.scenario_id ||
              scenario?.id ||
              requestedScenarioId ||
              "unknown-scenario",
            name: scenario?.name || scenario?.title || "Current scenario",
          },
        stageResults: mergedStageResults,
        finalReport: fallbackReport,
      }));

      markCurrentScenarioCompleteForDashboard();
      setFinalReportVisible(true);
      setPendingStageAdvance(null);
      stageTransitionPendingRef.current = false;
      return;
    } catch (fallbackError) {
      console.error("FRONTEND FINAL REPORT OPEN FALLBACK FAILED", fallbackError);
      addMentorHint(
        "Final report could not be opened yet. Check the console for the report generation error.",
        "REPORT_ERROR"
      );
      return;
    }
  }

  if (typeof pendingStageAdvance.nextStageIndex === "number") {
    setStageIdx(pendingStageAdvance.nextStageIndex);
  }

  setPendingStageAdvance(null);
  stageTransitionPendingRef.current = false;
}, [pendingStageAdvance, backendSession, addMentorHint]);

  useEffect(() => {
    const currentWrongCount = Number(wrongActionCount || 0);

    if (currentWrongCount <= 0) return;
    if (currentWrongCount <= lastAutoWrongActionCountRef.current) return;

    lastAutoWrongActionCountRef.current = currentWrongCount;

    const profileReasons = Array.isArray(mentorGuidanceProfile?.reasonCodes)
      ? mentorGuidanceProfile.reasonCodes
      : [];

    const detectedReason =
      profileReasons.find(reason =>
        ["premature_containment", "wrong_node_focus", "coverage_incomplete_before_response"].includes(reason)
      ) || "wrong_action";

    runAutomaticAiIntervention("auto_wrong_action_review", {
      reasonCodes: Array.from(new Set(["wrong_action", detectedReason, ...profileReasons])).slice(0, 6),
      wrongActions: stageActionHistory.slice(-4),
      delayMs: 150,
      addHint: true,
      visibleCooldownMs: 7000,
    });
  }, [
    wrongActionCount,
    mentorGuidanceProfile,
    stageActionHistory,
    runAutomaticAiIntervention,
  ]);

  useEffect(() => {
    if (!stageLocked) return;
    if (!currentStageScoreSummary) return;

    const reviewKey = [
      stageId,
      stageLockReason || "locked",
      currentStageScoreSummary?.passed ? "passed" : "not_passed",
      currentStageScoreSummary?.totalStageScore ?? "score_unknown",
    ].join("::");

    if (lastAutoStageReviewKeyRef.current === reviewKey) return;
    lastAutoStageReviewKeyRef.current = reviewKey;

    const profileReasons = Array.isArray(mentorGuidanceProfile?.reasonCodes)
      ? mentorGuidanceProfile.reasonCodes
      : [];

    const stageOutcomeReason = currentStageScoreSummary?.passed
      ? "stage_completed"
      : stageLockReason === "timeout"
      ? "stage_timeout"
      : "stage_locked_incomplete";

    const weakCoverageReason =
      investigationTargetCoverage?.allRequiredCoverageComplete === false
        ? "coverage_incomplete_before_response"
        : null;

    runAutomaticAiIntervention("auto_stage_review", {
      reasonCodes: Array.from(new Set([
        stageOutcomeReason,
        weakCoverageReason,
        ...profileReasons,
      ].filter(Boolean))).slice(0, 7),
      delayMs: 800,
      addHint: false,
    });
  }, [
    stageLocked,
    currentStageScoreSummary,
    stageId,
    stageLockReason,
    mentorGuidanceProfile,
    investigationTargetCoverage,
    finalReportVisible,
    runAutomaticAiIntervention,
  ]);





  const handleAlertClick = useCallback((alert) => {
    if (stageLocked) return;

    setSelectedAlert(prev => (prev?.id === alert.id ? null : alert));
    setSelectedNodeId(alert.relatedNode || null);
    setHlLogId(alert.relatedLog || null);
    resetIdleTimer();

    // Alert selection updates context only; Request Hint owns learner-facing mentor guidance.
  }, [stageLocked, currentScenarioStage, resetIdleTimer, addMentorHint]);

  const handleNodeClick = useCallback((nodeId) => {
    if (stageLocked) return;

    setSelectedNodeId(prev => (prev === nodeId ? null : nodeId));
    setSelectedAlert(null);
    setHlLogId(null);
    resetIdleTimer();
  }, [stageLocked, resetIdleTimer]);

  const handleLogClick = useCallback((log) => {
    if (stageLocked) return;

    setHlLogId(prev => (prev === log.id ? null : log.id));
    const rel = alerts.find(a => a.relatedLog === log.id);
    if (rel) {
      setSelectedAlert(rel);
      setSelectedNodeId(rel.relatedNode);
    }
    resetIdleTimer();
  }, [stageLocked, alerts, resetIdleTimer]);

  const handleMentorOpen = useCallback(() => {
    setMentorOpen(true);
    setUnreadCount(0);
  }, []);

  const handleMentorClose = useCallback(() => {
    setMentorOpen(false);
  }, []);
  const handleRequestHint = useCallback(async () => {
    if (aiAdaptiveLoading) {
      return;
    }

    setHintsRequested(prev => prev + 1);
    resetIdleTimer();

    const requestCount = mentorHints.filter(
      hint => hint.trigger === "REQUEST" || hint.trigger === "REQUEST_FALLBACK"
    ).length;

    const fallbackHint =
      currentScenarioStage?.mentor?.stage_hint ||
      currentScenarioStage?.mentor_hint ||
      MENTOR_IDLE_HINTS[requestCount % MENTOR_IDLE_HINTS.length];

    const aiHandled = await runBackendAdaptiveAi("hint_requested", {
      reasonCodes: ["hint_requested"],
      addHint: true,
    });

    if (!aiHandled) {
      addMentorHint(
        fallbackHint ||
          "Review the current stage evidence first: confirm the alert, affected node, related logs, and required coverage before choosing a response.",
        "REQUEST_FALLBACK"
      );
    }
  }, [
    aiAdaptiveLoading,
    currentScenarioStage,
    mentorHints,
    addMentorHint,
    resetIdleTimer,
    runBackendAdaptiveAi,
  ]);
  const handleInvestigationAction = useCallback(async (action) => {
  if (stageLocked) {
    addEngineMentorHint(
      MENTOR_TRIGGERS.STAGE_LOCKED,
      getStageLockedMessage(stageLockReason)
    );
    return;
  }

  const actionId = action.id;

  const expectedActions = stageExpectedActions;
  const wrongActions = currentScenarioStage?.wrong_actions || [];

  const actionEvaluation = evaluateAction({
    actionId,
    actionIdToScenarioAction,
    expectedActions,
    wrongActions,
    completedStageActions,
  });

  if (
    backendSession?.id &&
    currentScenarioStage?.id &&
    !stageTransitionPendingRef.current &&
    !currentStageScoreSummary
  ) {
    const backendExpectedActions = buildBackendExpectedActionsForShadow({
      actionIdToScenarioAction,
      preferredActionOrder,
      currentScenarioStage,
      selectedNodeId,
    });

    const backendWrongActions = buildBackendWrongActionsForShadow({
      actionIdToScenarioAction,
      preferredActionOrder,
    });

    const normalizedStageForBackend = {
      ...currentScenarioStage,
      expected_actions: [
        ...backendExpectedActions,
        ...(Array.isArray(currentScenarioStage?.expected_actions)
          ? currentScenarioStage.expected_actions
          : []),
      ].filter((stageAction, index, actions) => {
        const actionKey =
          stageAction?.id ||
          stageAction?.action_id ||
          stageAction?.actionId;

        if (!actionKey) return false;

        return (
          actions.findIndex(existing => {
            const existingKey =
              existing?.id ||
              existing?.action_id ||
              existing?.actionId;

            return existingKey === actionKey;
          }) === index
        );
      }),

      wrong_actions: [
        ...backendWrongActions,
        ...(Array.isArray(currentScenarioStage?.wrong_actions)
          ? currentScenarioStage.wrong_actions
          : []),
      ].filter((stageAction, index, actions) => {
        const actionKey =
          stageAction?.id ||
          stageAction?.action_id ||
          stageAction?.actionId;

        if (!actionKey) return false;

        return (
          actions.findIndex(existing => {
            const existingKey =
              existing?.id ||
              existing?.action_id ||
              existing?.actionId;

            return existingKey === actionKey;
          }) === index
        );
      }),

      scoring: {
        ...(currentScenarioStage?.scoring || {}),
        preferred_action_order: backendExpectedActions.map(
          backendAction => backendAction.id
        ),
      },
    };

    try {
      const backendResult = await evaluateActionBackend({
        sessionId: backendSession.id,
        scenarioId: scenario?.scenario_id || scenario?.id || null,
        stageId: currentScenarioStage?.id || stageId || null,
        stageIndex: stageIdx,
        actionId,
        selectedNodeId,
        selectedTargetId: selectedNodeId,
        actionHistory: stageActionHistory,
        investigationEvents,
        runtime: {
          wrongActionCount,
          repeatedActionCount: 0,
          prematureActionCount: 0,
          wrongTargetCount: 0,
          hintsRequested,
          timeRemaining: stageTimeRemaining,
          timeLimitSeconds: getStageTimeLimit(currentScenarioStage),
          recentStageScores: stageScoreSummaries
            .map(summary => summary?.totalStageScore)
            .filter(score => Number.isFinite(Number(score))),
        },
      });

      const adaptedBackendEvaluation = adaptBackendActionEvaluationForFrontend({
        backendResult,
        actionId,
        actionIdToScenarioAction,
        completedStageActions,
      });

      const actionParity = compareActionEvaluationParity({
        actionId,
        stageId,
        selectedNodeId,
        frontendEvaluation: actionEvaluation,
        backendResult,
        backendAdapter: adaptedBackendEvaluation,
      });

      const resultWithAdapter = {
        ...backendResult,
        adaptedFrontendEvaluation: adaptedBackendEvaluation,
        actionParity,
      };

      setLatestBackendActionEvaluation(resultWithAdapter);

      if (!actionParity.matches) {
        console.warn(
          "BACKEND INVESTIGATION ACTION EVALUATION PARITY MISMATCH",
          actionParity
        );
      }

      logBackendParity("BACKEND INVESTIGATION ACTION EVALUATION PARITY", actionParity);

      logBackendParity("BACKEND INVESTIGATION ACTION EVALUATION SHADOW", {
        actionId,
        stageId,
        selectedNodeId,
        frontend: {
          scenarioAction: actionEvaluation.scenarioAction,
          outcome: actionEvaluation.outcome,
          isExpectedAction: actionEvaluation.isExpectedAction,
          isWrongAction: actionEvaluation.isWrongAction,
          isNewCorrectAction: actionEvaluation.isNewCorrectAction,
          stageLocked,
          wrongActionCount,
          hintsRequested,
          stageTimeRemaining,
        },
        backend: {
          classification: backendResult?.actionEvaluation?.classification,
          reasonCode: backendResult?.actionEvaluation?.reasonCode,
          accepted: backendResult?.actionEvaluation?.accepted,
          guidanceTrigger: backendResult?.guidance?.trigger,
          guidanceSeverity: backendResult?.guidance?.severity,
          supportLevel: backendResult?.adaptiveRuntime?.supportLevel,
          hintSpecificity: backendResult?.adaptiveRuntime?.hintSpecificity,
          warningLevel: backendResult?.adaptiveRuntime?.warningIntensity?.level,
          logPacing: backendResult?.adaptiveRuntime?.logPacing?.level,
          coveragePercent: backendResult?.coverageResult?.coveragePercent,
          coverageComplete:
            backendResult?.coverageResult?.allRequiredCoverageComplete,
        },
        adapter: adaptedBackendEvaluation,
        parity: actionParity,
        fullResult: backendResult,
      });

            applyBackendMentorGuidance(backendResult, {
        source: "investigation_action",
      });

            applyBackendAdaptiveWarning(backendResult, {
        source: "investigation_action",
      });

      applyBackendLogPacing(backendResult, {
  source: "investigation_action",
});

    } catch (error) {
      console.warn("BACKEND INVESTIGATION ACTION EVALUATION FAILED", {
        actionId,
        stageId,
        error,
      });
    }
  }

  const event = createInvestigationEvent({
    stageId,
    dimension: action.dimension,
    actionId: action.id,
    label: action.label,
    targetType: selectedNodeId ? "node" : selectedAlert ? "alert" : "none",
    targetId: selectedNodeId || selectedAlert?.id || null,
    relatedAlertId: selectedAlert?.id || null,
    relatedLogId: selectedAlert?.relatedLog || null,
  });

  setInvestigationEvents(prev => addInvestigationEvent(prev, event));

  const backendInvestigationRecord = createInvestigationEventRecord({
    sessionId: backendSession?.id || null,
    scenarioId: scenario?.scenario_id || "unknown-scenario",
    stageId,
    stageIndex: stageIdx,
    investigationEvent: event,
  });

  saveBackendEvent(backendInvestigationRecord);

  resetIdleTimer();
}, [
  stageLocked,
  stageLockReason,
  stageId,
  stageIdx,
  selectedNodeId,
  selectedAlert,
  backendSession,
  scenario,
  currentScenarioStage,
  currentStageScoreSummary,
  completedStageActions,
  actionIdToScenarioAction,
  stageExpectedActions,
  preferredActionOrder,
  stageActionHistory,
  investigationEvents,
  wrongActionCount,
  hintsRequested,
  stageTimeRemaining,
  stageScoreSummaries,
  saveBackendEvent,
  resetIdleTimer,
  addEngineMentorHint,
  applyBackendMentorGuidance,
  applyBackendAdaptiveWarning,
  applyBackendLogPacing,
]);

  function getBackendActionKind(actionId) {
  if (actionId === "inv-ip" || actionId === "inv-user") {
    return "investigation";
  }

  if (
    actionId === "block-ip" ||
    actionId === "isolate" ||
    actionId === "disable-account" ||
    actionId === "reset-password"
  ) {
    return "response";
  }

  return "unknown";
}

function getBackendActionTargets(actionId, stage) {
  if (actionId === "block-ip") {
    return [
      ...(stage?.network_risk?.external_node_ids || []),
      ...(stage?.external_nodes || []),
      ...(stage?.containment_targets || []),
      ...(stage?.primary_targets || []),
    ].filter(Boolean);
  }

  if (actionId === "isolate") {
    return [
      ...(stage?.network_risk?.source_node_ids || []),
      ...(stage?.source_nodes || []),
      ...(stage?.containment_targets || []),
      ...(stage?.primary_targets || []),
    ].filter(Boolean);
  }

  return [];
}

function buildBackendExpectedActionsForShadow({
  actionIdToScenarioAction,
  preferredActionOrder,
  currentScenarioStage,
  selectedNodeId,
}) {
  const order =
    Array.isArray(preferredActionOrder) && preferredActionOrder.length > 0
      ? preferredActionOrder
      : Object.values(actionIdToScenarioAction || {});

  return Object.entries(actionIdToScenarioAction || {})
  .filter(([, scenarioAction]) => order.includes(scenarioAction))
  .map(([actionId, scenarioAction]) => ({
    id: actionId,
    action_id: actionId,
    actionId,
    label: scenarioAction,
    name: scenarioAction,
    scenarioAction,
    scenario_action: scenarioAction,
    kind: getBackendActionKind(actionId),
    feedback: `${scenarioAction} accepted by frontend scenario mapping.`,
    target_ids: getBackendActionTargets(
      actionId,
      currentScenarioStage
    ),
  }));
}

function buildBackendWrongActionsForShadow({
  actionIdToScenarioAction,
  preferredActionOrder,
}) {
  const order =
    Array.isArray(preferredActionOrder) && preferredActionOrder.length > 0
      ? preferredActionOrder
      : [];

  return Object.entries(actionIdToScenarioAction || {})
    .filter(([, scenarioAction]) => !order.includes(scenarioAction))
    .map(([actionId, scenarioAction]) => ({
      id: actionId,
      reason_code: "not_in_frontend_expected_order",
      feedback: `${scenarioAction} is not part of the current frontend expected action order.`,
    }));
}

function adaptBackendActionEvaluationForFrontend({
  backendResult,
  actionId,
  actionIdToScenarioAction,
  completedStageActions,
}) {
  const classification =
    backendResult?.actionEvaluation?.classification || "unknown";

  const accepted = Boolean(backendResult?.actionEvaluation?.accepted);
  const reasonCode = backendResult?.actionEvaluation?.reasonCode || null;
  const scenarioAction = actionIdToScenarioAction?.[actionId] || null;

  const isKnownScenarioAction = Boolean(scenarioAction);

  const isFailureClassification = [
    "wrong",
    "wrong_target",
    "irrelevant",
    "repeated",
  ].includes(classification);

  const isCoverageBlockedPremature =
    classification === "premature" &&
    reasonCode === "coverage_incomplete_before_response";

  const sequenceWarning =
    classification === "correct_with_warning" ||
    reasonCode === "action_out_of_sequence";

  const isWrongAction =
    isFailureClassification || isCoverageBlockedPremature;

  const isNewCorrectAction =
    accepted &&
    isKnownScenarioAction &&
    !completedStageActions.has(scenarioAction);

  let outcome = "neutral";

  if (classification === "correct") {
    outcome = "success";
  } else if (classification === "correct_with_warning") {
    outcome = "success_with_warning";
  } else if (classification === "premature") {
    outcome = "premature";
  } else if (isFailureClassification) {
    outcome = "failure";
  }

  return {
    source: "backend_shadow_adapter",
    actionId,
    scenarioAction,

    classification,
    reasonCode,
    accepted,
    outcome,

    isKnownScenarioAction,
    isWrongAction,
    isNewCorrectAction,

    sequenceWarning,
    coverageBlocked: isCoverageBlockedPremature,

    guidanceTrigger: backendResult?.guidance?.trigger || null,
    guidanceSeverity: backendResult?.guidance?.severity || null,

    supportLevel: backendResult?.adaptiveRuntime?.supportLevel || null,
    warningLevel:
      backendResult?.adaptiveRuntime?.warningIntensity?.level || null,
    coveragePercent: backendResult?.coverageResult?.coveragePercent ?? null,
    networkRole:
      backendResult?.networkRisk?.selectedNodeRisk?.role || null,
  };
}

  const buildBackendActionEvaluationPayload = useCallback((actionId) => {
  const backendExpectedActions = buildBackendExpectedActionsForShadow({
    actionIdToScenarioAction,
    preferredActionOrder,
    currentScenarioStage,
    selectedNodeId,
  });

  const backendWrongActions = buildBackendWrongActionsForShadow({
    actionIdToScenarioAction,
    preferredActionOrder,
  });

  const normalizedStageForBackend = {
    ...currentScenarioStage,
    expected_actions: [
  ...backendExpectedActions,
  ...(Array.isArray(currentScenarioStage?.expected_actions)
    ? currentScenarioStage.expected_actions
    : []),
].filter((action, index, actions) => {
  const actionKey = action?.id || action?.action_id || action?.actionId;
  if (!actionKey) return false;

  return (
    actions.findIndex(existing => {
      const existingKey =
        existing?.id || existing?.action_id || existing?.actionId;

      return existingKey === actionKey;
    }) === index
  );
}),

    wrong_actions: [
      ...backendWrongActions,
      ...(Array.isArray(currentScenarioStage?.wrong_actions)
        ? currentScenarioStage.wrong_actions
        : []),
    ].filter((action, index, actions) => {
      const actionKey = action?.id || action?.action_id || action?.actionId;
      if (!actionKey) return false;

      return (
        actions.findIndex(existing => {
          const existingKey =
            existing?.id || existing?.action_id || existing?.actionId;

          return existingKey === actionKey;
        }) === index
      );
    }),
    scoring: {
      ...(currentScenarioStage?.scoring || {}),
      preferred_action_order: backendExpectedActions.map(action => action.id),
    },
  };

  return {
    sessionId: backendSession?.id || null,
    scenarioId: scenario?.scenario_id || scenario?.id || null,
    stageId: currentScenarioStage?.id || stageId || null,
    stageIndex: stageIdx,
    actionId,
    selectedNodeId,
    selectedTargetId: selectedNodeId,
    actionHistory: stageActionHistory,
    investigationEvents,
    runtime: {
      wrongActionCount,
      repeatedActionCount: 0,
      prematureActionCount: 0,
      wrongTargetCount: 0,
      hintsRequested,
      timeRemaining: stageTimeRemaining,
      timeLimitSeconds: getStageTimeLimit(currentScenarioStage),
      recentStageScores: stageScoreSummaries
        .map(summary => summary?.totalStageScore)
        .filter(score => Number.isFinite(Number(score))),
    },
  };
}, [
  backendSession,
  scenario,
  currentScenarioStage,
  selectedNodeId,
  stageActionHistory,
  investigationEvents,
  wrongActionCount,
  hintsRequested,
  stageTimeRemaining,
  stageScoreSummaries,
  actionIdToScenarioAction,
  preferredActionOrder,
]);

  const evaluateRuntimeStateParity = useCallback(async (frontendDecision) => {
    if (!backendSession?.id || !frontendDecision?.actionId) {
      return null;
    }

    try {
      const result = await evaluateRuntimeStateBackend({
        sessionId: backendSession.id,
        scenarioId: scenario?.scenario_id || scenario?.id || null,
        actionId: frontendDecision.actionId,
        selectedNodeId: frontendDecision.selectedNodeId,
        selectedAlertId: frontendDecision.selectedAlertId,
        timestamp: frontendDecision.timestamp || null,
        frontendDecision,
      });

      if (!result?.runtimeStateParity?.matches) {
        console.warn(
          "BACKEND RUNTIME STATE PARITY MISMATCH",
          result?.runtimeStateParity
        );
      }

      logBackendParity(
        "BACKEND RUNTIME STATE PARITY",
        result?.runtimeStateParity
      );

      return result?.backendRuntimeDecision || null;
    } catch (error) {
      console.warn("BACKEND RUNTIME STATE PARITY FAILED", {
        actionId: frontendDecision.actionId,
        selectedNodeId: frontendDecision.selectedNodeId,
        error,
      });

      return null;
    }
  }, [backendSession]);
  const handleAction = useCallback(async (actionId) => {
    if (stageLocked) {
      addEngineMentorHint(
        MENTOR_TRIGGERS.STAGE_LOCKED,
        getStageLockedMessage(stageLockReason)
      );
      return;
    }


    if (stageTransitionPendingRef.current) {
      console.warn("Action ignored because stage transition is pending.");
      return;
    }

    const expectedActions = stageExpectedActions;
    const wrongActions = currentScenarioStage?.wrong_actions || [];

    const actionEvaluation = evaluateAction({
      actionId,
      actionIdToScenarioAction,
      expectedActions,
      wrongActions,
      completedStageActions,
    });

    const {
      scenarioAction,
      isWrongAction,
      isNewCorrectAction,
      outcome,
    } = actionEvaluation;

        let backendAuthoritativePrematureBlock = false;
let backendAuthoritativeWrongTargetBlock = false;
let backendAuthoritativeResult = null;

    if (
      backendSession?.id &&
      currentScenarioStage?.id &&
      !stageTransitionPendingRef.current &&
      !currentStageScoreSummary
    ) {
      const shadowPayload = buildBackendActionEvaluationPayload(actionId);

      try {
        const result = await evaluateActionBackend(shadowPayload);

        if (stageTransitionPendingRef.current) {
          return;
        }

        const adaptedBackendEvaluation = adaptBackendActionEvaluationForFrontend({
          backendResult: result,
          actionId,
          actionIdToScenarioAction,
          completedStageActions,
        });

        const actionParity = compareActionEvaluationParity({
          actionId,
          stageId,
          selectedNodeId,
          frontendEvaluation: actionEvaluation,
          backendResult: result,
          backendAdapter: adaptedBackendEvaluation,
        });

        const resultWithAdapter = {
          ...result,
          adaptedFrontendEvaluation: adaptedBackendEvaluation,
          actionParity,
        };

        setLatestBackendActionEvaluation(resultWithAdapter);

        backendAuthoritativeResult = result;

        backendAuthoritativePrematureBlock =
  result?.actionEvaluation?.classification === "premature" &&
  result?.actionEvaluation?.reasonCode ===
    "coverage_incomplete_before_response";

backendAuthoritativeWrongTargetBlock =
  result?.actionEvaluation?.classification === "wrong_target" &&
  result?.actionEvaluation?.reasonCode === "wrong_target";

        if (!actionParity.matches) {
          console.warn("BACKEND ACTION EVALUATION PARITY MISMATCH", actionParity);
        }

        logBackendParity("BACKEND ACTION EVALUATION PARITY", actionParity);

        logBackendParity("BACKEND ACTION EVALUATION SHADOW", {
          actionId,
          stageId,
          selectedNodeId,
          frontend: {
            scenarioAction: actionEvaluation.scenarioAction,
            outcome: actionEvaluation.outcome,
            isExpectedAction: actionEvaluation.isExpectedAction,
            isWrongAction: actionEvaluation.isWrongAction,
            isNewCorrectAction: actionEvaluation.isNewCorrectAction,
            stageLocked,
            wrongActionCount,
            hintsRequested,
            stageTimeRemaining,
          },
          backend: {
            classification: result?.actionEvaluation?.classification,
            reasonCode: result?.actionEvaluation?.reasonCode,
            accepted: result?.actionEvaluation?.accepted,
            guidanceTrigger: result?.guidance?.trigger,
            guidanceSeverity: result?.guidance?.severity,
            supportLevel: result?.adaptiveRuntime?.supportLevel,
            hintSpecificity: result?.adaptiveRuntime?.hintSpecificity,
            warningLevel: result?.adaptiveRuntime?.warningIntensity?.level,
            logPacing: result?.adaptiveRuntime?.logPacing?.level,
            networkRole: result?.networkRisk?.selectedNodeRisk?.role,
            coveragePercent: result?.coverageResult?.coveragePercent,
            coverageComplete: result?.coverageResult?.allRequiredCoverageComplete,
          },
          adapter: adaptedBackendEvaluation,
          parity: actionParity,
          fullResult: result,
        });

                  applyBackendMentorGuidance(result, {
            source: "response_action",
            suppressForAuthoritativeBlock:
              backendAuthoritativePrematureBlock ||
              backendAuthoritativeWrongTargetBlock,
          });

                    applyBackendAdaptiveWarning(result, {
            source: "response_action",
            suppressForAuthoritativeBlock:
              backendAuthoritativePrematureBlock ||
              backendAuthoritativeWrongTargetBlock,
          });

          applyBackendLogPacing(result, {
  source: "response_action",
});

      } catch (error) {
        console.warn("BACKEND ACTION EVALUATION SHADOW FAILED", {
          actionId,
          stageId,
          error,
        });
      }
    }

    if (
  backendAuthoritativePrematureBlock ||
  backendAuthoritativeWrongTargetBlock
)  {
  const backendClassification =
    backendAuthoritativeResult?.actionEvaluation?.classification || "blocked";

  const backendReasonCode =
    backendAuthoritativeResult?.actionEvaluation?.reasonCode || null;

  const blockedOutcome = backendAuthoritativeWrongTargetBlock
  ? "wrong_target"
  : "premature";

  const mentorTrigger = backendAuthoritativeWrongTargetBlock
  ? MENTOR_TRIGGERS.WRONG_ACTION
  : MENTOR_TRIGGERS.COVERAGE_INCOMPLETE;

  const blockMessage =
    backendAuthoritativeResult?.actionEvaluation?.message ||
    (
      backendAuthoritativeWrongTargetBlock
  ? "The selected node or target does not match the action objective."
  : currentScenarioStage?.mentor?.coverage_incomplete ||
    "Investigation coverage is incomplete. Validate required evidence before taking this response action."
    );

  setActionResult({
    action: scenarioAction || actionId,
    outcome: blockedOutcome,
  });

  setWrongActionCount(prev => prev + 1);
  setStageScore(prev => Math.max(prev - wrongActionPenalty, 0));
  setTotalScore(prev => Math.max(prev - wrongActionPenalty, 0));

  addEngineMentorHint(
    mentorTrigger,
    blockMessage
  );

  if (scenarioAction) {
    const blockedResponseRecord = createResponseActionEventRecord({
      sessionId: backendSession?.id || null,
      scenarioId: scenario?.scenario_id || "unknown-scenario",
      stageId,
      stageIndex: stageIdx,
      actionId,
      scenarioAction,
      selectedNodeId,
      selectedAlertId: selectedAlert?.id || null,
      outcome: blockedOutcome,
      scoreDelta: -wrongActionPenalty,
    });

    saveBackendEvent(blockedResponseRecord);
  }

  console.warn(
   backendAuthoritativeWrongTargetBlock
  ? "BACKEND AUTHORITATIVE WRONG TARGET BLOCK"
  : "BACKEND AUTHORITATIVE PREMATURE RESPONSE BLOCK",
    {
      actionId,
      stageId,
      selectedNodeId,
      classification: backendClassification,
      reasonCode: backendReasonCode,
      message: blockMessage,
    }
  );

  resetIdleTimer();
  return;
}

    const projectedActionHistory = scenarioAction
      ? [...stageActionHistory, scenarioAction]
      : [...stageActionHistory];

    if (scenarioAction) {
      setStageActionHistory(projectedActionHistory);

      setActionResult({
        action: scenarioAction,
        outcome,
      });

      if (isNewCorrectAction) {
        setCompletedStageActions(prev => new Set([...prev, scenarioAction]));
        setStageScore(prev => Math.min(prev + correctActionScore, maxScore));
        setTotalScore(prev => prev + correctActionScore);
      }

      if (isWrongAction) {
        setStageScore(prev => Math.max(prev - wrongActionPenalty, 0));
        setTotalScore(prev => Math.max(prev - wrongActionPenalty, 0));
      }
    }

    const ts = nowStr();
    resetIdleTimer();

    if (actionId === 'inv-ip' && selectedNodeId) {
      const frontendRuntimeDecision = buildFrontendRuntimeStateDecision({
        actionId,
        selectedNodeId,
        selectedAlertId: selectedAlert?.id || null,
        connections: SCENARIO.connections || [],
        timestamp: ts,
      });

      const backendRuntimeDecision =
        await evaluateRuntimeStateParity(frontendRuntimeDecision);

      const appliedRuntimeDecision =
        backendRuntimeDecision || frontendRuntimeDecision;

      applyBackendRuntimeStateDecisionToFrontend({
        runtimeDecision: appliedRuntimeDecision,
        setHighlightedEdges,
        setBlockedConnections,
        setResolvedAlerts,
        setHlLogId,
        setNodeRuntime,
        setActionLogs,
        addMentorHint,
      });

      logBackendParity("BACKEND AUTHORITATIVE RUNTIME STATE DECISION", {
        actionId,
        selectedNodeId,
        frontendRuntimeDecision,
        backendRuntimeDecision,
        appliedRuntimeDecision,
      });
    }
    if (scenarioAction) {
      const responseActionRecord = createResponseActionEventRecord({
        sessionId: backendSession?.id || null,
        scenarioId: scenario?.scenario_id || "unknown-scenario",
        stageId,
        stageIndex: stageIdx,
        actionId,
        scenarioAction,
        selectedNodeId,
        selectedAlertId: selectedAlert?.id || null,
        outcome: isWrongAction ? "failure" : "success",
        scoreDelta: isWrongAction ? -wrongActionPenalty : correctActionScore,
      });

      saveBackendEvent(responseActionRecord);
    }

    if (actionId === 'inv-user' && selectedNodeId) {
      const node = SCENARIO.nodes.find(n => n.id === selectedNodeId);
      if (node?.user) {
        const matchLog = allLogs.find(l => l.msg.toLowerCase().includes(node.user.toLowerCase()));
        if (matchLog) {
          setHlLogId(matchLog.id);
        }
      }

      const frontendRuntimeDecision = buildFrontendRuntimeStateDecision({
        actionId,
        selectedNodeId,
        selectedAlertId: selectedAlert?.id || null,
        connections: SCENARIO.connections || [],
        timestamp: ts,
      });

      const backendRuntimeDecision =
        await evaluateRuntimeStateParity(frontendRuntimeDecision);

      const appliedRuntimeDecision =
        backendRuntimeDecision || frontendRuntimeDecision;

      applyBackendRuntimeStateDecisionToFrontend({
        runtimeDecision: appliedRuntimeDecision,
        setHighlightedEdges,
        setBlockedConnections,
        setResolvedAlerts,
        setHlLogId,
        setNodeRuntime,
        setActionLogs,
        addMentorHint,
      });

      logBackendParity("BACKEND AUTHORITATIVE RUNTIME STATE DECISION", {
        actionId,
        selectedNodeId,
        frontendRuntimeDecision,
        backendRuntimeDecision,
        appliedRuntimeDecision,
      });
    }
    if (actionId === 'isolate' && selectedNodeId) {
    /* CYBRAXIS_ISOLATION_EDGE_DIRECT_FIX */
    setNodeRuntime(prev => ({
      ...prev,
      [selectedNodeId]: {
        ...(prev?.[selectedNodeId] || {}),
        status: "isolated",
        activity:
          prev?.[selectedNodeId]?.activity ||
          "Host isolated by analyst response action.",
        interpretation:
          prev?.[selectedNodeId]?.interpretation ||
          "Network connectivity has been restricted for containment.",
      },
    }));

    setBlockedConnections(prev => {
      const next = new Set(prev || []);
      (SCENARIO.connections || []).forEach(connection => {
        if (connection.from === selectedNodeId || connection.to === selectedNodeId) {
          next.add(connection.id);
        }
      });
      return next;
    });
      /* CYBRAXIS_DIRECT_ISOLATION_VISUAL_SAFETY_START */
      setNodeRuntime(prev => ({
        ...prev,
        [selectedNodeId]: {
          ...(prev?.[selectedNodeId] || {}),
          status: "isolated",
          activity:
            prev?.[selectedNodeId]?.activity ||
            "Host isolated by analyst response action.",
          interpretation:
            prev?.[selectedNodeId]?.interpretation ||
            "Network connectivity has been restricted for containment.",
        },
      }));

      setBlockedConnections(prev => {
        const next = new Set(prev || []);
        (SCENARIO.connections || []).forEach(connection => {
          if (connection.from === selectedNodeId || connection.to === selectedNodeId) {
            next.add(connection.id);
          }
        });
        return next;
      });
      /* CYBRAXIS_DIRECT_ISOLATION_VISUAL_SAFETY_END */
      const frontendRuntimeDecision = buildFrontendRuntimeStateDecision({
        actionId,
        selectedNodeId,
        selectedAlertId: selectedAlert?.id || null,
        connections: SCENARIO.connections || [],
        timestamp: ts,
      });

      const backendRuntimeDecision =
        await evaluateRuntimeStateParity(frontendRuntimeDecision);

      const appliedRuntimeDecision =
        backendRuntimeDecision || frontendRuntimeDecision;

      applyBackendRuntimeStateDecisionToFrontend({
        runtimeDecision: appliedRuntimeDecision,
        setHighlightedEdges,
        setBlockedConnections,
        setResolvedAlerts,
        setHlLogId,
        setNodeRuntime,
        setActionLogs,
        addMentorHint,
      });

      logBackendParity("BACKEND AUTHORITATIVE RUNTIME STATE DECISION", {
        actionId,
        selectedNodeId,
        frontendRuntimeDecision,
        backendRuntimeDecision,
        appliedRuntimeDecision,
      });
    }
    if (actionId === 'block-ip') {
      const frontendRuntimeDecision = buildFrontendRuntimeStateDecision({
        actionId,
        selectedNodeId,
        selectedAlertId: selectedAlert?.id || null,
        connections: SCENARIO.connections || [],
        timestamp: ts,
      });

      const backendRuntimeDecision =
        await evaluateRuntimeStateParity(frontendRuntimeDecision);

      const appliedRuntimeDecision =
        backendRuntimeDecision || frontendRuntimeDecision;

      applyBackendRuntimeStateDecisionToFrontend({
        runtimeDecision: appliedRuntimeDecision,
        setHighlightedEdges,
        setBlockedConnections,
        setResolvedAlerts,
        setHlLogId,
        setNodeRuntime,
        setActionLogs,
        addMentorHint,
      });

      logBackendParity("BACKEND AUTHORITATIVE RUNTIME STATE DECISION", {
        actionId,
        selectedNodeId,
        frontendRuntimeDecision,
        backendRuntimeDecision,
        appliedRuntimeDecision,
      });
    }
    if (actionId === 'ignore' && selectedAlert) {
      const frontendRuntimeDecision = buildFrontendRuntimeStateDecision({
        actionId,
        selectedNodeId,
        selectedAlertId: selectedAlert?.id || null,
        connections: SCENARIO.connections || [],
        timestamp: ts,
      });

      const backendRuntimeDecision =
        await evaluateRuntimeStateParity(frontendRuntimeDecision);

      const appliedRuntimeDecision =
        backendRuntimeDecision || frontendRuntimeDecision;

      applyBackendRuntimeStateDecisionToFrontend({
        runtimeDecision: appliedRuntimeDecision,
        setHighlightedEdges,
        setBlockedConnections,
        setResolvedAlerts,
        setHlLogId,
        setNodeRuntime,
        setActionLogs,
        addMentorHint,
      });

      logBackendParity("BACKEND AUTHORITATIVE RUNTIME STATE DECISION", {
        actionId,
        selectedNodeId,
        frontendRuntimeDecision,
        backendRuntimeDecision,
        appliedRuntimeDecision,
      });
    }
    if (scenarioAction && expectedActions.includes(scenarioAction)) {
      const stageEvaluation = evaluateStageCompletion({
        isNewCorrectAction,
        completedStageActionsCount: completedStageActions.size,
        currentStageScore: stageScore,
        correctActionScore,
        maxScore,
        passScore,
        minimumActionsToPass,
        preferredActionOrder,
        projectedActionHistory,
      });

      const actionDimensionById = {
        'inv-ip': 'connectivity',
        'inv-user': 'identity',
      };

      const currentActionDimension = actionDimensionById[actionId];

      const projectedInvestigationEvents =
        currentActionDimension && selectedNodeId
          ? [
              createInvestigationEvent({
                stageId,
                dimension: currentActionDimension,
                actionId,
                label: scenarioAction,
                targetType: 'node',
                targetId: selectedNodeId,
                relatedAlertId: selectedAlert?.id || null,
                relatedLogId: selectedAlert?.relatedLog || null,
              }),
              ...investigationEvents,
            ]
          : investigationEvents;

      const projectedTargetCoverage = getStageTargetCoverage(
        projectedInvestigationEvents,
        stageId,
        coverageTargetIds,
        requiredCoverageDimensions
      );

      const coverageSatisfied = projectedTargetCoverage.allRequiredCoverageComplete;
const frontendStagePassed = stageEvaluation.stagePassed && coverageSatisfied;

const frontendStageCompletion = {
  baseStagePassed: stageEvaluation.stagePassed,
  coverageSatisfied,
  finalStagePassed: frontendStagePassed,
  projectedCompletedActionsCount:
    stageEvaluation.projectedCompletedActionsCount,
  projectedStageScore: stageEvaluation.projectedStageScore,
  orderStatus: stageEvaluation.orderStatus,
  shouldLockOnSuccess: shouldLockStageOnSuccess(currentScenarioStage),
  transitionReady: frontendStagePassed,
};

let backendStageCompletionResult = null;
let stagePassed = frontendStagePassed;

if (backendSession?.id && currentScenarioStage?.id) {
  try {
    backendStageCompletionResult = await evaluateStageCompletionBackend({
      sessionId: backendSession.id,
      scenarioId: scenario?.scenario_id || scenario?.id || null,
      stageId: currentScenarioStage?.id || stageId || null,
      stageIndex: stageIdx,
      totalStages: scenario?.stages?.length || 1,

      isNewCorrectAction,
      completedStageActionsCount: completedStageActions.size,
      currentStageScore: stageScore,
      correctActionScore,
      maxScore,
      passScore,
      minimumActionsToPass,
      preferredActionOrder,
      projectedActionHistory,
      investigationTargetCoverage: projectedTargetCoverage,

      frontendStageCompletion,
    });

    if (!backendStageCompletionResult?.stageCompletionParity?.matches) {
      console.warn(
        "BACKEND STAGE COMPLETION PARITY MISMATCH",
        backendStageCompletionResult?.stageCompletionParity
      );
    }

    logBackendParity(
      "BACKEND STAGE COMPLETION PARITY",
      backendStageCompletionResult?.stageCompletionParity
    );

    stagePassed = Boolean(
      backendStageCompletionResult?.backendStageCompletion?.finalStagePassed
    );

    logBackendParity("BACKEND AUTHORITATIVE STAGE PASS DECISION", {
      stageId,
      frontendStagePassed,
      backendStagePassed: stagePassed,
      backendStageCompletion:
        backendStageCompletionResult?.backendStageCompletion || null,
    });
  } catch (error) {
    console.warn("BACKEND STAGE COMPLETION AUTHORITY FAILED - FRONTEND FALLBACK USED", {
      stageId,
      error,
    });

    stagePassed = frontendStagePassed;
  }
}

      if (stageEvaluation.stagePassed && !coverageSatisfied) {
        const coverageFallback =
          currentScenarioStage?.mentor?.coverage_incomplete ||
          `You have the right action sequence, but investigation coverage is incomplete. Coverage: ${projectedTargetCoverage.investigatedNodeCount}/${projectedTargetCoverage.suspiciousNodeCount}.`;

        const context = buildMentorContext({
          stage: currentScenarioStage,
          stageId,
          stageIndex: stageIdx,
          selectedNodeId,
          selectedAlert,
          investigationCoverage,
          investigationTargetCoverage: projectedTargetCoverage,
          stageScoreSummary: currentStageScoreSummary || latestStageScoreSummary,
          guidanceProfile: mentorGuidanceProfile,
          stageTimerState,
          stageLocked,
          stageLockReason,
          wrongActionCount,
          hintsRequested,
          escalation: currentEscalation,
        });

        const mentorMessage = buildMentorMessage({
          trigger: MENTOR_TRIGGERS.COVERAGE_INCOMPLETE,
          context,
          fallbackText: coverageFallback,
        });

        addMentorHint(mentorMessage.text, mentorMessage.trigger);

        logBackendParity("MENTOR ENGINE MESSAGE", mentorMessage);
      }

      if (stageEvaluation.orderStatus === 'correct') {
        addEngineMentorHint(
          MENTOR_TRIGGERS.ORDER_CORRECT,
          currentScenarioStage?.mentor?.correct_sequence ||
            'Good investigative sequence. You analyzed before acting.'
        );
      }

      if (stageEvaluation.orderStatus === 'wrong') {
        addEngineMentorHint(
          MENTOR_TRIGGERS.WRONG_ORDER,
          currentScenarioStage?.mentor?.wrong_order ||
            'Correct actions, but the order could be improved. Investigate before taking containment actions.'
        );
      }

      if (stagePassed) {
        stageTransitionPendingRef.current = true;

        const scoreSummary = calculateStageScoreSummary({
          stageId,
          passed: true,
          timedOut: false,
          investigationTargetCoverage: projectedTargetCoverage,
          actionHistory: projectedActionHistory,
          preferredActionOrder,
          timeLimitSeconds: getStageTimeLimit(currentScenarioStage),
          timeRemaining: stageTimeRemaining,
          wrongActionCount,
          prematureContainmentCount: 0,
          wrongAbstractionLevelCount: 0,
        });

        setStageScoreSummaries(prev =>
        stableMergeAndPersistStageSummary(
          prev,
          scoreSummary,
          scenario,
          requestedScenarioId
        )
      );

        logBackendParity("STAGE SCORE SUMMARY", scoreSummary);
        logBackendParity("MENTOR GUIDANCE PROFILE", mentorGuidanceProfile);

        const backendShouldLockOnSuccess =
  backendStageCompletionResult?.backendStageCompletion?.shouldLockOnSuccess;

const shouldLockStage =
  typeof backendShouldLockOnSuccess === "boolean"
    ? backendShouldLockOnSuccess
    : shouldLockStageOnSuccess(currentScenarioStage);

logBackendParity("BACKEND AUTHORITATIVE STAGE LOCK DECISION", {
  stageId,
  frontendShouldLockOnSuccess: shouldLockStageOnSuccess(currentScenarioStage),
  backendShouldLockOnSuccess,
  appliedShouldLockOnSuccess: shouldLockStage,
});

if (shouldLockStage) {
  setStageLocked(true);
  setStageLockReason(STAGE_LOCK_REASONS.COMPLETED);
}

        setStageTimerState(TIMER_STATES.COMPLETED);

        applyConsequence(correctConsequences, 'CONSEQUENCE_CORRECT');
        setCompletedStages(prev => new Set([...prev, stageId]));

        addEngineMentorHint(
          MENTOR_TRIGGERS.STAGE_SECURED,
          currentScenarioStage?.consequences?.correct?.mentor_feedback ||
            'Stage secured. Review your result summary before continuing.'
        );

        const backendTransition =
  backendStageCompletionResult?.backendStageCompletion?.transition || null;

const backendTransitionReady =
  Boolean(
    backendStageCompletionResult?.backendStageCompletion?.transitionReady
  );

const frontendTransition = stagePassed
  ? {
      reason: isLastStage ? "scenario_complete" : STAGE_LOCK_REASONS.COMPLETED,
      nextStageIndex: isLastStage
        ? null
        : Math.min(stageIdx + 1, (scenario?.stages?.length || 1) - 1),
      showFinalReport: isLastStage,
    }
  : null;

const appliedTransition =
  backendTransitionReady && backendTransition
    ? backendTransition
    : frontendTransition;

logBackendParity("BACKEND AUTHORITATIVE STAGE TRANSITION DECISION", {
  stageId,
  frontendTransition,
  backendTransitionReady,
  backendTransition,
  appliedTransition,
});

if (appliedTransition?.showFinalReport) {
  addMentorHint(
    'Final stage handled successfully. Review the stage result, then open the final scenario report.',
    'COMPLETE'
  );

  setPendingStageAdvance({
    reason: appliedTransition.reason || "scenario_complete",
    nextStageIndex: null,
    label: "View Final Report",
    showFinalReport: true,
  });

  stageTransitionPendingRef.current = false;
} else if (appliedTransition) {
  setPendingStageAdvance({
    reason: appliedTransition.reason || STAGE_LOCK_REASONS.COMPLETED,
    nextStageIndex:
      typeof appliedTransition.nextStageIndex === "number"
        ? appliedTransition.nextStageIndex
        : Math.min(stageIdx + 1, (scenario?.stages?.length || 1) - 1),
    label: "Continue to Next Stage",
  });
}
      }
    }

    if (isWrongAction) {
      setWrongActionCount(prev => prev + 1);
      applyConsequence(wrongConsequences, 'CONSEQUENCE_WRONG');

      addEngineMentorHint(
        MENTOR_TRIGGERS.WRONG_ACTION,
        'That action reduces your stage score. Reassess the evidence before proceeding.'
      );
    }

  }, [
    stageLocked,
    stageLockReason,
    stageExpectedActions,
    currentScenarioStage,
    actionIdToScenarioAction,
    completedStageActions,
    stageActionHistory,
    correctActionScore,
    maxScore,
    wrongActionPenalty,
    selectedNodeId,
    selectedAlert,
    resetIdleTimer,
    addMentorHint,
    allLogs,
    stageScore,
    passScore,
    minimumActionsToPass,
    preferredActionOrder,
    stageId,
    investigationEvents,
    coverageTargetIds,
    requiredCoverageDimensions,
    applyConsequence,
    correctConsequences,
    wrongConsequences,
    isLastStage,
    stageTimeRemaining,
    wrongActionCount,
    mentorGuidanceProfile,
    addEngineMentorHint,
    stageIdx,
    investigationCoverage,
    currentStageScoreSummary,
    latestStageScoreSummary,
    hintsRequested,
    currentEscalation,
    stageTimerState,
    backendSession,
    saveBackendEvent,
    buildBackendActionEvaluationPayload,
    applyBackendMentorGuidance,
    applyBackendAdaptiveWarning,
    applyBackendLogPacing,
    evaluateRuntimeStateParity,
  ]);

  const reportProgression =
  backendSession?.finalReport?.progression ||
  backendSession?.progression ||
  null;

const completedScenarioId =
  reportProgression?.currentScenarioId ||
  backendSession?.finalReport?.scenario?.id ||
  backendSession?.scenario?.id ||
  scenario?.scenario_id ||
  null;

const recommendedScenarioId =
  reportProgression?.recommendedNextScenarioId || null;

const recommendedScenarioIsPlayable =
  Boolean(
    recommendedScenarioId &&
    SCENARIO_BUNDLES[recommendedScenarioId] &&
    reportProgression?.recommendedScenarioAvailable
  );

const supportedAdvancePath =
  completedScenarioId === "external_recon_to_exfiltration_1" &&
  recommendedScenarioId === "silent_beacon_1";

const canAdvanceToRecommendedScenario =
  recommendedScenarioIsPlayable && supportedAdvancePath;



function cybraxisCanonicalScenarioLaunchId(scenarioId = "") {
  const id = String(scenarioId || "").trim().toLowerCase();

  if (
    id.includes("silent_beacon") ||
    id.includes("silent-beacon") ||
    id === "silent_beacon_1" ||
    id === "scenario2"
  ) {
    return "scenario2_silent_beacon";
  }

  if (
    id.includes("scenario1_variant_b") ||
    id.includes("external_recon_to_exfiltration_1b") ||
    id.includes("south_bridge")
  ) {
    return "external_recon_to_exfiltration_1b";
  }

  if (!id) return "";
  return scenarioId;
}

/* CYBRAXIS_FORCE_BRIEFING_NAVIGATION_START */
function cybraxisPrepareScenarioBriefingLaunch(nextScenarioId = "") {
  if (typeof window === "undefined" || !nextScenarioId) return;

  try {
    window.localStorage.setItem("cybraxisForceScenarioBriefing", nextScenarioId);
    window.localStorage.setItem("cybraxisScenarioBriefingMode", "1");
    window.localStorage.setItem("cybraxisScenarioBriefingScenarioId", nextScenarioId);

    [
      "cybraxisScenarioBriefingSeen:" + nextScenarioId,
      "cybraxisScenarioBriefingSkipped:" + nextScenarioId,
      "cybraxisBriefingSeen:" + nextScenarioId,
      "cybraxisBriefingSkipped:" + nextScenarioId,
    ].forEach(key => window.localStorage.removeItem(key));
  } catch {}
}
/* CYBRAXIS_FORCE_BRIEFING_NAVIGATION_END */

function handleContinueTrainingFromFinalReport(reportFromButton = null) {
  const report = reportFromButton || backendSession?.finalReport || {};
  const score = Number(report?.totalScore ?? 0);

  if (Number.isFinite(score) && score < 65) {
    handleReturnToMainMenu();
    return;
  }

  const currentScenarioId = cybraxisCanonicalScenarioLaunchId(
    report?.scenario?.id ||
    report?.scenarioId ||
    scenario?.scenario_id ||
    scenario?.id ||
    requestedScenarioId ||
    ""
  );

  if (currentScenarioId === "scenario2_silent_beacon") {
    handleReturnToMainMenu();
    return;
  }

  const nextScenarioId = "scenario2_silent_beacon";

  cybraxisPrepareScenarioBriefingLaunch(nextScenarioId);

  window.location.assign(
    window.location.pathname +
      "?scenario=" +
      encodeURIComponent(nextScenarioId) +
      "&briefing=1&forceBriefing=1"
  );
}

const handleAdvanceToRecommendedScenario = () => {
  if (!canAdvanceToRecommendedScenario) {
    alert("No playable recommended scenario is currently available.");
    return;
  }

  const nextUrl = `${window.location.pathname}?scenario=${encodeURIComponent(
    recommendedScenarioId
  )}`;

  window.location.assign(nextUrl);
};

  // CYBRAXIS_AUTH_GATE_START
  if (!authenticated) {
    return <AuthScreen onLogin={handleLogin} />;
  }
  // CYBRAXIS_AUTH_GATE_END


// CYBRAXIS_MAIN_MENU_ROUTE_START
  const menuQueryView =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("menu")
      : null;

  const mainMenuRouteActive =
    typeof window !== "undefined" &&
    !new URLSearchParams(window.location.search).get("scenario") &&
    !new URLSearchParams(window.location.search).get("remedy") &&
    window.sessionStorage.getItem("cybraxisPlayableRemedyMode") !== "true" &&
    window.localStorage.getItem("cybraxisPlayableRemedyMode") !== "true" &&
    window.sessionStorage.getItem("cybraxisRemediationMode") !== "true" &&
    window.localStorage.getItem("cybraxisRemediationMode") !== "true";

  if (mainMenuRouteActive) {
    return <MainMenu initialView={menuQueryView || "home"} />;
  }
  // CYBRAXIS_MAIN_MENU_ROUTE_END

// CYBRAXIS_SCENARIO_BRIEFING_ROUTE_START
  const cybraxisBriefingParams =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();

  const cybraxisBriefingScenarioId =
    cybraxisBriefingParams.get("scenario") || "";

  const cybraxisCanonicalBriefingScenarioId =
    cybraxisCanonicalScenarioLaunchId(cybraxisBriefingScenarioId);

  const cybraxisForceBriefingActive =
    typeof window !== "undefined" &&
    (
      cybraxisBriefingParams.get("forceBriefing") === "1" ||
      window.localStorage.getItem("cybraxisForceScenarioBriefing") === cybraxisBriefingScenarioId ||
      window.localStorage.getItem("cybraxisForceScenarioBriefing") === cybraxisCanonicalBriefingScenarioId
    );

  const scenarioBriefingRouteActive =
    typeof window !== "undefined" &&
    (cybraxisBriefingParams.get("briefing") === "1" || cybraxisForceBriefingActive) &&
    Boolean(cybraxisBriefingScenarioId) &&
    !cybraxisBriefingParams.get("remedy") &&
    window.sessionStorage.getItem("cybraxisPlayableRemedyMode") !== "true" &&
    window.localStorage.getItem("cybraxisPlayableRemedyMode") !== "true" &&
    window.sessionStorage.getItem("cybraxisRemediationMode") !== "true" &&
    window.localStorage.getItem("cybraxisRemediationMode") !== "true";

  if (scenarioBriefingRouteActive) {
    return (
      <ScenarioBriefing
        scenario={scenario}
        scenarioBundle={activeScenarioBundle}
        onContinue={() => {
          const params = new URLSearchParams(window.location.search);

          params.delete("briefing");
          params.delete("forceBriefing");

          try {
            window.localStorage.removeItem("cybraxisForceScenarioBriefing");
            window.localStorage.removeItem("cybraxisScenarioBriefingMode");
            window.localStorage.removeItem("cybraxisScenarioBriefingScenarioId");
          } catch {}

          const nextUrl = params.toString()
            ? window.location.pathname + "?" + params.toString()
            : window.location.pathname;

          window.location.assign(nextUrl);
        }}
      />
    );
  }
  // CYBRAXIS_SCENARIO_BRIEFING_ROUTE_END
// CYBRAXIS_PLAYABLE_REMEDY_ROUTE_START
  const remedyQueryScenarioId =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("remedy")
      : null;

  const playableRemedyModeActive =
    typeof window !== "undefined" &&
    (
      Boolean(remedyQueryScenarioId) ||
      window.sessionStorage.getItem("cybraxisPlayableRemedyMode") === "true" ||
      window.localStorage.getItem("cybraxisPlayableRemedyMode") === "true"
    );

  if (playableRemedyModeActive) {
    const readPlayableRemedyValue = (key, fallback = "") => {
      try {
        return window.sessionStorage.getItem(key) || window.localStorage.getItem(key) || fallback;
      } catch {
        return fallback;
      }
    };

    return (
      <PlayableRemedyScenario
        scenarioId={
          remedyQueryScenarioId ||
          readPlayableRemedyValue("cybraxisActiveScenarioId", "remedy_premature_containment_01")
        }
      />
    );
  }
  // CYBRAXIS_PLAYABLE_REMEDY_ROUTE_END

// CYBRAXIS_REMEDIATION_SCREEN_START
  const remediationModeActive =
    typeof window !== "undefined" &&
    (
      window.sessionStorage.getItem("cybraxisRemediationMode") === "true" ||
      window.localStorage.getItem("cybraxisRemediationMode") === "true"
    );

  if (remediationModeActive) {
    const readRemediationValue = (key, fallback = "") => {
      try {
        return window.sessionStorage.getItem(key) || window.localStorage.getItem(key) || fallback;
      } catch {
        return fallback;
      }
    };

    return (
      <RemediationTraining
        focusArea={readRemediationValue("cybraxisRemediationWeakness", "Sequence Quality")}
        scenarioName={readRemediationValue("cybraxisRemediationScenario", scenario?.name || "Current scenario")}
        previousScore={readRemediationValue("cybraxisRemediationScore", "")}
      />
    );
  }
  // CYBRAXIS_REMEDIATION_SCREEN_END


  // CYBRAXIS_FINAL_UI_HOME_HANDLER_START
  const handleReturnToMainMenu = () => {
    if (typeof window === "undefined") return;

    try {
      const transientKeys = [
        "cybraxisScenarioBriefingMode",
        "cybraxisPlayableRemedyMode",
        "cybraxisRemediationMode",
        "cybraxisRemediationReason",
        "cybraxisRemediationWeakness",
        "cybraxisRemediationScore",
        "cybraxisRemediationScenario",
      ];

      transientKeys.forEach((key) => {
        window.sessionStorage.removeItem(key);
        window.localStorage.removeItem(key);
      });

      window.sessionStorage.setItem("cybraxisReturnToMainMenu", "true");
      window.sessionStorage.setItem("cybraxisMainMenuMode", "true");
      window.localStorage.setItem("cybraxisMainMenuMode", "true");
    } catch {
      // Navigation should still continue even if storage is unavailable.
    }

    const homeUrl = window.location.origin + window.location.pathname + "?menu=home";
    window.location.assign(homeUrl);
  };
  // CYBRAXIS_FINAL_UI_HOME_HANDLER_END

if (finalReportVisible && backendSession?.finalReport) {
  return (
    <FinalScenarioReport
        report={stableBuildFullReportForRender({
          report: backendSession.finalReport,
          scenario,
          requestedScenarioId,
          backendSession,
          stageScoreSummaries,
          mentorGuidanceProfile,
          hintsRequested,
        })}
        onHome={handleReturnToMainMenu}
        onNextScenario={
          Number(backendSession.finalReport?.totalScore ?? 0) >= 65
            ? () => handleContinueTrainingFromFinalReport(backendSession.finalReport)
            : null
        }
        nextScenarioLabel={getFinalReportNextActionLabel(backendSession.finalReport)}
      onStartRemediation={(reportFromButton) => {
        const finalReport = reportFromButton || backendSession?.finalReport || {};

        const rawWeakness =
          finalReport?.aiLearningProfile?.primaryImprovementArea ||
          finalReport?.summary?.primaryImprovementArea ||
          finalReport?.summary?.primaryWeakness ||
          finalReport?.progression?.primaryWeakness ||
          "Sequence Quality";

        const focusArea = /coverage/i.test(String(rawWeakness))
          ? "Investigation Coverage"
          : /response/i.test(String(rawWeakness))
          ? "Response Quality"
          : /timing|timeout/i.test(String(rawWeakness))
          ? "Timing Efficiency"
          : "Sequence Quality";

        window.sessionStorage.setItem("cybraxisRemediationMode", "true");
        window.sessionStorage.setItem("cybraxisRemediationWeakness", focusArea);
        window.sessionStorage.setItem(
          "cybraxisRemediationScenario",
          String(finalReport?.scenario?.name || scenario?.name || "Current scenario")
        );
        window.sessionStorage.setItem(
          "cybraxisRemediationScore",
          String(finalReport?.totalScore ?? "")
        );

        window.localStorage.setItem("cybraxisRemediationMode", "true");
        window.localStorage.setItem("cybraxisRemediationWeakness", focusArea);
        window.localStorage.setItem(
          "cybraxisRemediationScenario",
          String(finalReport?.scenario?.name || scenario?.name || "Current scenario")
        );
        window.localStorage.setItem(
          "cybraxisRemediationScore",
          String(finalReport?.totalScore ?? "")
        );

        window.location.reload();
      }}
      onRestart={() => {
        [
          "cybraxisRemediationMode",
          "cybraxisRemediationReason",
          "cybraxisRemediationWeakness",
          "cybraxisRemediationScore",
          "cybraxisRemediationScenario"
        ].forEach((key) => {
          window.sessionStorage.removeItem(key);
          window.localStorage.removeItem(key);
        });

        window.location.reload();
      }}
    />
  );
}

  return (
    <div className="app" onMouseMove={resetIdleTimer} onKeyDown={resetIdleTimer}>
      <CampaignProgressBar
        currentStageIndex={stageIdx}
        completedStages={completedStages}
        replayedStageIds={replayedStageIds}
        killChainStages={scenario?.stages || []}
        onPrev={() => goToStage(stageIdx - 1)}
        onNext={() => goToStage(stageIdx + 1)}
        unreadMentor={unreadCount}
        mentorPulsing={mentorPulsing}
        onMentorClick={handleMentorOpen}
        stageTimeRemaining={stageTimeRemaining}
        stageTimerState={stageTimerState}
        stageLocked={stageLocked}
        stageLockReason={stageLockReason}
      />

      <div className={`mentor-status-bar ${mentorFlash ? 'mentor-status-bar--flash' : ''}`}>
        <div className="mentor-status-bar__label">SOC Advisor</div>
        <div className="mentor-status-bar__text">
          {latestMentorHint ? latestMentorHint.text : 'No advisor updates yet.'}
        </div>
      </div>

      <div className="app__workspace">
        <div className="app__col app__col--left">
          <AlertsPanel
            alerts={alerts}
            selectedAlert={selectedAlert}
            resolvedAlerts={resolvedAlerts}
            onAlertClick={handleAlertClick}
          />
        </div>

        <div className="app__col app__col--center">
          <div className="app__map-stage">
            <NetworkMap
              key={stageId}
              scenario={SCENARIO}
              attackEdges={atkEdges}
              nodeRuntime={nodeRuntime}
              blockedConnections={blockedConnections}
              highlightedEdges={highlightedEdges}
              suspiciousNodes={suspNodes}
              selectedNodeId={selectedNodeId}
              onNodeClick={handleNodeClick}
            />

            <StageResultOverlay
              visible={stageLocked && Boolean(currentStageScoreSummary)}
              stageScoreSummary={currentStageScoreSummary}
              mentorGuidanceProfile={mentorGuidanceProfile}
              stageLockReason={stageLockReason}
              pendingStageAdvance={pendingStageAdvance}
              onContinueStage={handleContinueStage}
            />
          </div>
        </div>

        <div className="app__col app__col--right">
          <ActionsPanel
            selectedAlert={selectedAlert}
            selectedNode={selectedNodeId}
            stageName={currentScenarioStage?.name}
            learningObjective={currentScenarioStage?.learning_objective}
            requiredDimensions={requiredCoverageDimensions}
            requiredTargets={coverageTargetIds}
            investigationCoverage={investigationCoverage}
            investigationTargetCoverage={investigationTargetCoverage}
            stageLocked={stageLocked}
            stageLockReason={stageLockReason}
            stageScoreSummary={currentStageScoreSummary}
            mentorGuidanceProfile={mentorGuidanceProfile}
            pendingStageAdvance={pendingStageAdvance}
            onContinueStage={handleContinueStage}
            onInvestigationAction={handleInvestigationAction}
            onAction={handleAction}
          />
          {SHOW_BACKEND_SHADOW_PANEL && latestBackendActionEvaluation && (
            <div className="panel backend-shadow-panel">
              <div className="panel-hdr">
                <span className="panel-title">BACKEND SHADOW EVALUATION</span>
              </div>

              <div className="backend-shadow-panel__body">
                <div>
                  <strong>Classification:</strong>{" "}
                  {latestBackendActionEvaluation.actionEvaluation?.classification || "unknown"}
                </div>

                <div>
                  <strong>Reason:</strong>{" "}
                  {latestBackendActionEvaluation.actionEvaluation?.reasonCode || "none"}
                </div>

                <div>
                  <strong>Guidance:</strong>{" "}
                  {latestBackendActionEvaluation.guidance?.trigger || "none"} /{" "}
                  {latestBackendActionEvaluation.guidance?.severity || "none"}
                </div>

                <div>
                  <strong>Support:</strong>{" "}
                  {latestBackendActionEvaluation.adaptiveRuntime?.supportLevel || "unknown"} /{" "}
                  {latestBackendActionEvaluation.adaptiveRuntime?.hintSpecificity || "unknown"}
                </div>

                <div>
                  <strong>Warning:</strong>{" "}
                  {latestBackendActionEvaluation.adaptiveRuntime?.warningIntensity?.level || "normal"}
                </div>

                <div>
                  <strong>Coverage:</strong>{" "}
                  {latestBackendActionEvaluation.coverageResult?.coveragePercent ?? 0}%
                </div>

                <div>
                  <strong>Network role:</strong>{" "}
                  {latestBackendActionEvaluation.networkRisk?.selectedNodeRisk?.role || "unknown"}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="app__logs">
          <LogsPanel
            logs={allLogs}
            highlightedLogId={hlLogId}
            onLogClick={handleLogClick}
          />
        </div>
      </div>

      <SocAdvisorPanel
        open={mentorOpen}
        onClose={handleMentorClose}
        currentStageIndex={stageIdx}
        killChainStages={KILL_CHAIN_STAGES}
        alerts={alerts}
        hints={advisorVisibleMentorHints}
        aiAdaptiveLoading={aiAdaptiveLoading}
        onRequestHint={handleRequestHint}
      />
    </div>
  );
}




