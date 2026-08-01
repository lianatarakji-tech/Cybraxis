function normalizeString(value) {
  return String(value || "").trim();
}

function normalizeTrigger(value) {
  const clean = normalizeString(value);

  if (!clean) return "BACKEND_GUIDANCE";

  return clean
    .replaceAll("-", "_")
    .replaceAll(" ", "_")
    .toUpperCase();
}

function getGuidanceText({
  guidance = {},
  actionEvaluation = {},
  adaptiveRuntime = {},
} = {}) {
  return (
    guidance.text ||
    guidance.message ||
    guidance.feedback ||
    guidance.mentorMessage ||
    actionEvaluation.message ||
    adaptiveRuntime?.warningIntensity?.message ||
    null
  );
}

function shouldDisplayBackendGuidance({
  guidance = {},
  actionEvaluation = {},
  adaptiveRuntime = {},
} = {}) {
  const classification = actionEvaluation.classification || "unknown";
  const guidanceSeverity = guidance.severity || "none";
  const warningLevel = adaptiveRuntime?.warningIntensity?.level || "normal";

  if (["premature", "wrong_target", "wrong", "irrelevant"].includes(classification)) {
    return true;
  }

  if (classification === "correct_with_warning") {
    return true;
  }

  if (["warning", "strong", "intervention", "critical"].includes(guidanceSeverity)) {
    return true;
  }

  if (["medium", "strong", "critical"].includes(warningLevel)) {
    return true;
  }

  return false;
}

export function buildBackendMentorHint(backendResult = {}) {
  const guidance = backendResult?.guidance || {};
  const actionEvaluation = backendResult?.actionEvaluation || {};
  const adaptiveRuntime = backendResult?.adaptiveRuntime || {};

  const text = getGuidanceText({
    guidance,
    actionEvaluation,
    adaptiveRuntime,
  });

  const shouldDisplay =
    Boolean(text) &&
    shouldDisplayBackendGuidance({
      guidance,
      actionEvaluation,
      adaptiveRuntime,
    });

  return {
    source: "backend_guidance_authority",
    shouldDisplay,
    text,
    trigger: normalizeTrigger(
      guidance.trigger ||
        actionEvaluation.reasonCode ||
        actionEvaluation.classification ||
        "BACKEND_GUIDANCE"
    ),
    severity: guidance.severity || null,
    classification: actionEvaluation.classification || null,
    reasonCode: actionEvaluation.reasonCode || null,
    supportLevel: adaptiveRuntime.supportLevel || null,
    hintSpecificity: adaptiveRuntime.hintSpecificity || null,
    warningLevel: adaptiveRuntime?.warningIntensity?.level || null,
    reasonCodes: adaptiveRuntime.reasonCodes || guidance.reasonCodes || [],
  };
}