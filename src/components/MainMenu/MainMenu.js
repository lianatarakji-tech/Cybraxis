import React, { useMemo, useState, useEffect } from "react";
import {
  SCENARIO_BUNDLES,
  DEFAULT_SCENARIO_ID,
} from "../../data/scenarios/scenarioRegistry";
import "./MainMenu.css";

const FUNDAMENTAL_SECTIONS = [
  {
    id: "mindset",
    title: "SOC Investigation Mindset",
    tag: "Core behavior",
    summary: "Investigate first, respond second.",
    points: [
      "Start by identifying the suspicious source, target, and path.",
      "Use alerts, logs, nodes, and network paths together instead of relying on one clue.",
      "Blocking or isolating should happen after enough evidence is collected.",
      "A weak response can hide useful evidence or affect the wrong asset."
    ],
  },
  {
    id: "risk",
    title: "Threats, Vulnerabilities, and Risk",
    tag: "Theory base",
    summary: "Understand what can go wrong and how serious it is.",
    points: [
      "A threat actor is any person or group that can cause harm intentionally or accidentally.",
      "A vulnerability is a weakness in a system, process, configuration, or behavior.",
      "Risk combines likelihood and impact.",
      "Attack surface means all possible entry points into a system or network.",
      "Attack vectors are the specific paths used to exploit those entry points."
    ],
  },
  {
    id: "controls",
    title: "Security Controls",
    tag: "Defense layer",
    summary: "Controls prevent, detect, or limit attack impact.",
    points: [
      "Firewalls control traffic between networks or systems.",
      "IDS detects suspicious behavior and generates alerts.",
      "IPS can actively block suspicious traffic.",
      "Access control limits who or what can reach a resource.",
      "Encryption protects data confidentiality and integrity in transit or at rest."
    ],
  },
  {
    id: "identity",
    title: "Identity and Access Basics",
    tag: "User context",
    summary: "Many incidents involve identity misuse or unusual access.",
    points: [
      "Authentication verifies who the user is.",
      "Authorization controls what the user is allowed to access.",
      "MFA reduces the risk of password-only compromise.",
      "RBAC assigns permissions based on user roles.",
      "Least privilege means users should only have the access they need."
    ],
  },
  {
    id: "network",
    title: "Network Evidence",
    tag: "Traffic context",
    summary: "Network evidence explains who communicated, where, and how.",
    points: [
      "IP addresses identify endpoints involved in communication.",
      "Ports and protocols help explain the service or activity involved.",
      "DNS logs can reveal suspicious domain resolution.",
      "Proxy logs can show outbound web activity.",
      "Flow summaries show who communicated with whom, when, and how much data moved."
    ],
  },
  {
    id: "campaign",
    title: "Campaign Progression",
    tag: "Scenario logic",
    summary: "Attacks usually develop in stages, not isolated events.",
    points: [
      "Reconnaissance identifies exposed services or reachable assets.",
      "Initial access means the attacker gains a first foothold.",
      "Execution or command-channel activity shows active control or communication.",
      "Lateral movement means the attacker tries to reach other internal systems.",
      "Exfiltration is the attempt to move data out of the environment."
    ],
  },
];

const USER_STORAGE_KEYS = {
  players: "cybraxisPlayers",
  current: "cybraxisCurrentPlayerId",
  progressPrefix: "cybraxisUserProgress:",
};


function getCleanScenarioDisplayName(scenarioId, rawTitle = "") {
  const id = String(scenarioId || "").toLowerCase();
  const title = String(rawTitle || "").trim();

  if (
    id === "scenario2_silent_beacon" ||
    id === "scenario2" ||
    id === "scenario_2" ||
    id.includes("silent_beacon")
  ) {
    return "Silent Beacon";
  }

  if (
    id.includes("scenario1_variant_b") ||
    id.includes("external_recon_to_exfiltration_1b") ||
    id.includes("scenario1b") ||
    id.includes("scenario_1b")
  ) {
    return "South Bridge Pivot";
  }

  if (
    id === "scenario1" ||
    id.includes("external_recon_to_exfiltration_1") ||
    id.includes("scenario_1")
  ) {
    return "Perimeter Breach";
  }

  return title
    .replace(/^Scenario\s+\d+[A-Z]?:\s*/i, "")
    .replace(/\s*[-–:]\s*Replay Variant\s*B\s*$/i, "")
    .replace(/\s*\bVariant\s*B\b\s*$/i, "")
    .replace(/External Reconnaissance to Exfiltration\s*[-–]\s*Foundational Campaign/gi, "Perimeter Breach")
    .replace(/External Reconnaissance to Exfiltration\s*[-–]\s*South Bridge Pivot/gi, "South Bridge Pivot")
    .trim() || "Saved investigation";
}

function formatResumeScenarioTitle(scenarioId, title) {
  return getCleanScenarioDisplayName(scenarioId, title);
}

function getScenarioTitle(bundle, fallback) {
  const data = bundle?.scenarioData || {};
  const map = bundle?.mapScenario || {};

  return (
    data.gameplay_name ||
    data.name ||
    data.title ||
    map.name ||
    map.title ||
    fallback
  );
}


function findScenario2Key() {
  const exactScenario2Id = "scenario2_silent_beacon";

  if (SCENARIO_BUNDLES?.[exactScenario2Id]) {
    return exactScenario2Id;
  }

  const match = Object.entries(SCENARIO_BUNDLES || {}).find(([id, bundle]) => {
    const text = [
      id,
      bundle?.id,
      bundle?.title,
      bundle?.name,
      bundle?.description,
      bundle?.scenarioData?.id,
      bundle?.scenarioData?.name,
      bundle?.scenarioData?.title,
      bundle?.scenarioData?.description,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return (
      text.includes("scenario2_silent_beacon") ||
      text.includes("silent beacon")
    );
  });

  return match?.[0] || exactScenario2Id;
}

function findScenario1BKey() {
  const aliases = [
    "external_recon_to_exfiltration_1b",
    "scenario1_variant_b",
    "scenario_1b",
    "scenario1b",
  ];

  const direct = aliases.find((id) => SCENARIO_BUNDLES?.[id]);
  if (direct) return direct;

  const match = Object.entries(SCENARIO_BUNDLES || {}).find(([id, bundle]) => {
    const data = bundle?.scenarioData || {};
    const text = [
      id,
      data.scenario_id,
      data.id,
      data.name,
      data.gameplay_name,
      data.title,
      data.description,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return (
      text.includes("1b") ||
      text.includes("variant b") ||
      text.includes("replay variant") ||
      text.includes("variant_b")
    );
  });

  return match?.[0] || null;
}

function safeJsonRead(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function safeJsonWrite(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function readString(key, fallback = "") {
  try {
    return window.localStorage.getItem(key) || window.sessionStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

function writeString(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {}
}

function createDefaultPlayers() {
  const existingName = readString("cybraxisPlayerName", "Student Analyst");

  return [
    {
      id: "player_1",
      name: existingName || "Student Analyst",
      role: "Student SOC Analyst",
    },
  ];
}


/* CYBRAXIS_DYNAMIC_DASHBOARD_INTEL_START */
function parseStoredJsonValue(value, fallback) {
  try {
    if (Array.isArray(value) || (value && typeof value === "object")) return value;
    if (typeof value === "string" && value.trim()) return JSON.parse(value);
    return fallback;
  } catch {
    return fallback;
  }
}

function getDashboardScenarioStageScores(userId) {
  if (typeof window === "undefined" || !userId) return [];

  const prefix = "cybraxisScenarioStageScores:" + userId + ":";

  return Object.keys(window.localStorage)
    .filter(key => key.startsWith(prefix))
    .flatMap(key => {
      const scenarioId = key.slice(prefix.length);
      const raw = safeJsonRead(key, []);

      return (Array.isArray(raw) ? raw : []).map((entry, index) => {
        const totalScore = Number(
          entry?.totalStageScore ??
          entry?.stageScore ??
          entry?.totalScore ??
          entry?.score ??
          0
        );

        return {
          ...entry,
          scenarioId,
          stageIndex: Number.isFinite(Number(entry?.stageIndex))
            ? Number(entry.stageIndex)
            : index,
          stageName: entry?.stageName || "Stage " + String(index + 1),
          totalScore: Number.isFinite(totalScore) ? Math.round(totalScore) : 0,
          passed: Boolean(entry?.passed),
          timedOut: Boolean(entry?.timedOut),
          coverageComplete:
            entry?.coverageComplete ??
            entry?.evaluation?.coverageComplete ??
            false,
          sequenceComplete:
            entry?.sequenceComplete ??
            entry?.evaluation?.sequenceComplete ??
            false,
          guidanceLevel:
            entry?.guidanceLevel ||
            entry?.guidance ||
            entry?.mentorGuidanceProfile?.supportLevel ||
            "moderate",
          wrongActionCount: Number(entry?.wrongActionCount ?? 0),
          hintsRequested: Number(entry?.hintsRequested ?? 0),
        };
      });
    })
    .sort((a, b) => {
      if (a.scenarioId !== b.scenarioId) return a.scenarioId.localeCompare(b.scenarioId);
      return Number(a.stageIndex ?? 0) - Number(b.stageIndex ?? 0);
    });
}

function averageDashboardValue(values = []) {
  const clean = values.map(Number).filter(Number.isFinite);
  if (!clean.length) return 0;
  return Math.round(clean.reduce((sum, value) => sum + value, 0) / clean.length);
}

function getDashboardWeakestArea(stageScores = [], aiProfile = null) {
  if (aiProfile?.primaryFocusLabel) return aiProfile.primaryFocusLabel;

  const coverageWeak = stageScores.filter(score => score.coverageComplete === false).length;
  const sequenceWeak = stageScores.filter(score => score.sequenceComplete === false).length;
  const wrongActions = stageScores.reduce((sum, score) => sum + Number(score.wrongActionCount || 0), 0);
  const hintUse = stageScores.reduce((sum, score) => sum + Number(score.hintsRequested || 0), 0);

  const candidates = [
    ["Evidence coverage", coverageWeak],
    ["Response sequence", sequenceWeak],
    ["Action accuracy", wrongActions],
    ["Guided investigation independence", hintUse],
  ].sort((a, b) => b[1] - a[1]);

  return candidates[0]?.[1] > 0 ? candidates[0][0] : "No major weakness detected";
}

function getDashboardAiProfile(activeUserId) {
  const snapshot = readUserProgressSnapshot(activeUserId);
  const fromSnapshot = parseStoredJsonValue(snapshot?.cybraxisLatestAiLearningProfile, null);
  const fromGlobal = safeJsonRead("cybraxisLatestAiLearningProfile", null);

  return (fromSnapshot && fromSnapshot.enabled)
    ? fromSnapshot
    : (fromGlobal && fromGlobal.enabled)
      ? fromGlobal
      : null;
}

function getDashboardStartedScenarios(activeUserId) {
  const snapshot = readUserProgressSnapshot(activeUserId);
  const fromSnapshot = parseStoredJsonValue(snapshot?.cybraxisStartedScenarioIds, []);
  const fromGlobal = safeJsonRead("cybraxisStartedScenarioIds", []);

  return Array.from(
    new Set([
      ...(Array.isArray(fromSnapshot) ? fromSnapshot : []),
      ...(Array.isArray(fromGlobal) ? fromGlobal : []),
    ].filter(Boolean))
  );
}

function getScenarioStageCountForDashboard(scenarioId = "") {
  const id = String(scenarioId || "").toLowerCase();

  if (id.includes("scenario2") || id.includes("silent_beacon")) return 5;
  return 5;
}
/* CYBRAXIS_DYNAMIC_DASHBOARD_INTEL_END */


/* CYBRAXIS_REAL_DASHBOARD_DATA_START */
function cybraxisParseJsonLoose(value, fallback) {
  try {
    if (Array.isArray(value) || (value && typeof value === "object")) return value;
    if (typeof value === "string" && value.trim()) return JSON.parse(value);
    return fallback;
  } catch {
    return fallback;
  }
}

function cybraxisDashboardReadStageRowsForUser(userId = "") {
  if (typeof window === "undefined") return [];

  const allKeys = Object.keys(window.localStorage)
    .filter(key => key.startsWith("cybraxisScenarioStageScores:"));

  const activeRows = cybraxisDashboardReadStageRowsFromKeys(
    allKeys.filter(key => key.startsWith("cybraxisScenarioStageScores:" + userId + ":"))
  );

  if (activeRows.length > 0) return activeRows;

  return cybraxisDashboardReadStageRowsFromKeys(allKeys);
}

function cybraxisDashboardReadStageRowsFromKeys(keys = []) {
  if (typeof window === "undefined") return [];

  return keys.flatMap(key => {
    const parts = key.split(":");
    const playerId = parts[1] || "";
    const scenarioId = parts.slice(2).join(":") || "unknown_scenario";
    const raw = cybraxisParseJsonLoose(window.localStorage.getItem(key), []);

    return (Array.isArray(raw) ? raw : []).map((entry, index) => {
      const score = Number(
        entry?.totalStageScore ??
        entry?.totalScore ??
        entry?.stageScore ??
        entry?.score ??
        entry?.scoreSummary?.totalStageScore ??
        entry?.scoreSummary?.stageScore ??
        entry?.scoreSummary?.score ??
        0
      );

      const timedOut = Boolean(entry?.timedOut);
      const passed =
        !timedOut &&
        (
          entry?.passed === true ||
          (Number.isFinite(score) && score >= 65)
        );

      return {
        playerId,
        scenarioId,
        stageIndex: Number.isFinite(Number(entry?.stageIndex)) ? Number(entry.stageIndex) : index,
        stageName: entry?.stageName || entry?.name || "Stage " + String(index + 1),
        score: Number.isFinite(score) ? Math.round(score) : 0,
        passed,
        timedOut,
        coverageComplete: Boolean(
          entry?.coverageComplete ??
          entry?.evaluation?.coverageComplete ??
          entry?.scoreSummary?.coverageComplete
        ),
        sequenceComplete: Boolean(
          entry?.sequenceComplete ??
          entry?.evaluation?.sequenceComplete ??
          entry?.scoreSummary?.sequenceComplete
        ),
        wrongActionCount: Number(entry?.wrongActionCount ?? entry?.scoreSummary?.wrongActionCount ?? 0),
        hintsRequested: Number(entry?.hintsRequested ?? entry?.scoreSummary?.hintsRequested ?? 0),
      };
    });
  }).sort((a, b) => {
    if (a.scenarioId !== b.scenarioId) return a.scenarioId.localeCompare(b.scenarioId);
    return a.stageIndex - b.stageIndex;
  });
}

function cybraxisDashboardAverage(values = []) {
  const clean = values.map(Number).filter(Number.isFinite);
  if (!clean.length) return 0;
  return Math.round(clean.reduce((sum, value) => sum + value, 0) / clean.length);
}

function cybraxisDashboardStartedScenarios(userId, rows) {
  const snapshot = typeof readUserProgressSnapshot === "function"
    ? readUserProgressSnapshot(userId)
    : {};

  const fromSnapshot = cybraxisParseJsonLoose(snapshot?.cybraxisStartedScenarioIds, []);
  const fromGlobal = safeJsonRead("cybraxisStartedScenarioIds", []);
  const fromRows = rows.map(row => row.scenarioId);

  return Array.from(new Set([
    ...(Array.isArray(fromSnapshot) ? fromSnapshot : []),
    ...(Array.isArray(fromGlobal) ? fromGlobal : []),
    ...fromRows,
  ].filter(Boolean)));
}

function cybraxisDashboardAiProfile(userId) {
  const snapshot = typeof readUserProgressSnapshot === "function"
    ? readUserProgressSnapshot(userId)
    : {};

  const fromSnapshot = cybraxisParseJsonLoose(snapshot?.cybraxisLatestAiLearningProfile, null);
  const fromGlobal = safeJsonRead("cybraxisLatestAiLearningProfile", null);

  if (fromSnapshot?.enabled) return fromSnapshot;
  if (fromGlobal?.enabled) return fromGlobal;

  return null;
}

function cybraxisDashboardFocus(rows = [], aiProfile = null) {
  if (aiProfile?.primaryFocusLabel) return aiProfile.primaryFocusLabel;

  const coverageWeak = rows.filter(row => !row.coverageComplete).length;
  const sequenceWeak = rows.filter(row => !row.sequenceComplete).length;
  const wrongActions = rows.reduce((sum, row) => sum + Number(row.wrongActionCount || 0), 0);
  const hints = rows.reduce((sum, row) => sum + Number(row.hintsRequested || 0), 0);

  const ranked = [
    ["Evidence coverage", coverageWeak],
    ["Response sequence", sequenceWeak],
    ["Action accuracy", wrongActions],
    ["Mentor reliance", hints],
  ].sort((a, b) => b[1] - a[1]);

  return ranked[0]?.[1] > 0 ? ranked[0][0] : "No major weakness detected";
}
/* CYBRAXIS_REAL_DASHBOARD_DATA_END */

function readPlayers() {
  const players = safeJsonRead(USER_STORAGE_KEYS.players, null);

  if (Array.isArray(players) && players.length > 0) {
    return players;
  }

  const defaults = createDefaultPlayers();
  safeJsonWrite(USER_STORAGE_KEYS.players, defaults);
  writeString(USER_STORAGE_KEYS.current, defaults[0].id);
  writeString("cybraxisPlayerName", defaults[0].name);

  return defaults;
}

function readCurrentPlayerId(players) {
  const storedId = readString(USER_STORAGE_KEYS.current, "");
  const valid = players.some((player) => player.id === storedId);

  if (valid) return storedId;

  const fallback = players[0]?.id || "player_1";
  writeString(USER_STORAGE_KEYS.current, fallback);
  return fallback;
}

function getCurrentPlayer(players, activeUserId) {
  return (
    players.find((player) => player.id === activeUserId) ||
    players[0] ||
    { id: "player_1", name: "Student Analyst", role: "Student SOC Analyst" }
  );
}

function isUserManagementKey(key) {
  return (
    key === USER_STORAGE_KEYS.players ||
    key === USER_STORAGE_KEYS.current ||
    key.startsWith(USER_STORAGE_KEYS.progressPrefix)
  );
}

function saveActiveUserProgress(userId) {
  if (!userId) return;

  try {
    const snapshot = {};

    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);

      if (
        key &&
        key.startsWith("cybraxis") &&
        !isUserManagementKey(key) &&
        key !== "cybraxisPlayerName"
      ) {
        snapshot[key] = window.localStorage.getItem(key);
      }
    }

    window.localStorage.setItem(
      USER_STORAGE_KEYS.progressPrefix + userId,
      JSON.stringify(snapshot)
    );
  } catch {}
}

function clearActiveTrainingKeys() {
  try {
    const localKeys = [];

    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);

      if (
        key &&
        key.startsWith("cybraxis") &&
        !isUserManagementKey(key) &&
        key !== "cybraxisPlayerName"
      ) {
        localKeys.push(key);
      }
    }

    localKeys.forEach((key) => window.localStorage.removeItem(key));

    const sessionKeys = [];

    for (let i = 0; i < window.sessionStorage.length; i += 1) {
      const key = window.sessionStorage.key(i);

      if (key && key.startsWith("cybraxis")) {
        sessionKeys.push(key);
      }
    }

    sessionKeys.forEach((key) => window.sessionStorage.removeItem(key));
  } catch {}
}


/* CYBRAXIS_PLAYER_PROGRESS_PERSISTENCE_HELPERS_START */
function readUserProgressSnapshot(userId) {
  if (!userId) return {};
  return safeJsonRead(USER_STORAGE_KEYS.progressPrefix + userId, {}) || {};
}

function readUserProgressString(userId, key, fallback = "") {
  const snapshot = readUserProgressSnapshot(userId);
  const value = snapshot?.[key];

  if (typeof value !== "undefined" && value !== null && String(value) !== "") {
    return String(value);
  }

  return readString(key, fallback);
}

function mergeUserProgressSnapshot(userId, updates = {}) {
  if (!userId) return;

  const progressKey = USER_STORAGE_KEYS.progressPrefix + userId;
  const current = safeJsonRead(progressKey, {}) || {};

  safeJsonWrite(progressKey, {
    ...current,
    ...updates,
    cybraxisLastProgressSavedAt: new Date().toISOString(),
  });
}
/* CYBRAXIS_PLAYER_PROGRESS_PERSISTENCE_HELPERS_END */



function loadUserProgress(userId) {
  clearActiveTrainingKeys();

  try {
    const snapshot = safeJsonRead(USER_STORAGE_KEYS.progressPrefix + userId, {});

    Object.entries(snapshot || {}).forEach(([key, value]) => {
      if (typeof value === "string") {
        window.localStorage.setItem(key, value);
      }
    });
  } catch {}
}

function clearRuntimeFlags() {
  [
    "cybraxisPlayableRemedyMode",
    "cybraxisActiveScenarioId",
    "cybraxisRemedySourceFocus",
    "cybraxisRemediationMode",
    "cybraxisRemediationWeakness",
    "cybraxisRemediationScenario",
    "cybraxisRemediationScore",
    "cybraxisRemediationReason",
    "cybraxisRemediationHintShown",
    "cybraxisSelectedRemedyScenarioId",
    "cybraxisSelectedRemedyScenarioLabel",
    "cybraxisPostRemedyNeedsVariant",
  ].forEach((key) => {
    try {
      window.sessionStorage.removeItem(key);
      window.localStorage.removeItem(key);
    } catch {}
  });
}

function launchScenario(scenarioId, stageIndex = 0, resume = false) {
  clearRuntimeFlags();

  try {
    const activeUserId = readString(USER_STORAGE_KEYS.current, "");
    const safeStageIndex = Math.max(0, Number(stageIndex) || 0);

    if (!resume && safeStageIndex === 0 && activeUserId && scenarioId) {
      window.localStorage.removeItem(
        "cybraxisScenarioStageScores:" + activeUserId + ":" + scenarioId
      );
    }

    window.localStorage.setItem("cybraxisLastScenarioId", scenarioId);
    window.localStorage.setItem("cybraxisLastStageIndex", String(safeStageIndex));
    window.localStorage.setItem("cybraxisHasTrainingProgress", "true");

    mergeUserProgressSnapshot(activeUserId, {
      cybraxisPlayerName: readString("cybraxisPlayerName", "Student Analyst"),
      cybraxisLastScenarioId: scenarioId,
      cybraxisLastStageIndex: String(safeStageIndex),
      cybraxisHasTrainingProgress: "true",
    });
  } catch {}

  const params = new URLSearchParams();
  params.set("scenario", scenarioId);
  params.set("briefing", "1");

  if (stageIndex > 0 || resume) {
    params.set("stage", String(stageIndex));
  }

  if (resume) {
    params.set("resume", "1");
  }

  window.location.assign(window.location.pathname + "?" + params.toString());
}

function chooseNewScenarioId() {
  const scenario1BKey = findScenario1BKey();
  const started = safeJsonRead("cybraxisStartedScenarioIds", []);
  const lastNewScenario = readString("cybraxisLastNewScenarioId", "");

  if (!started.includes(DEFAULT_SCENARIO_ID)) {
    return DEFAULT_SCENARIO_ID;
  }

  if (scenario1BKey && !started.includes(scenario1BKey)) {
    return scenario1BKey;
  }

  if (scenario1BKey) {
    return lastNewScenario === DEFAULT_SCENARIO_ID ? scenario1BKey : DEFAULT_SCENARIO_ID;
  }

  return DEFAULT_SCENARIO_ID;
}

function markScenarioStarted(scenarioId) {
  const started = safeJsonRead("cybraxisStartedScenarioIds", []);
  const next = Array.from(new Set([...started, scenarioId]));

  safeJsonWrite("cybraxisStartedScenarioIds", next);
  writeString("cybraxisLastNewScenarioId", scenarioId);
}

function resetTrainingProgressOnly() {
  const players = readPlayers();
  const currentId = readCurrentPlayerId(players);
  const current = getCurrentPlayer(players, currentId);

  clearActiveTrainingKeys();

  try {
    window.localStorage.removeItem(USER_STORAGE_KEYS.progressPrefix + currentId);
  } catch {}

  writeString("cybraxisPlayerName", current.name || "Student Analyst");
  window.location.assign(window.location.pathname);
}

function CybraxisLogo() {
  return (
    <div className="cy-menu__logo-mark cy-menu__logo-wordmark" aria-hidden="true">
      <svg viewBox="0 0 360 96">
        <defs>
          <linearGradient id="wordCyan" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00e5ff" />
            <stop offset="52%" stopColor="#54f7ff" />
            <stop offset="100%" stopColor="#b5fbff" />
          </linearGradient>
          <linearGradient id="wordGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffd740" />
            <stop offset="100%" stopColor="#fff2a0" />
          </linearGradient>
          <linearGradient id="wordViolet" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#00e5ff" />
          </linearGradient>
          <filter id="wordGlow" x="-30%" y="-40%" width="160%" height="180%">
            <feGaussianBlur stdDeviation="2.3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g filter="url(#wordGlow)">
          <path className="cy-wordmark-frame" d="M14 48 L42 16 H86 L128 48 L86 80 H42 Z" />
          <path className="cy-wordmark-chevron cy-wordmark-chevron--gold" d="M39 25 L70 48 L39 71" />
          <path className="cy-wordmark-chevron cy-wordmark-chevron--cyan" d="M91 25 L60 48 L91 71" />
          <path className="cy-wordmark-x cy-wordmark-x--a" d="M56 22 L91 74" />
          <path className="cy-wordmark-x cy-wordmark-x--b" d="M92 22 L55 74" />

          <path className="cy-wordmark-circuit" d="M0 48 H27 M113 48 H145 M20 23 H43 M20 73 H43 M96 23 H128 M96 73 H128" />

          <circle cx="39" cy="25" r="3.5" />
          <circle cx="91" cy="71" r="3.5" />
          <circle cx="128" cy="48" r="3.5" />

          <text x="158" y="59" className="cy-wordmark-text">CYBRAXIS</text>
        </g>
      </svg>
    </div>
  );
}

function HeroSecurityArt() {
  return <div className="cy-menu__hero-art" aria-hidden="true" />;
}

function IconGlyph({ type }) {
  if (type === "profile") {
    return (
      <svg viewBox="0 0 64 64">
        <circle cx="32" cy="23" r="10" />
        <path d="M16 52 C18 39 25 34 32 34 C39 34 46 39 48 52" />
      </svg>
    );
  }

  if (type === "dashboard") {
    return (
      <svg viewBox="0 0 64 64">
        <path d="M16 48 V34" />
        <path d="M32 48 V20" />
        <path d="M48 48 V12" />
        <path d="M12 52 H54" />
      </svg>
    );
  }

  if (type === "continue") {
    return (
      <svg viewBox="0 0 64 64">
        <path d="M24 14 L50 32 L24 50 Z" />
      </svg>
    );
  }

  if (type === "new") {
    return (
      <svg viewBox="0 0 64 64">
        <circle cx="32" cy="32" r="18" />
        <path d="M32 10 V20" />
        <path d="M32 44 V54" />
        <path d="M10 32 H20" />
        <path d="M44 32 H54" />
        <circle cx="32" cy="32" r="6" />
      </svg>
    );
  }

  if (type === "restart") {
    return (
      <svg viewBox="0 0 64 64">
        <path d="M48 22 C43 14 32 11 23 16 C14 21 11 33 16 42 C21 51 34 54 43 47" />
        <path d="M48 12 V24 H36" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 64 64">
      <path d="M14 16 C24 12 32 16 32 16 V52 C32 52 24 48 14 52 Z" />
      <path d="M50 16 C40 12 32 16 32 16 V52 C32 52 40 48 50 52 Z" />
    </svg>
  );
}


function readNumberValue(key, fallback = 0) {
  const raw = readString(key, "");
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) ? value : fallback;
}

function getScenarioStageCount(scenarioId) {
  const bundle = SCENARIO_BUNDLES?.[scenarioId];
  const stages = bundle?.scenarioData?.stages;

  if (Array.isArray(stages) && stages.length > 0) {
    return stages.length;
  }

  return 5;
}

function readScoreHistory() {
  const candidateKeys = [
    "cybraxisScoreHistory",
    "cybraxisFinalScoreHistory",
    "cybraxisPerformanceHistory",
    "cybraxisScenarioScoreHistory",
  ];

  for (const key of candidateKeys) {
    const value = safeJsonRead(key, null);

    if (Array.isArray(value) && value.length > 0) {
      return value
        .map((entry) => {
          if (typeof entry === "number") return entry;
          if (entry && typeof entry === "object") {
            return (
              entry.score ??
              entry.totalScore ??
              entry.finalScore ??
              entry.percentage ??
              entry.value
            );
          }

          return null;
        })
        .map((score) => Number(score))
        .filter((score) => Number.isFinite(score))
        .map((score) => Math.max(0, Math.min(100, Math.round(score))));
    }
  }

  return [];
}

function buildProgressTrend(progressPercent, stageIndex, stageCount, hasProgress) {
  if (!hasProgress) return [];

  const count = Math.max(1, Math.min(stageCount, stageIndex + 1));

  return Array.from({ length: count }, (_, index) => {
    return Math.max(0, Math.min(100, Math.round(((index + 1) / stageCount) * 100)));
  }).concat(progressPercent > 0 && count === 0 ? [progressPercent] : []);
}

function buildCurveCoordinates(points) {
  const values = points
    .map((value) => Math.max(0, Math.min(100, Number(value) || 0)))
    .slice(-8);

  if (values.length === 0) return [];

  const width = 472;
  const startX = 24;
  const minY = 24;
  const maxY = 112;
  const step = values.length === 1 ? 0 : width / (values.length - 1);

  return values.map((value, index) => ({
    x: values.length === 1 ? 260 : startX + index * step,
    y: maxY - (value / 100) * (maxY - minY),
    value,
  }));
}

/* CYBRAXIS_DEMO_DASHBOARD_STAGE_SCORE_SEEDING_START */
function cybraxisDemoStage(stageIndex, stageName, score, options = {}) {
  const timedOut = Boolean(options.timedOut);
  const passed = !timedOut && Number(score) >= 65;

  return {
    stageIndex,
    stageName,
    score,
    totalStageScore: score,
    stageScore: score,
    passed,
    timedOut,
    wrongActionCount: Number(options.wrongActionCount || 0),
    hintsRequested: Number(options.hintsRequested || 0),
    coverageComplete: options.coverageComplete !== false,
    sequenceComplete: options.sequenceComplete !== false,
    scoreSummary: {
      score,
      totalStageScore: score,
      stageScore: score,
      wrongActionCount: Number(options.wrongActionCount || 0),
      hintsRequested: Number(options.hintsRequested || 0),
      coverageComplete: options.coverageComplete !== false,
      sequenceComplete: options.sequenceComplete !== false,
    },
  };
}

function cybraxisSeedDemoDashboardStageScores() {
  if (typeof window === "undefined") return;

  let players = [];

  try {
    players = JSON.parse(window.localStorage.getItem("cybraxisPlayers") || "[]");
  } catch {
    players = [];
  }

  if (!Array.isArray(players) || players.length === 0) return;

  const normalize = (value) => String(value || "").toLowerCase();

  const findDemoUserId = (preferredId, requiredWords = []) => {
    const direct = players.find((player) => player?.id === preferredId);

    if (direct?.id && String(direct.id).startsWith("demo-")) {
      return direct.id;
    }

    const byText = players.find((player) => {
      const id = normalize(player?.id);
      const name = normalize(player?.name);
      const combined = id + " " + name;

      return (
        id.startsWith("demo-") &&
        requiredWords.every((word) => combined.includes(word))
      );
    });

    return byText?.id || "";
  };

  const baselineId = findDemoUserId("demo-student-analyst", ["student"]);
  const strongId = findDemoUserId("demo-strong-performance", ["strong"]);
  const remediationId = findDemoUserId("demo-remediation-user", ["remediation"]);
  const freshId = findDemoUserId("demo-fresh-learner", ["fresh"]);

  const removeDemoScenarioScores = (userId) => {
    if (!userId || !String(userId).startsWith("demo-")) return;

    Object.keys(window.localStorage)
      .filter((key) => key.startsWith("cybraxisScenarioStageScores:" + userId + ":"))
      .forEach((key) => window.localStorage.removeItem(key));
  };

  const writeDemoScores = (userId, scenarioId, rows) => {
    if (!userId || !String(userId).startsWith("demo-")) return;

    window.localStorage.setItem(
      "cybraxisScenarioStageScores:" + userId + ":" + scenarioId,
      JSON.stringify(rows)
    );
  };

  /*
    Force-refresh only demo score rows.
    This prevents stale/empty demo keys from blocking the dashboard.
  */
  [baselineId, strongId, remediationId, freshId]
    .filter(Boolean)
    .forEach(removeDemoScenarioScores);

  if (baselineId) {
    writeDemoScores(baselineId, "external_recon_to_exfiltration", [
      cybraxisDemoStage(0, "Reconnaissance", 74, {
        hintsRequested: 1,
        coverageComplete: true,
        sequenceComplete: true,
      }),
      cybraxisDemoStage(1, "Access", 70, {
        hintsRequested: 1,
        coverageComplete: false,
        sequenceComplete: true,
      }),
      cybraxisDemoStage(2, "Execution", 66, {
        hintsRequested: 1,
        coverageComplete: false,
        sequenceComplete: true,
      }),
    ]);
  }

  if (strongId) {
    writeDemoScores(strongId, "external_recon_to_exfiltration", [
      cybraxisDemoStage(0, "Reconnaissance", 94),
      cybraxisDemoStage(1, "Access", 91),
      cybraxisDemoStage(2, "Execution", 92),
      cybraxisDemoStage(3, "Lateral Movement", 89),
      cybraxisDemoStage(4, "Exfiltration", 93),
    ]);

    writeDemoScores(strongId, "external_recon_to_exfiltration_1b", [
      cybraxisDemoStage(0, "Reconnaissance", 88),
      cybraxisDemoStage(1, "Access", 90),
      cybraxisDemoStage(2, "Execution", 87),
      cybraxisDemoStage(3, "Lateral Movement", 91),
      cybraxisDemoStage(4, "Exfiltration", 89),
    ]);

    writeDemoScores(strongId, "scenario2_silent_beacon", [
      cybraxisDemoStage(0, "Detection", 86),
      cybraxisDemoStage(1, "Beaconing", 88),
      cybraxisDemoStage(2, "Internal Reconnaissance", 84, {
        hintsRequested: 1,
      }),
      cybraxisDemoStage(3, "Data Staging", 87, {
        hintsRequested: 1,
      }),
      cybraxisDemoStage(4, "Containment", 89, {
        hintsRequested: 1,
      }),
    ]);
  }

  if (remediationId) {
    writeDemoScores(remediationId, "external_recon_to_exfiltration", [
      cybraxisDemoStage(0, "Reconnaissance", 67, {
        hintsRequested: 1,
        coverageComplete: true,
        sequenceComplete: true,
      }),
      cybraxisDemoStage(1, "Access", 61, {
        wrongActionCount: 1,
        hintsRequested: 1,
        coverageComplete: false,
        sequenceComplete: true,
      }),
      cybraxisDemoStage(2, "Execution", 58, {
        wrongActionCount: 1,
        hintsRequested: 2,
        coverageComplete: false,
        sequenceComplete: false,
      }),
      cybraxisDemoStage(3, "Lateral Movement", 63, {
        hintsRequested: 1,
        coverageComplete: false,
        sequenceComplete: false,
      }),
      cybraxisDemoStage(4, "Exfiltration", 60, {
        wrongActionCount: 1,
        coverageComplete: false,
        sequenceComplete: false,
      }),
    ]);

    writeDemoScores(remediationId, "external_recon_to_exfiltration_1b", [
      cybraxisDemoStage(0, "Reconnaissance", 62, {
        hintsRequested: 1,
        coverageComplete: false,
        sequenceComplete: true,
      }),
      cybraxisDemoStage(1, "Access", 57, {
        wrongActionCount: 1,
        hintsRequested: 2,
        coverageComplete: false,
        sequenceComplete: false,
      }),
      cybraxisDemoStage(2, "Execution", 54, {
        wrongActionCount: 1,
        hintsRequested: 2,
        coverageComplete: false,
        sequenceComplete: false,
      }),
    ]);
  }

  /*
    Fresh Learner intentionally stays without score rows.
    Its dashboard should remain pending.
  */
}
/* CYBRAXIS_DEMO_DASHBOARD_STAGE_SCORE_SEEDING_END */


export default function MainMenu({ initialView = "home" }) {
  // CYBRAXIS_FIXED_DEMO_DASHBOARDS_SAFE
  React.useEffect(() => {
    const DEMO_NAMES = [
      "Student Analyst",
      "Strong Performance User",
      "Remediation Demo User",
      "Fresh Learner",
    ];

    const normalize = (value) => String(value || "").trim().toLowerCase();

    const escapeHtml = (value) =>
      String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

    const safeJsonRead = (key, fallback) => {
      try {
        const value = window.localStorage.getItem(key);
        return value ? JSON.parse(value) : fallback;
      } catch {
        return fallback;
      }
    };

    const isVisible = (element) => {
      if (!element || !element.isConnected) return false;
      const style = window.getComputedStyle(element);
      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        Number(style.opacity || 1) === 0
      ) {
        return false;
      }

      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };

    const getVisibleDemoName = () => {
      const candidates = Array.from(document.querySelectorAll("body *"))
        .filter((element) => {
          if (!isVisible(element)) return false;
          if (element.closest(".cy-demo-dashboard-runtime-root")) return false;

          const text = String(element.textContent || "").replace(/\s+/g, " ").trim();
          return DEMO_NAMES.some((name) => text === name || text.includes(name));
        })
        .map((element) => {
          const text = String(element.textContent || "").replace(/\s+/g, " ").trim();
          const foundName = DEMO_NAMES.find((name) => text === name || text.includes(name));
          const rect = element.getBoundingClientRect();
          const nearCurrentPlayer =
            normalize(element.parentElement?.textContent).includes("current player") ||
            normalize(element.closest("[class]")?.textContent).includes("current player");

          return {
            name: foundName,
            area: rect.width * rect.height,
            nearCurrentPlayer,
          };
        })
        .filter((item) => item.name);

      if (!candidates.length) return null;

      candidates.sort((a, b) => {
        if (a.nearCurrentPlayer !== b.nearCurrentPlayer) {
          return a.nearCurrentPlayer ? -1 : 1;
        }
        return a.area - b.area;
      });

      return candidates[0].name;
    };

    const getCurrentPlayer = () => {
      const players = safeJsonRead("cybraxisPlayers", []);
      const currentId =
        window.localStorage.getItem("cybraxisCurrentPlayerId") ||
        window.localStorage.getItem("cybraxisSelectedPlayerId") ||
        window.localStorage.getItem("cybraxisActivePlayerId") ||
        window.localStorage.getItem("currentPlayerId") ||
        "";

      const fromPlayers =
        Array.isArray(players) &&
        players.find((player) => player && String(player.id) === String(currentId));

      const storedName =
        fromPlayers?.name ||
        window.localStorage.getItem("cybraxisPlayerName") ||
        window.localStorage.getItem("cybraxisCurrentPlayerName") ||
        window.localStorage.getItem("selectedPlayerName") ||
        "";

      const visibleName = getVisibleDemoName();

      return {
        id: fromPlayers?.id || currentId || "demo-student-analyst",
        name: visibleName || storedName || "Student Analyst",
      };
    };

    const getLatestAiLearningProfile = () => {
      const profile = safeJsonRead("cybraxisLatestAiLearningProfile", null);
      return profile && profile.enabled ? profile : null;
    };

    const mergeDashboardProfileWithAi = (profile, aiProfile) => {
      if (!aiProfile) return profile;

      const aiMetrics = [
        ["Recommended Focus", aiProfile.primaryFocusLabel || "Activity/evidence"],
        ["Observed Pattern", aiProfile.primaryMisconceptionLabel || "None"],
        ["Mentor Interventions", String(aiProfile.liveInterventionCount || 0)],
      ];

      const aiNotes = [
        aiProfile.primaryMisconception && aiProfile.primaryMisconception !== "none"
          ? `The learning review identified ${aiProfile.primaryMisconceptionLabel || aiProfile.primaryMisconception} as the main adaptive learning pattern.`
          : "The mentor system did not identify a repeated misconception pattern.",
        aiProfile.primaryFocusLabel
          ? `Recommended focus: ${aiProfile.primaryFocusLabel}.`
          : "Recommended focus: activity/evidence.",
      ];

      return {
        ...profile,
        summary:
          profile.summary ||
          "This learner profile is updated from scenario progress and adaptive Mentor observations.",
        metrics: [
          ...(Array.isArray(profile.metrics) ? profile.metrics : []),
          ...aiMetrics,
        ].slice(0, 8),
        notes: [
          ...(Array.isArray(profile.notes) ? profile.notes : []),
          ...aiNotes,
        ].slice(0, 6),
        recommendation:
          aiProfile.dashboardRecommendation ||
          profile.recommendation ||
          "Continue scenario practice and maintain complete investigation coverage.",
      };
    };



    const getDashboardProfile = () => {
      const player = getCurrentPlayer();
      const name = normalize(player.name);
      const id = normalize(player.id);

      if (name.includes("strong") || id.includes("strong")) {
        return {
          key: "strong",
          name: "Strong Performance User",
          label: "High Performance Learner",
          status: "ADVANCED",
          score: 93,
          scoreLabel: "Ready for Next Challenge",
          summary:
            "This learner shows strong SOC reasoning, high evidence coverage, correct action sequencing, and low dependence on mentor support.",
          metrics: [
            ["Scenarios Completed", "3"],
            ["Action Accuracy", "96%"],
            ["Investigation Coverage", "94%"],
            ["Sequence Control", "92%"],
            ["Mentor Usage", "Low"],
            ["Remediation Need", "None"],
          ],
          bars: [
            ["Action Accuracy", 96],
            ["Investigation Coverage", 94],
            ["Response Sequence", 92],
            ["Evidence Interpretation", 90],
            ["Independence", 88],
          ],
          trend: [62, 74, 83, 89, 93],
          strengths: [
            "Investigates before containment",
            "Links alerts, logs, and node context",
            "Uses mentor guidance only when needed",
          ],
          weaknesses: [
            "Can improve response speed in exfiltration",
            "Should document final reasoning more consistently",
          ],
          recommendation:
            "Continue with the next scenario challenge under changed conditions and a different attack path.",
        };
      }

      if (name.includes("remediation") || id.includes("remediation")) {
        return {
          key: "remediation",
          name: "Remediation Demo User",
          label: "Remediation Recovery Learner",
          status: "RECOVERY",
          score: 66,
          scoreLabel: "Remediation Recommended",
          summary:
            "This learner improved after feedback but still needs targeted practice with evidence completion, containment timing, and action order.",
          metrics: [
            ["Scenarios Completed", "2"],
            ["Action Accuracy", "70%"],
            ["Investigation Coverage", "82%"],
            ["Sequence Control", "61%"],
            ["Mentor Usage", "High"],
            ["Remediation Need", "Active"],
          ],
          bars: [
            ["Action Accuracy", 70],
            ["Investigation Coverage", 82],
            ["Response Sequence", 61],
            ["Evidence Interpretation", 68],
            ["Independence", 54],
          ],
          trend: [41, 47, 58, 60, 66],
          strengths: [
            "Improved evidence coverage after feedback",
            "Recognizes suspicious node context",
            "Responds well to targeted remediation",
          ],
          weaknesses: [
            "Contains assets before full validation",
            "Needs stronger action ordering",
            "Relies heavily on mentor prompts",
          ],
          recommendation:
            "Assign a playable remediation scenario focused on premature containment and evidence completion.",
        };
      }

      if (name.includes("fresh") || id.includes("fresh")) {
        return {
          key: "fresh",
          name: "Fresh Learner",
          label: "New Learner Profile",
          status: "NOT STARTED",
          score: 0,
          scoreLabel: "No Performance Data Yet",
          summary:
            "This learner has not completed a scenario yet. The dashboard is ready to track the first training session.",
          metrics: [
            ["Scenarios Completed", "0"],
            ["Action Accuracy", "—"],
            ["Investigation Coverage", "—"],
            ["Sequence Control", "—"],
            ["Mentor Usage", "—"],
            ["Remediation Need", "Unknown"],
          ],
          bars: [
            ["Action Accuracy", 0],
            ["Investigation Coverage", 0],
            ["Response Sequence", 0],
            ["Evidence Interpretation", 0],
            ["Independence", 0],
          ],
          trend: [0, 0, 0, 0, 0],
          strengths: [
            "Ready to begin baseline training",
            "No failed scenario history yet",
            "Clean profile for first-run demonstration",
          ],
          weaknesses: [
            "No investigation evidence collected yet",
            "No score history available yet",
            "No stage behavior baseline yet",
          ],
          recommendation:
            "Start with the foundational external reconnaissance-to-exfiltration scenario.",
        };
      }

      return {
        key: "student",
        name: "Student Analyst",
        label: "Baseline In-Progress Learner",
        status: "IN PROGRESS",
        score: 72,
        scoreLabel: "Developing SOC Reasoning",
        summary:
          "This learner is progressing through the baseline scenario with acceptable performance, but still needs stronger evidence coverage and more stable response ordering.",
        metrics: [
          ["Scenarios Completed", "1"],
          ["Action Accuracy", "74%"],
          ["Investigation Coverage", "68%"],
          ["Sequence Control", "70%"],
          ["Mentor Usage", "Moderate"],
          ["Remediation Need", "Possible"],
        ],
        bars: [
          ["Action Accuracy", 74],
          ["Investigation Coverage", 68],
          ["Response Sequence", 70],
          ["Evidence Interpretation", 72],
          ["Independence", 64],
        ],
        trend: [30, 44, 57, 65, 72],
        strengths: [
          "Understands basic alert-to-node correlation",
          "Uses the investigation cycle during key stages",
          "Improves after mentor feedback",
        ],
        weaknesses: [
          "Sometimes applies containment too early",
          "Needs fuller node evidence coverage",
          "Should compare activity against baseline more clearly",
        ],
        recommendation:
          "Continue the saved investigation and focus on evidence completion before final containment.",
      };
    };

    const findDashboardPage = () => {
      return null;
    };

    const findHeader = (page, title) => {
      let node = title.parentElement;
      let best = title.parentElement;

      for (let i = 0; i < 8 && node && page.contains(node); i += 1) {
        const rect = node.getBoundingClientRect?.();
        const text = normalize(node.textContent);

        if (
          rect &&
          rect.height <= 280 &&
          text.includes("player dashboard") &&
          (
            text.includes("track your adaptive learning journey") ||
            text.includes("your progress shapes your next challenge") ||
            text.includes("back to menu")
          )
        ) {
          best = node;
        }

        node = node.parentElement;
      }

      return best;
    };

    const buildMetricHtml = (metrics) =>
      metrics.map((metric) =>
        '<div class="cy-fixed-dash__metric">' +
          '<span>' + escapeHtml(metric[0]) + '</span>' +
          '<strong>' + escapeHtml(metric[1]) + '</strong>' +
        '</div>'
      ).join("");

    const buildBarsHtml = (bars) =>
      bars.map((bar) => {
        const value = Math.max(0, Math.min(100, Number(bar[1]) || 0));
        const empty = value === 0;

        return (
          '<div class="cy-fixed-dash__skill-row' + (empty ? ' cy-fixed-dash__skill-row--empty' : '') + '">' +
            '<div class="cy-fixed-dash__skill-top">' +
              '<span>' + escapeHtml(bar[0]) + '</span>' +
              '<strong>' + (empty ? "—" : value + "%") + '</strong>' +
            '</div>' +
            '<div class="cy-fixed-dash__bar"><i style="width:' + (empty ? 3 : value) + '%"></i></div>' +
          '</div>'
        );
      }).join("");

    const buildTrendHtml = (trend) =>
      trend.map((value, index) => {
        const height = Math.max(3, Math.min(100, Number(value) || 0));

        return (
          '<span class="cy-fixed-dash__trend-bar" style="height:' + height + '%">' +
            '<b>' + escapeHtml(value) + '</b>' +
            '<em>C' + (index + 1) + '</em>' +
          '</span>'
        );
      }).join("");

    const buildListHtml = (items) =>
      items.map((item) => '<li>' + escapeHtml(item) + '</li>').join("");

    const buildDashboardHtml = (profile) => {
      const score = Math.max(0, Math.min(100, Number(profile.score) || 0));

      return (
        '<section class="cy-fixed-dash cy-fixed-dash--' + escapeHtml(profile.key) + '" data-profile-key="' + escapeHtml(profile.key) + '">' +
          '<div class="cy-fixed-dash__hero">' +
            '<div class="cy-fixed-dash__hero-copy">' +
              '<div class="cy-fixed-dash__kicker">' + escapeHtml(profile.status) + '</div>' +
              '<h2>' + escapeHtml(profile.name) + '</h2>' +
              '<p>' + escapeHtml(profile.summary) + '</p>' +
            '</div>' +
            '<div class="cy-fixed-dash__score-card">' +
              '<div class="cy-fixed-dash__score-ring" style="--cy-score:' + score + '">' +
                '<div><strong>' + score + '</strong><span>/100</span></div>' +
              '</div>' +
              '<div class="cy-fixed-dash__score-text">' +
                '<span>Overall Readiness</span>' +
                '<strong>' + escapeHtml(profile.scoreLabel) + '</strong>' +
              '</div>' +
            '</div>' +
          '</div>' +

          '<div class="cy-fixed-dash__grid">' +
            '<section class="cy-fixed-dash__panel cy-fixed-dash__panel--metrics">' +
              '<div class="cy-fixed-dash__panel-head"><span>Profile Metrics</span><b>' + escapeHtml(profile.label) + '</b></div>' +
              '<div class="cy-fixed-dash__metrics">' + buildMetricHtml(profile.metrics) + '</div>' +
            '</section>' +

            '<section class="cy-fixed-dash__panel cy-fixed-dash__panel--skills">' +
              '<div class="cy-fixed-dash__panel-head"><span>Skill Breakdown</span><b>Investigation Model</b></div>' +
              '<div class="cy-fixed-dash__skills">' + buildBarsHtml(profile.bars) + '</div>' +
            '</section>' +

            '<section class="cy-fixed-dash__panel cy-fixed-dash__panel--trend">' +
              '<div class="cy-fixed-dash__panel-head"><span>Progress Trend</span><b>Distinct Learner Graph</b></div>' +
              '<div class="cy-fixed-dash__trend">' + buildTrendHtml(profile.trend) + '</div>' +
            '</section>' +

            '<section class="cy-fixed-dash__panel cy-fixed-dash__panel--lists">' +
              '<div class="cy-fixed-dash__split-list">' +
                '<div>' +
                  '<div class="cy-fixed-dash__mini-title cy-fixed-dash__mini-title--good">Strengths</div>' +
                  '<ul>' + buildListHtml(profile.strengths) + '</ul>' +
                '</div>' +
                '<div>' +
                  '<div class="cy-fixed-dash__mini-title cy-fixed-dash__mini-title--warn">Weaknesses</div>' +
                  '<ul>' + buildListHtml(profile.weaknesses) + '</ul>' +
                '</div>' +
              '</div>' +
            '</section>' +
          '</div>' +

          '<section class="cy-fixed-dash__recommendation">' +
            '<span>Recommended Next Step</span>' +
            '<strong>' + escapeHtml(profile.recommendation) + '</strong>' +
          '</section>' +
        '</section>'
      );
    };

    const renderDashboard = () => {
      /* CYBRAXIS_DISABLE_OLD_FIXED_DASHBOARD_INJECTOR_CLEANUP */
      document
        .querySelectorAll(".cy-demo-dashboard-runtime-root, .cy-fixed-dash")
        .forEach((node) => node.remove());

      document
        .querySelectorAll(".cy-fixed-dashboard-page-safe")
        .forEach((node) => node.classList.remove("cy-fixed-dashboard-page-safe"));

      const found = findDashboardPage();
      if (!found) return;

      const page = found.page;
      const title = found.title;
      const header = findHeader(page, title);
      const parent = header?.parentElement || page;
      const profile = mergeDashboardProfileWithAi(
        getDashboardProfile(),
        getLatestAiLearningProfile()
      );

      page.classList.add("cy-fixed-dashboard-page-safe");

      /*
        Critical fix:
        Use a root wrapper that is NOT the same class as the dashboard body.
        This prevents nested dashboard injection and weird repeated rendering bugs.
      */
      let root = page.querySelector(":scope .cy-demo-dashboard-runtime-root");

      if (!root) {
        page.querySelectorAll(".cy-demo-dash, .cy-fixed-dash").forEach((old) => {
          if (!old.closest(".cy-demo-dashboard-runtime-root")) {
            old.remove();
          }
        });

        root = document.createElement("section");
        root.className = "cy-demo-dashboard-runtime-root";

        if (header && header.parentElement) {
          parent.insertBefore(root, header.nextSibling);
        } else {
          page.appendChild(root);
        }
      }

      if (root.dataset.renderedProfile !== profile.key) {
        root.dataset.renderedProfile = profile.key;
        root.innerHTML = buildDashboardHtml(profile);
      }

      const rootRect = root.getBoundingClientRect();

      Array.from(parent.children).forEach((child) => {
        if (child === header || child === root || child.contains(root)) return;

        const text = normalize(child.textContent);
        const rect = child.getBoundingClientRect?.();

        if (!rect) return;

        const appearsBelowRoot = rect.top >= rootRect.top - 8;
        const isNavigation = text.includes("back to menu");

        if (appearsBelowRoot && !isNavigation) {
          child.classList.add("cy-fixed-dash__old-content-hidden");
        }
      });
    };

    let renderTimer = null;

    const scheduleRender = () => {
      clearTimeout(renderTimer);
      renderTimer = window.setTimeout(renderDashboard, 60);
      window.setTimeout(renderDashboard, 180);
      window.setTimeout(renderDashboard, 420);
    };

    renderDashboard();

    const observer = new MutationObserver(scheduleRender);

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["class", "style", "data-profile-key"],
    });

    document.addEventListener("click", scheduleRender, true);
    document.addEventListener("keydown", scheduleRender, true);
    window.addEventListener("storage", scheduleRender);
    window.addEventListener("resize", scheduleRender);

    return () => {
      clearTimeout(renderTimer);
      observer.disconnect();
      document.removeEventListener("click", scheduleRender, true);
      document.removeEventListener("keydown", scheduleRender, true);
      window.removeEventListener("storage", scheduleRender);
      window.removeEventListener("resize", scheduleRender);
    };
  }, []);





  // CYBRAXIS_ROBUST_SHIELD_HOVER_AND_HIDDEN_DEMO_RESTORE
  React.useEffect(() => {
    const getShield = () => document.querySelector(".cy-menu__hero-art");

    let lastPointer = null;
    let rafId = null;

    const applyGlowValues = (mainOpacity, outerOpacity, scale, blurBoost) => {
      const shield = getShield();
      if (!shield) return;

      shield.classList.add("cy-shield-robust-hover-glow");

      shield.style.setProperty("--cy-core-main-opacity", String(mainOpacity));
      shield.style.setProperty("--cy-core-outer-opacity", String(outerOpacity));
      shield.style.setProperty("--cy-core-glow-scale", String(scale));
      shield.style.setProperty("--cy-core-blur-boost", String(blurBoost));
    };

    const applyBaseGlow = () => {
      applyGlowValues(0.50, 0.38, 1, 0);
    };

    const applyGlowFromPointer = () => {
      rafId = null;

      const shield = getShield();
      if (!shield) return;

      shield.classList.add("cy-shield-robust-hover-glow");

      if (!lastPointer) {
        applyBaseGlow();
        return;
      }

      const rect = shield.getBoundingClientRect();

      if (!rect.width || !rect.height) {
        applyBaseGlow();
        return;
      }

      const paddingX = rect.width * 0.26;
      const paddingY = rect.height * 0.26;

      const insideShieldZone =
        lastPointer.x >= rect.left - paddingX &&
        lastPointer.x <= rect.right + paddingX &&
        lastPointer.y >= rect.top - paddingY &&
        lastPointer.y <= rect.bottom + paddingY;

      if (!insideShieldZone) {
        applyBaseGlow();
        return;
      }

      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height * 0.47;

      const dx = lastPointer.x - centerX;
      const dy = lastPointer.y - centerY;

      const distance = Math.sqrt(dx * dx + dy * dy);
      const maxDistance = Math.max(rect.width, rect.height) * 0.74;
      const proximity = Math.max(0, 1 - distance / maxDistance);

      /*
        Base glow stays soft.
        Hover glow reaches the approved screenshot-level brightness.
        The glow remains centered; cursor controls intensity only.
      */
      const mainOpacity = 0.78 + proximity * 0.17;
      const outerOpacity = 0.56 + proximity * 0.26;
      const scale = 1.008 + proximity * 0.045;
      const blurBoost = proximity * 6;

      applyGlowValues(
        mainOpacity.toFixed(2),
        outerOpacity.toFixed(2),
        scale.toFixed(3),
        blurBoost.toFixed(1)
      );
    };

    const scheduleGlowUpdate = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(applyGlowFromPointer);
    };

    const handlePointerMove = (event) => {
      lastPointer = {
        x: event.clientX,
        y: event.clientY,
      };

      scheduleGlowUpdate();
    };

    const handlePointerLeaveWindow = () => {
      lastPointer = null;
      applyBaseGlow();
    };

    const restoreDemoProfiles = (forceReset = false) => {
      const demoPlayers = [
        {
          id: "demo-student-analyst",
          name: "Student Analyst",
          role: "SOC Trainee",
          createdAt: new Date().toISOString(),
        },
        {
          id: "demo-strong-performance",
          name: "Strong Performance User",
          role: "SOC Trainee",
          createdAt: new Date().toISOString(),
        },
        {
          id: "demo-remediation-user",
          name: "Remediation Demo User",
          role: "SOC Trainee",
          createdAt: new Date().toISOString(),
        },
        {
          id: "demo-fresh-learner",
          name: "Fresh Learner",
          role: "SOC Trainee",
          createdAt: new Date().toISOString(),
        },
      ];

      const demoScenarioIds = Object.keys(SCENARIO_BUNDLES || {});
      const demoScenario1AId =
        SCENARIO_BUNDLES?.scenario1
          ? "scenario1"
          : demoScenarioIds[0] || "";
      const demoScenario1BId = findScenario1BKey() || demoScenario1AId;
      const demoScenario2Id = "scenario2_silent_beacon";
      const demoScenario2AdvancedStage = Math.max(
        0,
        Math.min(getScenarioStageCount(demoScenario2Id) - 1, 4)
      );

      const demoSnapshots = {
        "demo-student-analyst": {
          cybraxisPlayerName: "Student Analyst",
          cybraxisDemoProfileType: "baseline",
          cybraxisDemoSummary: "Baseline learner already progressing through the first investigation.",
          cybraxisLastScenarioId: demoScenario1AId,
          cybraxisLastStageIndex: "2",
          cybraxisHasTrainingProgress: "true",
          cybraxisStartedScenarioIds: JSON.stringify([demoScenario1AId]),
        },
        "demo-strong-performance": {
          cybraxisPlayerName: "Strong Performance User",
          cybraxisDemoProfileType: "strong",
          cybraxisDemoSummary: "Advanced learner already progressing through Silent Beacon.",
          cybraxisLastScenarioId: demoScenario2Id,
          cybraxisLastStageIndex: "4",
          cybraxisHasTrainingProgress: "true",
          cybraxisStartedScenarioIds: JSON.stringify([demoScenario1AId, demoScenario1BId, demoScenario2Id]),
          cybraxisLatestAiLearningProfile: JSON.stringify({
            enabled: true,
            interventionCount: 1,
            liveInterventionCount: 1,
            fallbackCount: 0,
            primaryMisconception: "none",
            primaryMisconceptionLabel: "No major misconception detected",
            primaryFocus: "interpretation",
            primaryFocusLabel: "Interpretation",
            supportLevel: "low",
            progressionRecommendation: "continue_next_challenge",
            primaryImprovementArea: "Scenario 2 investigation consistency",
            dashboardRecommendation: "Continue Silent Beacon and complete the advanced beacon investigation.",
            recommendations: [
              "Continue Silent Beacon and complete the advanced beacon investigation."
            ],
            observations: [
              "The learner has progressed beyond Scenario 1 and is handling Scenario 2 beacon-style investigation tasks."
            ],
            generatedAt: new Date().toISOString()
          }),
        },
        "demo-remediation-user": {
          cybraxisPlayerName: "Remediation Demo User",
          cybraxisDemoProfileType: "remediation",
          cybraxisDemoSummary: "Learner in Scenario 1B with evidence-completion weakness visible.",
          cybraxisLastScenarioId: demoScenario1BId,
          cybraxisLastStageIndex: "2",
          cybraxisHasTrainingProgress: "true",
          cybraxisStartedScenarioIds: JSON.stringify([demoScenario1AId, demoScenario1BId]),
          cybraxisRemedyPassed: "false",
          cybraxisLatestAiLearningProfile: JSON.stringify({
            enabled: true,
            interventionCount: 4,
            liveInterventionCount: 4,
            fallbackCount: 0,
            primaryMisconception: "incomplete_evidence",
            primaryMisconceptionLabel: "Incomplete evidence",
            primaryFocus: "activity/evidence",
            primaryFocusLabel: "Activity/evidence",
            supportLevel: "medium",
            progressionRecommendation: "send_to_remedy_evidence_completion",
            primaryImprovementArea: "Investigation evidence completion",
            dashboardRecommendation: "Revisit activity/evidence checks before final containment decisions.",
            recommendations: [
              "Revisit activity/evidence checks before final containment decisions."
            ],
            observations: [
              "The learner shows incomplete evidence collection before response decisions."
            ],
            generatedAt: new Date().toISOString()
          }),
        },
        "demo-fresh-learner": {
          cybraxisPlayerName: "Fresh Learner",
          cybraxisDemoProfileType: "fresh",
          cybraxisDemoSummary: "Empty learner profile with no saved scenario progress.",
          cybraxisHasTrainingProgress: "false",
        },
      };

      try {
        window.localStorage.setItem("cybraxisPlayers", JSON.stringify(demoPlayers));
        window.localStorage.setItem("cybraxisCurrentPlayerId", demoPlayers[0].id);
        window.localStorage.setItem("cybraxisPlayerName", demoPlayers[0].name);

        Object.entries(demoSnapshots).forEach(([id, snapshot]) => {
          const progressKey = "cybraxisUserProgress:" + id;
          let existingSnapshot = {};

          try {
            existingSnapshot = JSON.parse(window.localStorage.getItem(progressKey) || "{}") || {};
          } catch {
            existingSnapshot = {};
          }

          const existingHasScenarioProgress =
            !forceReset &&
            (
              Boolean(existingSnapshot.cybraxisLastScenarioId) ||
              Number.parseInt(existingSnapshot.cybraxisLastStageIndex || "0", 10) > 0 ||
              existingSnapshot.cybraxisHasTrainingProgress === "true"
            );

          window.localStorage.setItem(
            progressKey,
            JSON.stringify(
              existingHasScenarioProgress
                ? {
                    ...snapshot,
                    ...existingSnapshot,
                    cybraxisPlayerName: existingSnapshot.cybraxisPlayerName || snapshot.cybraxisPlayerName,
                  }
                : snapshot
            )
          );
        });

        const activeDemoProgressKey = "cybraxisUserProgress:" + demoPlayers[0].id;
        let activeDemoSnapshot = demoSnapshots[demoPlayers[0].id];

        try {
          activeDemoSnapshot =
            JSON.parse(window.localStorage.getItem(activeDemoProgressKey) || "{}") ||
            demoSnapshots[demoPlayers[0].id];
        } catch {
          activeDemoSnapshot = demoSnapshots[demoPlayers[0].id];
        }

        Object.entries(activeDemoSnapshot).forEach(([key, value]) => {
          if (typeof value === "string") {
            window.localStorage.setItem(key, value);
          }
        });

        console.info("Cybraxis demo profiles restored. Reloading...");
        window.location.reload();
      } catch (error) {
        console.warn("Could not restore Cybraxis demo profiles.", error);
      }
    };

    window.cybraxisRestoreDemoProfiles = () => restoreDemoProfiles(true);

    const handleHiddenShortcut = (event) => {
      const isRestoreShortcut =
        event.ctrlKey &&
        event.shiftKey &&
        event.altKey &&
        String(event.key || "").toLowerCase() === "d";

      if (!isRestoreShortcut) return;

      event.preventDefault();

      const confirmed = window.confirm(
        "Restore Cybraxis demo learner profiles? This replaces the current local learner profile list."
      );

      if (confirmed) {
        restoreDemoProfiles();
      }
    };

    applyBaseGlow();

    const observer = new MutationObserver(() => {
      const shield = getShield();
      if (shield) {
        shield.classList.add("cy-shield-robust-hover-glow");
      }

      scheduleGlowUpdate();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    document.addEventListener("pointermove", handlePointerMove, {
      capture: true,
      passive: true,
    });

    document.addEventListener("keydown", handleHiddenShortcut, true);
    window.addEventListener("blur", handlePointerLeaveWindow);
    window.addEventListener("resize", scheduleGlowUpdate);

    return () => {
      observer.disconnect();

      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }

      document.removeEventListener("pointermove", handlePointerMove, true);
      document.removeEventListener("keydown", handleHiddenShortcut, true);
      window.removeEventListener("blur", handlePointerLeaveWindow);
      window.removeEventListener("resize", scheduleGlowUpdate);

      if (window.cybraxisRestoreDemoProfiles === restoreDemoProfiles) {
        delete window.cybraxisRestoreDemoProfiles;
      }
    };
  }, []);














  // CYBRAXIS_FORCE_SAFE_MAIN_MENU_CHANGES
  React.useEffect(() => {
    const progressPrefix = "cybraxisUserProgress:";

    const normalize = (value) => String(value || "").trim().toLowerCase();

    const readPlayers = () => {
      try {
        const parsed = JSON.parse(window.localStorage.getItem("cybraxisPlayers") || "[]");
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    };

    const findHomeTitle = () => {
      return Array.from(document.querySelectorAll("h1, h2"))
        .find((element) => {
          const text = normalize(element.textContent);
          return text.includes("adaptive soc learning") && text.includes("investigation");
        });
    };

    const applyTitle = () => {
      const title = findHomeTitle();
      if (!title) return;

      title.textContent = "Adaptive SOC Learning & Investigation Platform";
      title.classList.add("cy-force-home-title-safe");

      title.style.setProperty("font-size", "52px", "important");
      title.style.setProperty("line-height", "1.02", "important");
      title.style.setProperty("letter-spacing", "-0.045em", "important");
      title.style.setProperty("max-width", "860px", "important");
    };

    const applyHeroClasses = () => {
      const title = findHomeTitle();
      if (!title) return;

      const menuRoot = title.closest(".cy-menu") || document.querySelector(".cy-menu");
      if (menuRoot) menuRoot.classList.add("cy-force-menu-safe");

      const shield = document.querySelector(".cy-menu__hero-art");
      if (shield && (!menuRoot || menuRoot.contains(shield))) {
        shield.classList.add("cy-force-shield-safe");
      }

      const activeName = normalize(window.localStorage.getItem("cybraxisPlayerName") || "Student Analyst");

      Array.from(document.querySelectorAll("div, section, article")).forEach((element) => {
        element.classList.remove("cy-force-current-player-safe");
      });

      const currentPlayerCard = Array.from(document.querySelectorAll("div, section, article"))
        .filter((element) => {
          const text = normalize(element.textContent);
          const rect = element.getBoundingClientRect?.();

          return (
            rect &&
            text.includes("current player") &&
            text.includes(activeName) &&
            !text.includes("choose user") &&
            !text.includes("restore demo profiles") &&
            rect.width >= 220 &&
            rect.width <= 620 &&
            rect.height >= 70 &&
            rect.height <= 260
          );
        })
        .sort((a, b) => {
          const ar = a.getBoundingClientRect();
          const br = b.getBoundingClientRect();
          return (ar.width * ar.height) - (br.width * br.height);
        })[0];

      if (currentPlayerCard) {
        currentPlayerCard.classList.add("cy-force-current-player-safe");
      }

      const players = readPlayers();
      const names = players.map((player) => normalize(player?.name)).filter(Boolean);

      const dropdown = Array.from(document.querySelectorAll("div, section, article"))
        .filter((element) => {
          const text = normalize(element.textContent);
          const rect = element.getBoundingClientRect?.();

          return (
            rect &&
            text.includes("choose user") &&
            text.includes("new user") &&
            names.some((name) => text.includes(name)) &&
            rect.width >= 250 &&
            rect.width <= 560 &&
            rect.height >= 100 &&
            rect.height <= 650
          );
        })
        .sort((a, b) => {
          const ar = a.getBoundingClientRect();
          const br = b.getBoundingClientRect();
          return (ar.width * ar.height) - (br.width * br.height);
        })[0];

      if (dropdown) {
        dropdown.classList.add("cy-force-user-dropdown-safe");
      }
    };

    const restoreSnapshotToActiveStorage = (userId, fallbackName) => {
      try {
        const raw = window.localStorage.getItem(progressPrefix + userId);
        const snapshot = raw ? JSON.parse(raw) : {};

        Object.keys(window.localStorage || {}).forEach((key) => {
          const isCybraxisKey = key && key.startsWith("cybraxis");
          const isCoreUserKey =
            key === "cybraxisPlayers" ||
            key === "cybraxisCurrentPlayerId" ||
            key === "cybraxisPlayerName";
          const isSnapshotKey = key && key.startsWith(progressPrefix);

          if (isCybraxisKey && !isCoreUserKey && !isSnapshotKey) {
            window.localStorage.removeItem(key);
          }
        });

        Object.entries(snapshot || {}).forEach(([key, value]) => {
          window.localStorage.setItem(key, String(value));
        });

        window.localStorage.setItem(
          "cybraxisPlayerName",
          snapshot.cybraxisPlayerName || fallbackName || "Student Analyst"
        );
      } catch (error) {
        console.warn("Could not restore fallback learner profile snapshot.", error);
      }
    };

    const deleteCurrentUser = () => {
      const players = readPlayers();
      const currentId = window.localStorage.getItem("cybraxisCurrentPlayerId") || "";

      if (!players.length || players.length <= 1) {
        window.alert("At least one learner profile must remain.");
        return;
      }

      const currentPlayer =
        players.find((player) => player && player.id === currentId) ||
        players[0];

      const confirmed = window.confirm(
        'Delete "' +
          (currentPlayer.name || "current user") +
          '"? This removes this local learner profile and its saved progress.'
      );

      if (!confirmed) return;

      const nextPlayers = players.filter(
        (player) => player && player.id !== currentPlayer.id
      );

      const fallbackPlayer = nextPlayers[0];

      try {
        window.localStorage.removeItem(progressPrefix + currentPlayer.id);
      } catch {}

      window.localStorage.setItem("cybraxisPlayers", JSON.stringify(nextPlayers));
      window.localStorage.setItem("cybraxisCurrentPlayerId", fallbackPlayer.id);
      window.localStorage.setItem("cybraxisPlayerName", fallbackPlayer.name || "Student Analyst");

      restoreSnapshotToActiveStorage(fallbackPlayer.id, fallbackPlayer.name);
      window.location.reload();
    };

    const findProfilePanel = () => {
      const profileTitle = Array.from(document.querySelectorAll("h1, h2"))
        .find((element) => normalize(element.textContent) === "profile");

      const selectionTitle = Array.from(document.querySelectorAll("h1, h2, h3, div, span, strong"))
        .find((element) => normalize(element.textContent) === "player selection");

      if (!profileTitle || !selectionTitle) return null;

      let node = selectionTitle;

      for (let i = 0; i < 10 && node; i += 1) {
        const rect = node.getBoundingClientRect?.();
        const text = normalize(node.textContent);

        if (
          rect &&
          rect.width >= 330 &&
          rect.height >= 240 &&
          text.includes("player selection") &&
          text.includes("new user")
        ) {
          return node;
        }

        node = node.parentElement;
      }

      return selectionTitle.parentElement;
    };

    const applyProfileDelete = () => {
      const panel = findProfilePanel();
      if (!panel) return;

      panel.classList.add("cy-force-profile-panel-safe");

      Array.from(panel.querySelectorAll("button")).forEach((button) => {
        const text = normalize(button.textContent);

        if (
          text === "delete current user" &&
          !button.classList.contains("cy-force-delete-user-safe")
        ) {
          button.remove();
        }
      });

      let button = panel.querySelector(".cy-force-delete-user-safe");

      if (!button) {
        button = document.createElement("button");
        button.type = "button";
        button.className = "cy-force-delete-user-safe";
        button.textContent = "Delete Current User";
        button.addEventListener("click", deleteCurrentUser);
      }

      const players = readPlayers();
      const names = players.map((player) => normalize(player?.name)).filter(Boolean);

      const firstUserRow = Array.from(panel.querySelectorAll("button, div, article, section"))
        .filter((element) => {
          const text = normalize(element.textContent);
          const rect = element.getBoundingClientRect?.();

          if (!rect || rect.width < 220 || rect.height < 32 || rect.height > 120) return false;

          return names.some((name) => text.includes(name));
        })
        .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)[0];

      if (firstUserRow && firstUserRow.parentElement) {
        firstUserRow.parentElement.insertBefore(button, firstUserRow);
      } else {
        panel.appendChild(button);
      }

      button.disabled = players.length <= 1;
      button.title =
        players.length <= 1
          ? "At least one learner profile must remain"
          : "Delete the selected learner profile";
    };

    const applyProfileScrollbar = () => {
      const panel = findProfilePanel();
      if (!panel) return;

      const menuRoot = panel.closest(".cy-menu") || document.querySelector(".cy-menu");
      if (!menuRoot) return;

      menuRoot.classList.add("cy-force-profile-scroll-root-safe");

      Array.from(menuRoot.querySelectorAll("*")).forEach((element) => {
        if (element === menuRoot) return;

        const rect = element.getBoundingClientRect?.();
        if (!rect || rect.height < 90) return;

        const computed = window.getComputedStyle(element);
        const scrollable =
          computed.overflowY === "auto" ||
          computed.overflowY === "scroll" ||
          element.scrollHeight > element.clientHeight + 22;

        if (scrollable) {
          element.classList.add("cy-force-profile-no-inner-scroll-safe");
        }
      });
    };

    const run = () => {
      applyTitle();
      applyHeroClasses();
      applyProfileDelete();
      applyProfileScrollbar();
    };

    run();

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(run);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    window.addEventListener("click", run, true);
    window.addEventListener("resize", run);

    return () => {
      observer.disconnect();
      window.removeEventListener("click", run, true);
      window.removeEventListener("resize", run);
    };
  }, []);


  // CYBRAXIS_FIX_FUNDAMENTALS_FIRST_OPEN_SCROLL_AND_LABEL
  React.useEffect(() => {
    const categoryLabels = new Set([
      "CORE BEHAVIOR",
      "THEORY BASE",
      "DEFENSE LAYER",
      "USER CONTEXT",
      "TRAFFIC CONTEXT",
      "SCENARIO LOGIC",
      "EVIDENCE CONTEXT",
      "NETWORK CONTEXT",
      "RESPONSE CONTEXT",
      "CAMPAIGN LOGIC",
      "INVESTIGATION FLOW",
    ]);

    const isFundamentalsPage = () => {
      const text = String(document.body?.textContent || "");
      return text.includes("Revise Fundamentals") && text.includes("Cybersecurity Investigation Basics");
    };

    const getFundamentalsShell = () => {
      const titleNode = Array.from(document.querySelectorAll("h1, h2, h3, div, section"))
        .find((node) => String(node.textContent || "").includes("Cybersecurity Investigation Basics"));

      if (!titleNode) return null;

      return (
        titleNode.closest(".cy-menu__shell--wide") ||
        titleNode.closest(".cy-menu__shell") ||
        titleNode.closest(".cy-menu") ||
        document.querySelector(".cy-menu")
      );
    };

    const applyFixes = () => {
      if (!isFundamentalsPage()) return;

      const shell = getFundamentalsShell();
      if (!shell) return;

      shell.classList.add("cy-menu__fundamentals-single-scroll-locked");

      document.documentElement.classList.add("cy-menu__fundamentals-document-lock");
      document.body.classList.add("cy-menu__fundamentals-document-lock");

      const root = document.getElementById("root");
      if (root) root.classList.add("cy-menu__fundamentals-document-lock");

      const descendants = Array.from(shell.querySelectorAll("*"));

      descendants.forEach((element) => {
        const className = String(element.className || "");
        const text = String(element.textContent || "").trim().toUpperCase();

        if (categoryLabels.has(text)) {
          element.classList.add("cy-menu__accordion-category-left-locked");
        }

        if (text === "SHOW" || text === "HIDE") {
          element.classList.add("cy-menu__forced-show-hide-button");
        }

        if (element === shell) return;

        if (
          className.includes("user-switcher") ||
          className.includes("dropdown") ||
          className.includes("modal")
        ) {
          return;
        }

        const computed = window.getComputedStyle(element);
        const scrollable =
          computed.overflowY === "auto" ||
          computed.overflowY === "scroll" ||
          element.scrollHeight > element.clientHeight + 20;

        if (scrollable) {
          element.classList.add("cy-menu__fundamentals-nested-scroll-removed");
        }
      });
    };

    const releaseIfNotFundamentals = () => {
      if (isFundamentalsPage()) return;

      document.documentElement.classList.remove("cy-menu__fundamentals-document-lock");
      document.body.classList.remove("cy-menu__fundamentals-document-lock");

      const root = document.getElementById("root");
      if (root) root.classList.remove("cy-menu__fundamentals-document-lock");
    };

    const runBurst = () => {
      applyFixes();
      releaseIfNotFundamentals();

      [50, 120, 250, 500, 900, 1400, 2200].forEach((delay) => {
        window.setTimeout(() => {
          applyFixes();
          releaseIfNotFundamentals();
        }, delay);
      });
    };

    runBurst();

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(runBurst);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    window.addEventListener("click", runBurst, true);
    window.addEventListener("resize", runBurst);

    return () => {
      observer.disconnect();
      window.removeEventListener("click", runBurst, true);
      window.removeEventListener("resize", runBurst);
    };
  }, []);


  // CYBRAXIS_FORCE_SHOW_HIDE_BUTTON_ONLY
  React.useEffect(() => {
    const applyShowHideButton = () => {
      const isFundamentals =
        String(document.body?.textContent || "").includes("Revise Fundamentals") &&
        String(document.body?.textContent || "").includes("Cybersecurity Investigation Basics");

      if (!isFundamentals) return;

      const headers = Array.from(document.querySelectorAll(".cy-menu__accordion-head"));

      headers.forEach((header) => {
        const candidates = Array.from(header.querySelectorAll("button, span, div, small, em, strong"));

        candidates.forEach((element) => {
          const text = String(element.textContent || "").trim().toUpperCase();

          if (text !== "SHOW" && text !== "HIDE") return;

          element.classList.add("cy-menu__forced-show-hide-button");

          element.style.setProperty("display", "inline-flex", "important");
          element.style.setProperty("align-items", "center", "important");
          element.style.setProperty("justify-content", "center", "important");
          element.style.setProperty("min-width", "78px", "important");
          element.style.setProperty("height", "32px", "important");
          element.style.setProperty("padding", "0 16px", "important");
          element.style.setProperty("border", "1px solid rgba(255, 215, 64, 0.62)", "important");
          element.style.setProperty("border-radius", "999px", "important");
          element.style.setProperty("background", "linear-gradient(180deg, rgba(255, 215, 64, 0.16), rgba(255, 215, 64, 0.045))", "important");
          element.style.setProperty("color", "#ffd740", "important");
          element.style.setProperty("font-size", "10px", "important");
          element.style.setProperty("line-height", "1", "important");
          element.style.setProperty("letter-spacing", "0.18em", "important");
          element.style.setProperty("font-weight", "900", "important");
          element.style.setProperty("text-transform", "uppercase", "important");
          element.style.setProperty("box-shadow", "0 0 16px rgba(255, 215, 64, 0.18), inset 0 0 14px rgba(255, 215, 64, 0.055)", "important");
          element.style.setProperty("cursor", "pointer", "important");
          element.style.setProperty("white-space", "nowrap", "important");
        });
      });
    };

    applyShowHideButton();

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(applyShowHideButton);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, []);


  // CYBRAXIS_FINAL_ACCORDION_LABEL_BUTTON_FIX
  React.useEffect(() => {
    const categoryLabels = new Set([
      "CORE BEHAVIOR",
      "THEORY BASE",
      "DEFENSE LAYER",
      "USER CONTEXT",
      "TRAFFIC CONTEXT",
      "EVIDENCE CONTEXT",
      "NETWORK CONTEXT",
      "RESPONSE CONTEXT",
    ]);

    const applyAccordionLabelFix = () => {
      const isFundamentals =
        String(document.body?.textContent || "").includes("Revise Fundamentals") &&
        String(document.body?.textContent || "").includes("Cybersecurity Investigation Basics");

      if (!isFundamentals) return;

      document.querySelectorAll(".cy-menu__accordion-head").forEach((head) => {
        Array.from(head.querySelectorAll("span, button, div, small, strong")).forEach((element) => {
          const text = String(element.textContent || "").trim().toUpperCase();

          if (categoryLabels.has(text)) {
            element.classList.add("cy-menu__accordion-category-final");
          }

          if (text === "SHOW" || text === "HIDE") {
            element.classList.add("cy-menu__accordion-toggle-button-final");
          }
        });
      });
    };

    applyAccordionLabelFix();

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(applyAccordionLabelFix);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, []);


  // CYBRAXIS_REMOVE_TOPIC_BADGES_ONLY
  React.useEffect(() => {
    const hiddenLabels = new Set(["SOC", "RISK", "CTRL", "IOC", "LOG", "NET", "ID", "FW", "PATH", "MAP"]);

    const cleanupBadTopicBadges = () => {
      const fundamentalsPage =
        String(document.body?.textContent || "").includes("Revise Fundamentals") &&
        String(document.body?.textContent || "").includes("Cybersecurity Investigation Basics");

      if (!fundamentalsPage) return;

      document
        .querySelectorAll(".cy-menu__soft-topic-word, .cy-menu__fundamental-topic-mark, .cy-menu__fundamental-chip, .cy-menu__topic-orb, .cy-menu__library-orb, .cy-menu__revision-orb, .cy-menu__knowledge-orb, .cy-menu__fundamentals-orb, .cy-menu__topic-symbol")
        .forEach((element) => {
          element.classList.add("cy-menu__remove-topic-badge-final");
        });

      document.querySelectorAll(".cy-menu__accordion-body span, .cy-menu__accordion-body div, .cy-menu__accordion-body em, .cy-menu__accordion-body strong").forEach((element) => {
        const text = String(element.textContent || "").trim().toUpperCase();
        if (hiddenLabels.has(text)) {
          element.classList.add("cy-menu__remove-topic-badge-final");
        }
      });
    };

    cleanupBadTopicBadges();

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(cleanupBadTopicBadges);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, []);


  // CYBRAXIS_FINAL_CLEAN_AURA_AND_FUNDAMENTALS
  React.useEffect(() => {
    const root =
      document.querySelector(".cy-menu") ||
      document.querySelector("[class*='cy-menu']");

    const hero =
      document.querySelector(".cy-menu__hero--home") ||
      document.querySelector(".cy-menu__hero");

    const shield = document.querySelector(".cy-menu__hero-art");

    if (!root) return;

    const removeBadAuraNodes = () => {
      document
        .querySelectorAll(".cy-menu__shield-electrons-final, .cy-menu__shield-live-aura-v2, .cy-menu__electron, .cy-electron-final")
        .forEach((node) => node.remove());
    };

    const applyFundamentalsScrollFix = () => {
      const fundamentalsTitle = Array.from(document.querySelectorAll("h1, h2, h3, div, section"))
        .find((node) => String(node.textContent || "").includes("Cybersecurity Investigation Basics"));

      if (!fundamentalsTitle) return;

      const shell =
        fundamentalsTitle.closest(".cy-menu__shell--wide") ||
        fundamentalsTitle.closest(".cy-menu__shell") ||
        fundamentalsTitle.closest(".cy-menu") ||
        root;

      if (!shell) return;

      shell.classList.add("cy-menu__single-scroll-shell-final");

      const descendants = shell.querySelectorAll("*");
      descendants.forEach((element) => {
        if (element === shell) return;

        const style = window.getComputedStyle(element);
        const overflowY = style.overflowY;

        if (overflowY === "auto" || overflowY === "scroll" || element.scrollHeight > element.clientHeight + 20) {
          element.classList.add("cy-menu__kill-nested-scroll-final");
        }
      });
    };

    const applyGlow = () => {
      if (!hero || !shield) return;

      hero.classList.add("cy-menu__hero--final-clean-glow");
      shield.classList.add("cy-menu__hero-art--final-clean-glow");

      removeBadAuraNodes();

      const updateGlow = (event) => {
        const rect = shield.getBoundingClientRect();
        if (!rect.width || !rect.height) return;

        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const dx = Math.max(-18, Math.min(18, (event.clientX - centerX) * 0.04));
        const dy = Math.max(-14, Math.min(14, (event.clientY - centerY) * 0.04));

        shield.style.setProperty("--cy-final-glow-x", dx.toFixed(1) + "px");
        shield.style.setProperty("--cy-final-glow-y", dy.toFixed(1) + "px");
        shield.style.setProperty("--cy-final-glow-opacity", "1");
      };

      const resetGlow = () => {
        shield.style.setProperty("--cy-final-glow-x", "0px");
        shield.style.setProperty("--cy-final-glow-y", "0px");
        shield.style.setProperty("--cy-final-glow-opacity", "0.95");
      };

      hero.addEventListener("pointermove", updateGlow);
      hero.addEventListener("pointerleave", resetGlow);
      resetGlow();

      return () => {
        hero.removeEventListener("pointermove", updateGlow);
        hero.removeEventListener("pointerleave", resetGlow);
      };
    };

    const cleanupGlow = applyGlow();

    applyFundamentalsScrollFix();

    const observer = new MutationObserver(() => {
      removeBadAuraNodes();
      applyFundamentalsScrollFix();
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
    });

    const timerOne = window.setTimeout(applyFundamentalsScrollFix, 200);
    const timerTwo = window.setTimeout(applyFundamentalsScrollFix, 700);

    return () => {
      observer.disconnect();
      window.clearTimeout(timerOne);
      window.clearTimeout(timerTwo);
      if (typeof cleanupGlow === "function") cleanupGlow();
    };
  }, []);
















  const [view, setView] = useState(initialView || "home");
  const [openFundamental, setOpenFundamental] = useState("mindset");
  const [players, setPlayers] = useState(() => readPlayers());
  const [activeUserId, setActiveUserId] = useState(() =>
    readCurrentPlayerId(readPlayers())
  );
  const [userSwitcherOpen, setUserSwitcherOpen] = useState(false);

  React.useEffect(() => {
    cybraxisSeedDemoDashboardStageScores();
  }, [players]); // CYBRAXIS_DEMO_DASHBOARD_STAGE_SCORE_SEEDING_EFFECT

  React.useEffect(() => {
    if (typeof document === "undefined") return undefined;

    document.body.classList.toggle("cy-dashboard-single-scroll-mode", view === "dashboard");

    return () => {
      document.body.classList.remove("cy-dashboard-single-scroll-mode");
    };
  }, [view]); // CYBRAXIS_DASHBOARD_SINGLE_SCROLL_MODE

  const currentPlayer = getCurrentPlayer(players, activeUserId);

  const [playerName, setPlayerName] = useState(() =>
    currentPlayer.name || "Student Analyst"
  );
  // CYBRAXIS_PROFILE_ACCOUNT_STATE_START
  const [profileUsername, setProfileUsername] = useState(() => currentPlayer.username || "");
  const [mentorPreference, setMentorPreference] = useState(() => currentPlayer.mentorPreference || "standard");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileNotice, setProfileNotice] = useState("");
  const [profileError, setProfileError] = useState("");

  useEffect(() => {
    const refreshedPlayer =
      players.find((player) => player && player.id === activeUserId) ||
      currentPlayer;

    setProfileUsername(refreshedPlayer.username || "");
    setMentorPreference(refreshedPlayer.mentorPreference || "standard");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setProfileNotice("");
    setProfileError("");
  }, [activeUserId, players]);
  // CYBRAXIS_PROFILE_ACCOUNT_STATE_END



  const scenario1BKey = useMemo(() => findScenario1BKey(), []);

  const resumeState = useMemo(() => {
    const snapshot = readUserProgressSnapshot(activeUserId);
    const scenarioId = String(
      snapshot?.cybraxisLastScenarioId ||
      readString("cybraxisLastScenarioId", "") ||
      ""
    );

    const rawStage = String(
      snapshot?.cybraxisLastStageIndex ||
      readString("cybraxisLastStageIndex", "0") ||
      "0"
    );

    const stageIndex = Math.max(0, Number.parseInt(rawStage, 10) || 0);
    const bundle = SCENARIO_BUNDLES?.[scenarioId] || null;

    return {
      available: Boolean(scenarioId && bundle),
      scenarioId,
      stageIndex,
      title: scenarioId
        ? formatResumeScenarioTitle(
            scenarioId,
            getScenarioTitle(bundle, scenarioId)
          )
        : "No saved scenario",
    };
  }, [view, activeUserId, players]);




  const dashboard = useMemo(() => {
    const parseJson = (value, fallback) => {
      try {
        if (Array.isArray(value) || (value && typeof value === "object")) return value;
        if (typeof value === "string" && value.trim()) return JSON.parse(value);
        return fallback;
      } catch {
        return fallback;
      }
    };

    const cleanDashboardText = (value, fallback = "") => {
      const raw = String(value || fallback || "");

      return raw
        .replace(/continue with\s+(?:an?\s+)?(?:equivalent\s+)?(?:new\s+)?scenario\s+(?:variant|challenge)\s+for\s+stronger\s+challenge\./gi, "Continue with the next scenario challenge when ready.")
        .replace(/unlock\s+(?:an?\s+)?equivalent\s+(?:new\s+)?scenario\s+variant[^.]*\./gi, "Continue with the next scenario challenge when ready.")
        .replace(/equivalent\s+(?:new\s+)?scenario\s+variant/gi, "next scenario challenge")
        .replace(/scenario\s+variant/gi, "scenario challenge")
        .replace(/variant\s+unlock/gi, "next challenge")
        .replace(/\bvariants\b/gi, "scenario challenges")
        .replace(/\bvariant\b/gi, "scenario")
        .replace(/\ban\s+next\b/gi, "the next")
        .replace(/\ba\s+next\b/gi, "the next")
        .trim();
    };

    const canonicalScenarioId = (scenarioId = "") => {
      const id = String(scenarioId || "").toLowerCase();

      if (
        id.includes("scenario2") ||
        id.includes("silent_beacon") ||
        id.includes("silent-beacon") ||
        id === "silent_beacon_1"
      ) {
        return "scenario2_silent_beacon";
      }

      if (
        id.includes("1b") ||
        id.includes("south_bridge") ||
        id.includes("south-bridge")
      ) {
        return "external_recon_to_exfiltration_1b";
      }

      if (
        id.includes("scenario1") ||
        id.includes("external_recon") ||
        id.includes("perimeter")
      ) {
        return "external_recon_to_exfiltration";
      }

      return String(scenarioId || "unknown_scenario");
    };

    const scenarioLabel = (scenarioId = "") => {
      const id = canonicalScenarioId(scenarioId);

      if (id === "scenario2_silent_beacon") return "Silent Beacon";
      if (id === "external_recon_to_exfiltration_1b") return "South Bridge Pivot";
      if (id === "external_recon_to_exfiltration") return "Perimeter Breach";

      return String(scenarioId || "No scenario yet")
        .replace(/^scenario:/, "")
        .replace(/_/g, " ")
        .replace(/\\b\\w/g, letter => letter.toUpperCase());
    };

    const scenarioStageTotal = (scenarioId = "", observedCount = 0) => {
      const id = canonicalScenarioId(scenarioId);
      const bundle =
        SCENARIO_BUNDLES?.[id] ||
        SCENARIO_BUNDLES?.[scenarioId] ||
        null;

      const stageList =
        bundle?.scenarioData?.stages ||
        bundle?.scenario?.stages ||
        bundle?.stages ||
        [];

      const definedTotal = Array.isArray(stageList) ? stageList.length : 0;

      if (definedTotal > 0) {
        return Math.max(definedTotal, observedCount);
      }

      if (id === "scenario2_silent_beacon") return Math.max(5, observedCount);
      if (id === "external_recon_to_exfiltration_1b") return Math.max(5, observedCount);
      if (id === "external_recon_to_exfiltration") return Math.max(5, observedCount);

      return Math.max(observedCount, 0);
    };

    const getScore = (entry = {}) => {
      const value = Number(
        entry?.totalStageScore ??
        entry?.totalScore ??
        entry?.stageScore ??
        entry?.score ??
        entry?.scoreSummary?.totalStageScore ??
        entry?.scoreSummary?.stageScore ??
        entry?.scoreSummary?.score ??
        entry?.summary?.totalStageScore ??
        entry?.summary?.stageScore ??
        entry?.summary?.score ??
        0
      );

      return Number.isFinite(value) ? Math.round(value) : 0;
    };

    const allKeys =
      typeof window !== "undefined"
        ? Object.keys(window.localStorage).filter(key => key.startsWith("cybraxisScenarioStageScores:"))
        : [];

    const activeUserKeys = allKeys.filter(key =>
      activeUserId && key.startsWith("cybraxisScenarioStageScores:" + activeUserId + ":")
    );

    /*
      Active-user only:
      A learner with no rows must stay pending and must never inherit another user's dashboard.
    */
    const keysToRead = activeUserId ? activeUserKeys : allKeys;

    const rawRows = keysToRead.flatMap(key => {
      const parts = key.split(":");
      const rawScenarioId = parts.slice(2).join(":") || "unknown_scenario";
      const scenarioId = canonicalScenarioId(rawScenarioId);
      const raw = parseJson(window.localStorage.getItem(key), []);
      const list = Array.isArray(raw) ? raw : [];

      return list.map((entry, index) => {
        const score = getScore(entry);

        const passEvidence =
          entry?.passed === true ||
          entry?.outcome?.passed === true ||
          score >= 65;

        const rawTimedOut =
          entry?.timedOut === true ||
          entry?.outcome?.timedOut === true;

        return {
          scenarioId,
          stageIndex: Number.isFinite(Number(entry?.stageIndex)) ? Number(entry.stageIndex) : index,
          stageName: entry?.stageName || entry?.name || entry?.title || "Stage " + String(index + 1),
          score,
          passEvidence,
          rawTimedOut,
          wrongActionCount: Number(entry?.wrongActionCount ?? entry?.scoreSummary?.wrongActionCount ?? entry?.summary?.wrongActionCount ?? 0) || 0,
          hintsRequested: Number(entry?.hintsRequested ?? entry?.scoreSummary?.hintsRequested ?? entry?.summary?.hintsRequested ?? 0) || 0,
        };
      });
    });

    /*
      De-duplicate same scenario/stage rows.
      Keep the strongest row so stale failed rows do not override completed rows.
    */
    const byStage = new Map();

    rawRows.forEach(row => {
      const key = row.scenarioId + "::" + row.stageIndex;
      const current = byStage.get(key);

      if (!current) {
        byStage.set(key, row);
        return;
      }

      const currentRank =
        (current.passEvidence ? 1000 : 0) +
        (!current.rawTimedOut ? 500 : 0) +
        Number(current.score || 0);

      const nextRank =
        (row.passEvidence ? 1000 : 0) +
        (!row.rawTimedOut ? 500 : 0) +
        Number(row.score || 0);

      if (nextRank >= currentRank) {
        byStage.set(key, row);
      }
    });

    const dedupedRows = Array.from(byStage.values());

    const scenarioStats = new Map();

    dedupedRows.forEach(row => {
      const current = scenarioStats.get(row.scenarioId) || {
        count: 0,
        passEvidenceCount: 0,
        scenario1Family:
          row.scenarioId === "external_recon_to_exfiltration" ||
          row.scenarioId === "external_recon_to_exfiltration_1b",
      };

      current.count += 1;
      if (row.passEvidence) current.passEvidenceCount += 1;

      scenarioStats.set(row.scenarioId, current);
    });

    const rows = dedupedRows.map(row => {
      const stats = scenarioStats.get(row.scenarioId) || {};

      const suppressScenario1StaleTimeout =
        stats.scenario1Family &&
        stats.count >= 5 &&
        stats.passEvidenceCount >= 4;

      const timedOut =
        row.rawTimedOut &&
        !row.passEvidence &&
        !suppressScenario1StaleTimeout;

      return {
        ...row,
        timedOut,
        completed: !timedOut,
      };
    }).sort((a, b) => {
      if (a.scenarioId !== b.scenarioId) return a.scenarioId.localeCompare(b.scenarioId);
      return a.stageIndex - b.stageIndex;
    });

    const dashboardCompletedScenarioId =
      (typeof readUserProgressSnapshot === "function"
        ? readUserProgressSnapshot(activeUserId)?.cybraxisCompletedScenarioId
        : "") ||
      window.localStorage.getItem("cybraxisCompletedScenarioId") ||
      "";

    const scenarioIds = Array.from(new Set([
      ...rows.map(row => row.scenarioId).filter(Boolean),
      dashboardCompletedScenarioId,
    ].filter(Boolean)));

    const scenarioSummaries = scenarioIds.map(scenarioId => {
      const scenarioRows = rows.filter(row => row.scenarioId === scenarioId);
      
      const rowCompletedCount = scenarioRows.filter(row => row.completed).length;

      const runtimeCompletedStageIds = parseJson(
        window.localStorage.getItem("cybraxisCompletedStages:" + activeUserId + ":" + scenarioId),
        []
      );

      const runtimeCompletedCountForScenario = Array.isArray(runtimeCompletedStageIds)
        ? runtimeCompletedStageIds.length
        : 0;

      /* CYBRAXIS_DASHBOARD_AUTHORITATIVE_COMPLETION_READ
         Final-report completion is authoritative. If the completed scenario
         marker says this scenario is complete, stale failed/timed-out rows
         must not pull the dashboard back to 3/5.
      */
      const completedScenarioIdForScenario =
        (typeof readUserProgressSnapshot === "function"
          ? readUserProgressSnapshot(activeUserId)?.cybraxisCompletedScenarioId
          : "") ||
        window.localStorage.getItem("cybraxisCompletedScenarioId") ||
        "";

      const completedScenarioStageCountForScenario = Number.parseInt(
        (typeof readUserProgressSnapshot === "function"
          ? readUserProgressSnapshot(activeUserId)?.cybraxisCompletedScenarioStageCount
          : "") ||
          window.localStorage.getItem("cybraxisCompletedScenarioStageCount") ||
          "0",
        10
      );

      const authoritativeCompletedCountForScenario =
        completedScenarioIdForScenario === scenarioId && Number.isFinite(completedScenarioStageCountForScenario)
          ? Math.max(0, completedScenarioStageCountForScenario)
          : 0;

      const dashboardSnapshotForScenario =
        typeof readUserProgressSnapshot === "function"
          ? readUserProgressSnapshot(activeUserId)
          : {};

      const resumeScenarioId =
        dashboardSnapshotForScenario?.cybraxisLastScenarioId ||
        window.localStorage.getItem("cybraxisLastScenarioId") ||
        "";

      const resumeStageIndexForScenario = Number.parseInt(
        dashboardSnapshotForScenario?.cybraxisLastStageIndex ||
          window.localStorage.getItem("cybraxisLastStageIndex") ||
          "0",
        10
      );

      /*
        Important:
        If the learner is currently on stage index 4, that means stages 0-3
        are completed and stage 4 is in progress. So resume index 4 implies
        4 completed stages, not 5.
      */
      const resumeCompletedCountForScenario =
        resumeScenarioId === scenarioId && Number.isFinite(resumeStageIndexForScenario)
          ? Math.max(0, resumeStageIndexForScenario)
          : 0;

      const completed = Math.min(
        scenarioStageTotal(
          scenarioId,
          Math.max(
            scenarioRows.length,
            runtimeCompletedCountForScenario,
          authoritativeCompletedCountForScenario,
            authoritativeCompletedCountForScenario,
            resumeCompletedCountForScenario
          )
        ),
        Math.max(
          rowCompletedCount,
          runtimeCompletedCountForScenario,
          resumeCompletedCountForScenario
        )
      );

      const timedOut = authoritativeCompletedCountForScenario > 0
        ? 0
        : scenarioRows.filter(row => row.timedOut).length;
      const total = scenarioStageTotal(scenarioId, Math.max(scenarioRows.length, authoritativeCompletedCountForScenario));
      const completedRows = scenarioRows.filter(row => row.completed);
      const avg = completedRows.length
        ? Math.round(completedRows.reduce((sum, row) => sum + row.score, 0) / completedRows.length)
        : 0;

      return {
        id: scenarioId,
        label: scenarioLabel(scenarioId),
        completed,
        total,
        timedOut,
        avg,
        percent: total ? Math.round((completed / total) * 100) : 0,
      };
    });

    const totalStageSlots = scenarioSummaries.reduce((sum, item) => sum + item.total, 0);

      /* CYBRAXIS_DASHBOARD_AGGREGATE_PARITY_FIX_START
         Aggregate dashboard cards must use the same corrected scenario
         summaries as the scenario progression cards. Otherwise the UI can
         show South Bridge Pivot as 4/5 while the top card still says 2/10.
      */
      const scenarioCompletedStages = scenarioSummaries.reduce(
        (sum, item) => sum + Number(item.completed || 0),
        0
      );

      const rawSavedStageCount = rows.length;
      const savedStageCount = Math.max(rawSavedStageCount, scenarioCompletedStages);

      const completedStages = Math.min(
        totalStageSlots || scenarioCompletedStages,
        scenarioCompletedStages
      );

      const timedOutStages = Math.min(
        rows.filter(row => row.timedOut).length,
        Math.max(0, (totalStageSlots || 0) - completedStages)
      );
      /* CYBRAXIS_DASHBOARD_AGGREGATE_PARITY_FIX_END */
const completedRows = rows.filter(row => row.completed);
    const averageCompletedScore = completedRows.length
      ? Math.round(completedRows.reduce((sum, row) => sum + row.score, 0) / completedRows.length)
      : 0;

    const wrongActionTotal = rows.reduce((sum, row) => sum + row.wrongActionCount, 0);
    
      let hintsTotal = rows.reduce((sum, row) => sum + row.hintsRequested, 0);

      const dashboardAiHistory = parseJson(
        window.localStorage.getItem("cybraxisAiInterventionHistory"),
        []
      );

      const dashboardAiHistoryCount = Array.isArray(dashboardAiHistory)
        ? dashboardAiHistory.length
        : 0;

      hintsTotal = Math.max(hintsTotal, dashboardAiHistoryCount);


    const lastRow = rows[rows.length - 1] || null;
    const lastScenarioLabel = lastRow ? scenarioLabel(lastRow.scenarioId) : "No scenario yet";
    const lastStageLabel = lastRow ? lastRow.stageName || "Stage " + String(lastRow.stageIndex + 1) : "Not started";

    const aiProfile = (() => {
      if (typeof window === "undefined") return null;

      const userSnapshot =
        typeof readUserProgressSnapshot === "function"
          ? readUserProgressSnapshot(activeUserId)
          : {};

      const userProfile = parseJson(userSnapshot?.cybraxisLatestAiLearningProfile, null);

      if (userProfile?.enabled) return userProfile;

      /*
        Keep dashboard AI feedback learner-specific.
        Do not reuse global AI feedback for a selected user.
      */
      if (!activeUserId) {
        const globalProfile = parseJson(window.localStorage.getItem("cybraxisLatestAiLearningProfile"), null);
        if (globalProfile?.enabled) return globalProfile;
      }

      return null;
    })();

    const weakestArea =
      aiProfile?.primaryFocusLabel ||
      (
        timedOutStages > 0
          ? "Incomplete scenario follow-through"
          : wrongActionTotal > 0
            ? "Action accuracy"
            : hintsTotal > 0
              ? "Independent investigation"
              : savedStageCount
                ? "No major weakness detected"
                : "Pending scenario data"
      );

    const completionPercent = totalStageSlots
      ? Math.min(100, Math.round((completedStages / totalStageSlots) * 100))
      : 0;

    const statusTitle =
      savedStageCount === 0
        ? "Training profile pending"
        : timedOutStages > 0
          ? "Follow-up recommended"
          : averageCompletedScore >= 85
            ? "Advanced SOC reasoning"
            : averageCompletedScore >= 65
              ? "Developing SOC reasoning"
              : "Remediation recommended";

    const statusDescription =
      totalStageSlots > 0
        ? "Cumulative profile across " + scenarioIds.length + " scenario" + (scenarioIds.length === 1 ? "" : "s") +
          ". " + completedStages + "/" + totalStageSlots + " expected stages are completed."
        : "Complete a scenario to generate cumulative learner analytics.";

    const strengths = [];

    if (completedStages > 0) strengths.push("Completed " + completedStages + "/" + totalStageSlots + " expected stages");
    if (averageCompletedScore >= 65) strengths.push("Maintained a passing average across completed stages");
    if (wrongActionTotal === 0 && savedStageCount > 0) strengths.push("No wrong actions recorded in saved stage data");

    if (!strengths.length) strengths.push(savedStageCount ? "Strength profile still developing" : "Complete stages to identify strengths");

    const weaknesses = [];

    if (timedOutStages > 0) weaknesses.push(timedOutStages + " stage" + (timedOutStages === 1 ? " timed" : "s timed") + " out and needs follow-up");
    if (wrongActionTotal > 0) weaknesses.push(wrongActionTotal + " wrong action" + (wrongActionTotal === 1 ? "" : "s") + " recorded");
    if (hintsTotal > 0) weaknesses.push("Mentor support used " + hintsTotal + " time" + (hintsTotal === 1 ? "" : "s"));

    if (!weaknesses.length) weaknesses.push(savedStageCount ? "No major weakness detected from cumulative results" : "Complete scenarios to identify improvement areas");

    const aiFeedback = cleanDashboardText(
      aiProfile?.dashboardObservation ||
      aiProfile?.observationSummary ||
      aiProfile?.observations?.[0],
      savedStageCount === 0
        ? "No scored scenario data has been collected yet."
        : timedOutStages > 0
          ? "The learner has an incomplete investigation path that should be finished before moving forward."
          : averageCompletedScore > 0 && averageCompletedScore < 65
            ? "The learner is completing stages, but evidence coverage and response sequence need reinforcement."
            : wrongActionTotal > 0
              ? "The learner is progressing, but response accuracy should be improved before escalation."
              : hintsTotal > 0
                ? "The learner is progressing with some mentor support during investigation."
                : averageCompletedScore >= 85
                  ? "The learner shows strong investigation continuity and interpretation accuracy."
                  : savedStageCount
                    ? "The learner is building a stable investigation rhythm across completed stages."
                    : "Complete a scored scenario to generate AI-assisted learning feedback."
    );

    const nextRecommendationTitle =
      timedOutStages > 0
        ? "Resume incomplete scenario"
        : averageCompletedScore > 0 && averageCompletedScore < 65
          ? "Start targeted remediation"
          : averageCompletedScore >= 85
            ? "Continue to advanced investigation"
            : averageCompletedScore >= 65
              ? "Continue scenario progression"
              : "Complete a scored scenario";

    const nextRecommendationDescription = cleanDashboardText(
      timedOutStages > 0
        ? "Return to " + lastScenarioLabel + " and finish the incomplete investigation stage before moving forward."
        : averageCompletedScore > 0 && averageCompletedScore < 65
          ? "Start targeted remediation focused on " + weakestArea + " before continuing scenario progression."
          : averageCompletedScore >= 85
            ? "Continue to the next scenario challenge and maintain evidence-first reasoning."
            : averageCompletedScore >= 65
              ? "Continue scenario progression while strengthening " + weakestArea + "."
              : "Finish a complete scenario to generate adaptive recommendations."
    );

    return {
      completionPercent,
      statusTitle,
      statusDescription,
      scenarioCount: scenarioIds.length,
      savedStageCount,
      totalStageSlots,
      completedStages,
      timedOutStages,
      averageCompletedScore,
      wrongActionTotal,
      hintsTotal,
      weakestArea,
      lastScenarioLabel,
      lastStageLabel,
      scenarioSummaries,
      strengths,
      weaknesses,
      nextRecommendationTitle,
      nextRecommendationDescription,
      aiReview: {
        observedPattern:
          aiProfile?.primaryMisconceptionLabel ||
          aiProfile?.primaryMisconception ||
          (timedOutStages > 0 ? "Incomplete scenario follow-through" : "No repeated misconception detected"),
        recommendedFocus:
          aiProfile?.primaryFocusLabel ||
          weakestArea ||
          "Activity/evidence",
        mentorLevel:
          aiProfile?.supportLevel ||
          aiProfile?.interventionLevel ||
          "Not assigned",
        feedback: aiFeedback,
      },
    };
  }, [activeUserId, players]);


  const openView = (nextView) => {
    setUserSwitcherOpen(false);
    setView(nextView);

    const params = new URLSearchParams();
    if (nextView !== "home") {
      params.set("menu", nextView);
    }

    const nextUrl = params.toString()
      ? window.location.pathname + "?" + params.toString()
      : window.location.pathname;

    window.history.replaceState(null, "", nextUrl);
  };


  const returnToScenarioBriefing = () => {
    const params = new URLSearchParams(window.location.search);
    const scenarioId = params.get("briefingReturnScenario");

    if (!scenarioId) {
      openView("home");
      return;
    }

    const nextParams = new URLSearchParams();
    nextParams.set("scenario", scenarioId);
    nextParams.set("briefing", "1");

    const stage = params.get("briefingReturnStage");
    if (stage) {
      nextParams.set("stage", stage);
    }

    const resume = params.get("briefingReturnResume");
    if (resume) {
      nextParams.set("resume", resume);
    }

    window.location.assign(
      window.location.pathname + "?" + nextParams.toString()
    );
  };
  const switchUser = () => {
    console.warn("User switching is disabled. Log out before accessing another learner account.");
  };

  const createNewUser = () => {
    saveActiveUserProgress(activeUserId);

    const existing = readPlayers();
    const nextNumber = existing.length + 1;
    const newUser = {
      id: "player_" + Date.now(),
      name: "Analyst " + nextNumber,
      role: "Student SOC Analyst",
    };

    const nextPlayers = [...existing, newUser];

    safeJsonWrite(USER_STORAGE_KEYS.players, nextPlayers);
    writeString(USER_STORAGE_KEYS.current, newUser.id);
    writeString("cybraxisPlayerName", newUser.name);

    clearActiveTrainingKeys();

    setPlayers(nextPlayers);
    setActiveUserId(newUser.id);
    setPlayerName(newUser.name);
    setUserSwitcherOpen(false);
    setView("profile");
    window.history.replaceState(null, "", window.location.pathname + "?menu=profile");
  };

  const handleNewScenario = () => {
    const scenarioId = chooseNewScenarioId();
    markScenarioStarted(scenarioId);
    saveActiveUserProgress(activeUserId);
    launchScenario(scenarioId, 0, false);
  };

  const handleContinue = () => {
    if (!resumeState.available) return;
    saveActiveUserProgress(activeUserId);
    launchScenario(resumeState.scenarioId, resumeState.stageIndex, true);
  };

  const saveProfile = () => {
    const cleanedName = playerName.trim() || "Student Analyst";
    const cleanedUsername = profileUsername.trim();
    const normalizedUsername = cleanedUsername.toLowerCase();

    setProfileError("");
    setProfileNotice("");

    if (!cleanedUsername) {
      setProfileError("Username is required.");
      return;
    }

    const duplicateUsername = players.some((player) =>
      player &&
      player.id !== activeUserId &&
      String(player.username || "").trim().toLowerCase() === normalizedUsername
    );

    if (duplicateUsername) {
      setProfileError("This username is already used by another learner.");
      return;
    }

    const activePlayer =
      players.find((player) => player && player.id === activeUserId) ||
      currentPlayer;

    const wantsPasswordChange =
      Boolean(currentPassword || newPassword || confirmPassword);

    let nextPassword = activePlayer.password;

    if (wantsPasswordChange) {
      if (activePlayer.password && activePlayer.password !== currentPassword) {
        setProfileError("Current password is incorrect.");
        return;
      }

      if (!newPassword || newPassword.length < 3) {
        setProfileError("New password must be at least 3 characters.");
        return;
      }

      if (newPassword !== confirmPassword) {
        setProfileError("New password confirmation does not match.");
        return;
      }

      nextPassword = newPassword;
    }

    const nextPlayers = players.map((player) =>
      player.id === activeUserId
        ? {
            ...player,
            name: cleanedName,
            username: cleanedUsername,
            password: nextPassword,
            accountType: "Learner",
            role: player.role || "Student SOC Analyst",
            mentorPreference,
          }
        : player
    );

    safeJsonWrite(USER_STORAGE_KEYS.players, nextPlayers);
    writeString("cybraxisPlayerName", cleanedName);

    setPlayers(nextPlayers);
    setPlayerName(cleanedName);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setProfileNotice("Profile updated.");
  };

  const handleProfileLogout = () => {
    saveActiveUserProgress(activeUserId);

    window.localStorage.removeItem("cybraxisAuthSession");
    window.localStorage.removeItem(USER_STORAGE_KEYS.current);
    window.localStorage.removeItem("cybraxisCurrentPlayerId");
    window.localStorage.removeItem("cybraxisSelectedPlayerId");
    window.localStorage.removeItem("cybraxisActivePlayerId");

    window.location.assign(window.location.pathname);
  };

  const handleDeleteCurrentAccount = () => {
    const activePlayer =
      players.find((player) => player && player.id === activeUserId) ||
      currentPlayer;

    if (!window.confirm("Delete this learner account? This removes the account profile from the prototype.")) {
      return;
    }

    if (activePlayer.password) {
      const enteredPassword = window.prompt("Enter the current password to confirm deletion.");

      if (enteredPassword !== activePlayer.password) {
        setProfileError("Account deletion cancelled: password did not match.");
        return;
      }
    }

    const remainingPlayers = players.filter((player) => player && player.id !== activeUserId);

    safeJsonWrite(USER_STORAGE_KEYS.players, remainingPlayers);

    window.localStorage.removeItem("cybraxisAuthSession");
    window.localStorage.removeItem(USER_STORAGE_KEYS.current);
    window.localStorage.removeItem("cybraxisCurrentPlayerId");
    window.localStorage.removeItem("cybraxisSelectedPlayerId");
    window.localStorage.removeItem("cybraxisActivePlayerId");
    window.localStorage.removeItem("cybraxisPlayerName");

    window.location.assign(window.location.pathname);
  };

  if (view === "profile") {
    const activeProfilePlayer =
      players.find((player) => player && player.id === activeUserId) ||
      currentPlayer;

    const hasExistingPassword = Boolean(activeProfilePlayer.password);

    return (
      <MenuFrame
        title="Profile"
        subtitle="Manage learner identity and account preferences."
        onBack={returnToScenarioBriefing}
      >
        <section className="cy-menu__profile-layout cy-menu__profile-layout--account">
          <article className="cy-menu__profile-card cy-menu__profile-card--account">
            <div className="cy-menu__profile-account-head">
              <div className="cy-menu__avatar cy-menu__avatar--account">
                {(playerName || profileUsername || "S").slice(0, 1).toUpperCase()}
              </div>

              <div>
                <span className="cy-menu__section-kicker">Learner account</span>
                <h2>{playerName || "Student Analyst"}</h2>
                <p>Account details and mentor delivery preference.</p>
              </div>
            </div>

            <div className="cy-menu__profile-grid">
              <label>
                Display name
                <input value={playerName} onChange={(event) => setPlayerName(event.target.value)} />
              </label>

              <label>
                Username
                <input value={profileUsername} onChange={(event) => setProfileUsername(event.target.value)} />
              </label>
            </div>

            <div className="cy-menu__profile-facts cy-menu__profile-facts--account">
              <InfoLine label="Role" value="Student SOC Analyst" />
              <InfoLine label="Training mode" value="Network-based incident investigation" />
              <InfoLine label="System scope" value="Network attacks only" />
            </div>

            <div className="cy-menu__profile-password-panel">
              <div>
                <span className="cy-menu__section-kicker">Password</span>
                <h3>{hasExistingPassword ? "Change password" : "Set password"}</h3>
              </div>

              {hasExistingPassword && (
                <input
                  type="password"
                  placeholder="Current password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                />
              )}

              <input
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />

              <input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </div>

            {profileError && <div className="cy-menu__profile-message cy-menu__profile-message--error">{profileError}</div>}
            {profileNotice && <div className="cy-menu__profile-message cy-menu__profile-message--success">{profileNotice}</div>}

            <div className="cy-menu__profile-actions">
              <button className="cy-menu__button cy-menu__button--fit" onClick={saveProfile}>
                Save Profile
              </button>

              <button className="cy-menu__button cy-menu__button--fit cy-menu__button--ghost" onClick={handleProfileLogout}>
                Log out
              </button>

              <button className="cy-menu__button cy-menu__button--fit cy-menu__button--danger" onClick={handleDeleteCurrentAccount}>
                Delete Account
              </button>
            </div>
          </article>
        </section>
      </MenuFrame>
    );
  }

  if (view === "dashboard") {
    return (
      <MenuFrame
        title="Player Dashboard"
        subtitle="Cumulative learner performance across played scenarios."
        onBack={returnToScenarioBriefing}
      >
        <section className="cy-menu__dashboard-clean cy-menu__dashboard-clean--final-v2">
          <article className="cy-menu__dashboard-clean-hero">
            <div className="cy-menu__progress-ring" style={{ "--progress": dashboard.completionPercent }}>
              <strong>{dashboard.completedStages}/{dashboard.totalStageSlots || "—"}</strong>
              <span>Completed stages</span>
            </div>

            <div>
              <span className="cy-menu__section-kicker">Cumulative learner status</span>
              <h2>{dashboard.statusTitle}</h2>
              <p>{dashboard.statusDescription}</p>
            </div>
          </article>

          <section className="cy-menu__dashboard-clean-metrics">
            <DashboardCard label="Scenarios covered" value={String(dashboard.scenarioCount)} tone="cyan" />
            <DashboardCard label="Completed stages" value={dashboard.savedStageCount ? String(dashboard.completedStages) + "/" + String(dashboard.totalStageSlots) : "Pending"} tone="green" />
            <DashboardCard label="Timed-out stages" value={String(dashboard.timedOutStages)} tone={dashboard.timedOutStages > 0 ? "red" : "green"} />
            <DashboardCard label="Avg completed score" value={dashboard.averageCompletedScore ? String(dashboard.averageCompletedScore) + "/100" : "Pending"} tone={dashboard.averageCompletedScore >= 65 ? "green" : dashboard.averageCompletedScore > 0 ? "red" : "muted"} />
          </section>

          <section className="cy-menu__dashboard-progression">
            <div className="cy-menu__dashboard-section-head">
              <span className="cy-menu__section-kicker">Scenario Progression</span>
              <h2>Coverage by scenario</h2>
            </div>

            <div className="cy-menu__dashboard-progression-grid">
              {(dashboard.scenarioSummaries || []).reduce((items, item) => {
                  const labelKey = String(item?.label || item?.id || "").trim().toLowerCase();
                  const existingIndex = items.findIndex(existing =>
                    String(existing?.label || existing?.id || "").trim().toLowerCase() === labelKey
                  );

                  if (existingIndex < 0) return [...items, item];

                  const existing = items[existingIndex];
                  const existingCompleted = Number(existing?.completed || 0);
                  const itemCompleted = Number(item?.completed || 0);
                  const existingTotal = Number(existing?.total || 0);
                  const itemTotal = Number(item?.total || 0);

                  const preferIncoming =
                    itemCompleted > existingCompleted ||
                    (itemCompleted === existingCompleted && itemTotal >= existingTotal);

                  const base = preferIncoming ? item : existing;
                  const completed = Math.max(existingCompleted, itemCompleted);
                  const total = Math.max(existingTotal, itemTotal);
                  const timedOut = Math.min(
                    Number(existing?.timedOut || 0),
                    Number(item?.timedOut || 0)
                  );

                  const merged = {
                    ...base,
                    completed,
                    total,
                    timedOut,
                    percent: total ? Math.round((completed / total) * 100) : 0,
                  };

                  return items.map((existingItem, index) =>
                    index === existingIndex ? merged : existingItem
                  );
                }, []).map((item) => (
                <article className="cy-menu__dashboard-progression-card" key={item.id}>
                  <div>
                    <strong>{item.label}</strong>
                    <span>{item.completed}/{item.total} completed · avg {item.avg || "—"}/100</span>
                  </div>
                  <div className="cy-menu__dashboard-progress-track">
                    <i style={{ width: String(item.percent) + "%" }} />
                  </div>
                  {item.timedOut > 0 && <small>{item.timedOut} incomplete stage needs follow-up</small>}
                </article>
              ))}
            </div>
          </section>

          <section className="cy-menu__dashboard-ai-panel">
            <div>
              <span className="cy-menu__section-kicker">AI Mentor Review</span>
              <h2>{dashboard.aiReview.recommendedFocus}</h2>
              <p>{dashboard.aiReview.feedback}</p>
            </div>

            <div className="cy-menu__dashboard-ai-meta">
              <strong>Observed pattern</strong>
              <span>{dashboard.aiReview.observedPattern}</span>
              <strong>Mentor support level</strong>
              <span>{dashboard.aiReview.mentorLevel}</span>
            </div>
          </section>

          <section className="cy-menu__dashboard-split">
            <InsightPanel title="Cumulative Strengths" items={dashboard.strengths} tone="green" />
            <InsightPanel title="Cumulative Weaknesses" items={dashboard.weaknesses} tone="yellow" />
          </section>

          <section className="cy-menu__dashboard-recommendation">
            <span className="cy-menu__section-kicker">Next Recommendation</span>
            {(() => {
              const completedScenarioForDisplay = (dashboard.scenarioSummaries || []).find(item =>
                Number(item?.total || 0) > 0 &&
                Number(item?.completed || 0) >= Number(item?.total || 0) &&
                String(item?.label || "") === String(dashboard.lastScenarioLabel || "")
              ) || (dashboard.scenarioSummaries || []).find(item =>
                Number(item?.total || 0) > 0 &&
                Number(item?.completed || 0) >= Number(item?.total || 0)
              );

              if (completedScenarioForDisplay) {
                return (
                  <>
                    <h2>Continue Training</h2>
                    <p>The active scenario is complete. Continue with the next scenario challenge when ready.</p>
                    <small>Last activity: {completedScenarioForDisplay.label} / Completed</small>
                  </>
                );
              }

              return (
                <>
                  <h2>{dashboard.nextRecommendationTitle}</h2>
                  <p>{dashboard.nextRecommendationDescription}</p>
                  <small>Last activity: {dashboard.lastScenarioLabel} / {dashboard.lastStageLabel}</small>
                </>
              );
            })()}
          </section>
        </section>
      </MenuFrame>
    );
  }

  if (view === "fundamentals") {
    return (
      <MenuFrame
        title="Revise Fundamentals"
        subtitle="Review core knowledge before or after scenario practice."
        onBack={returnToScenarioBriefing}
        wide
      >
        <section className="cy-menu__fundamentals-frame">
          <div className="cy-menu__fundamentals-hero">
            <span>Revision library</span>
            <h2>Cybersecurity Investigation Basics</h2>
            <p>Select a topic to expand it. Keep the review focused, then return to scenario practice.</p>
          </div>

          <div className="cy-menu__accordion">
            {FUNDAMENTAL_SECTIONS.map((section) => {
              const open = openFundamental === section.id;

              return (
                <article
                  key={section.id}
                  className={open ? "cy-menu__accordion-item cy-menu__accordion-item--open" : "cy-menu__accordion-item"}
                >
                  <button
                    className="cy-menu__accordion-head"
                    onClick={() => setOpenFundamental(open ? "" : section.id)}
                  >
                    <span>{section.tag}</span>
                    <strong>{section.title}</strong>
                    <em>{open ? "Hide" : "Show"}</em>
                  </button>

                  {open && (
                    <div className="cy-menu__accordion-body">
                      <p>{section.summary}</p>
                      <ul>
                        {section.points.map((point) => (
                          <li key={point}>{point}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      </MenuFrame>
    );
  }

  if (view === "restart") {
    return (
      <MenuFrame
        title="Restart Progress"
        subtitle="Clear training progress for the current user."
        onBack={returnToScenarioBriefing}
      >
        <article className="cy-menu__danger-card">
          <h2>Restart training progress?</h2>
          <p>
            This clears scenario progress, resume position, remedy flags, and dashboard training data for the current user. The player name will be preserved.
          </p>
          <button className="cy-menu__button cy-menu__button--danger" onClick={resetTrainingProgressOnly}>
            Confirm Restart Progress
          </button>
        </article>
      </MenuFrame>
    );
  }

  return (
    <main className="cy-menu">
      <section className="cy-menu__shell">
        <header className="cy-menu__hero cy-menu__hero--home">
          <div className="cy-menu__hero-copy">
            <div className="cy-menu__brand-lockup">
              <CybraxisLogo />
              <span>CYBRAXIS</span>
            </div>

            <h1>Adaptive SOC Learning & Investigation Platform</h1>
            <p>Continue training, review fundamentals, or inspect learner progress.</p>
            <div className="cy-menu__hero-line">
              <span />
              <span />
              <span />
            </div>
          </div>

          <HeroSecurityArt />

          <div
            className="cy-menu__status cy-menu__status--clickable"
            role="button"
            tabIndex={0}
            onClick={() => setUserSwitcherOpen((open) => !open)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setUserSwitcherOpen((open) => !open);
              }
            }}
          >
            <span>Current Player</span>
            <strong>{currentPlayer.name || "Student Analyst"}</strong>
            <div className="cy-menu__status-meter"><i /></div>

            {userSwitcherOpen && (
              <div className="cy-menu__user-switcher cy-menu__user-switcher--session" onClick={(event) => event.stopPropagation()}>
                <button
                  className="cy-menu__user-option"
                  onClick={() => {
                    setUserSwitcherOpen(false);
                    setView("profile");
                    window.history.replaceState(null, "", window.location.pathname + "?menu=profile");
                  }}
                >
                  <strong>View Profile</strong>
                  <span>Manage current learner profile</span>
                </button>

                <button
                  className="cy-menu__user-option cy-menu__user-option--logout"
                  onClick={() => {
                    setUserSwitcherOpen(false);
                    saveActiveUserProgress(activeUserId);

                    window.localStorage.removeItem("cybraxisAuthSession");
                    window.localStorage.removeItem(USER_STORAGE_KEYS.current);
                    window.localStorage.removeItem("cybraxisCurrentPlayerId");
                    window.localStorage.removeItem("cybraxisSelectedPlayerId");
                    window.localStorage.removeItem("cybraxisActivePlayerId");

                    window.location.assign(window.location.pathname);
                  }}
                >
                  <strong>Log out</strong>
                  <span>Return to sign in</span>
                </button>
              </div>
            )}

          </div>
        </header>

        <section className="cy-menu__cards cy-menu__cards--six">
          <MenuCard
            label="Profile"
            title="Profile"
            description="View and update player details."
            action="Open Profile"
            icon="profile"
            tone="cyan"
            onClick={() => openView("profile")}
          />

          <MenuCard
            label="Analytics"
            title="Player Dashboard"
            description="Review progress, strengths, weaknesses, remedies, and improvement trend."
            action="Open Dashboard"
            icon="dashboard"
            tone="cyan"
            onClick={() => openView("dashboard")}
          />

          <MenuCard
            label="Resume"
            title="Continue Scenario"
            description={
              resumeState.available
                ? "Resume " + resumeState.title + " at stage " + (resumeState.stageIndex + 1) + "."
                : "No saved scenario position is available yet."
            }
            action="Continue Scenario"
            icon="continue"
            tone="teal"
            disabled={!resumeState.available}
            onClick={handleContinue}
          />

          <MenuCard
            label="Training"
            title="New Scenario"
            description={
              scenario1BKey
                ? "Start a fresh scenario attempt."
                : "Start a fresh scenario attempt."
            }
            action="Start New Scenario"
            icon="new"
            tone="yellow"
            onClick={handleNewScenario}
          />

          <MenuCard
            label="Reset"
            title="Restart Progress"
            description="Clear training progress and return to a fresh learner state."
            action="Reset Progress"
            icon="restart"
            tone="red"
            onClick={() => openView("restart")}
          />

          <MenuCard
            label="Theory"
            title="Revise Fundamentals"
            description="Review core network and SOC concepts before or after scenario practice."
            action="Revise Fundamentals"
            icon="book"
            tone="purple"
            onClick={() => openView("fundamentals")}
          />
        </section>
      </section>
    </main>
  );
}


function TrendChart({ points }) {
  const coordinates = buildCurveCoordinates(points);
  const hasData = coordinates.length > 0;
  const polyline = coordinates.map((point) => point.x + "," + point.y).join(" ");

  if (!hasData) {
    return (
      <div className="cy-menu__curve-empty">
        <div className="cy-menu__curve-empty-icon">▧</div>
        <strong>No performance data yet</strong>
        <span>Complete a scored scenario to see your trend.</span>
      </div>
    );
  }

  return (
    <svg viewBox="0 0 520 140" role="img" aria-label="Training trend">
      <g className="cy-menu__curve-grid">
        <path d="M24 24 H496" />
        <path d="M24 46 H496" />
        <path d="M24 68 H496" />
        <path d="M24 90 H496" />
        <path d="M24 112 H496" />
      </g>
      <polyline points={polyline} />
      {coordinates.map((point, index) => (
        <circle key={index} cx={point.x} cy={point.y} r="5" />
      ))}
    </svg>
  );
}

function MenuFrame({ title, subtitle, onBack, children, wide }) {
  return (
    <main className="cy-menu">
      <section className={wide ? "cy-menu__shell cy-menu__shell--wide" : "cy-menu__shell"}>
        <header className="cy-menu__hero cy-menu__hero--compact">
          <div>
            <div className="cy-menu__eyebrow">CYBRAXIS MENU</div>
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>

          <button className="cy-menu__button cy-menu__button--fit" onClick={onBack}>
            Back to Menu
          </button>
        </header>

        <section className="cy-menu__page">
          {children}
        </section>
      </section>
    </main>
  );
}

function MenuCard({ label, title, description, action, onClick, disabled, tone, icon }) {
  const className = "cy-menu__card cy-menu__card--" + tone;

  return (
    <article className={className}>
      <div className="cy-menu__card-glow" />

      <div className="cy-menu__card-main">
        <div className="cy-menu__orb">
          <IconGlyph type={icon} />
        </div>

        <div className="cy-menu__card-copy">
          <span className="cy-menu__card-label">{label}</span>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>

      <button className="cy-menu__button cy-menu__card-button" disabled={disabled} onClick={onClick}>
        <span>{action}</span>
        <b>›</b>
      </button>
    </article>
  );
}

function DashboardCard({ label, value, tone }) {
  return (
    <div className={"cy-menu__dash-card cy-menu__dash-card--" + tone}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function InsightPanel({ title, items, tone }) {
  return (
    <article className={"cy-menu__insight cy-menu__insight--" + tone}>
      <h2>{title}</h2>
      {items.map((item) => (
        <p key={item}>{item}</p>
      ))}
    </article>
  );
}

function InfoLine({ label, value }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
