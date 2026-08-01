function normalizeString(value) {
  return String(value || "").trim();
}

export function buildBackendAdaptiveWarning(backendResult = {}) {
  const warningIntensity =
    backendResult?.adaptiveRuntime?.warningIntensity || {};

  const level = normalizeString(warningIntensity.level || "normal");
  const message = normalizeString(warningIntensity.message || "");

  const shouldDisplay =
    Boolean(message) &&
    ["medium", "strong", "critical"].includes(level);

  return {
    source: "backend_adaptive_warning_authority",
    shouldDisplay,
    level,
    message,
    showRiskLabel: Boolean(warningIntensity.showRiskLabel),
    blockOrWarn: warningIntensity.blockOrWarn || "allow",
  };
}

export function buildBackendLogPacing(backendResult = {}) {
  const logPacing = backendResult?.adaptiveRuntime?.logPacing || {};

  const maxNewLogsPerTick = Number(logPacing.maxNewLogsPerTick);

  return {
    source: "backend_log_pacing_authority",
    level: logPacing.level || "normal",
    revealMode: logPacing.revealMode || "scenario_default",
    maxNewLogsPerTick:
      Number.isFinite(maxNewLogsPerTick) && maxNewLogsPerTick > 0
        ? Math.max(1, Math.min(maxNewLogsPerTick, 5))
        : 1,
    reason: logPacing.reason || null,
  };
}