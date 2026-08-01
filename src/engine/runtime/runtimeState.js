export function nowStr() {
  const d = new Date();

  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

export function normalizeSeverity(severity) {
  const normalized = String(severity || "Low").toLowerCase();

  if (normalized === "critical") return "Critical";
  if (normalized === "high") return "High";
  if (normalized === "medium") return "Medium";

  return "Low";
}

export function buildInitialNodeRuntime({
  scenario,
  stageId,
  stageNodeContext = {},
}) {
  const stageContext = stageNodeContext[stageId] || {};
  const runtime = {};

  scenario.nodes.forEach((node) => {
    const ctx = stageContext[node.id] || {};

    runtime[node.id] = {
      status: ctx.status || "normal",
      controlState:
        ctx.controlState ||
        node.securityProfile?.firewall?.baselineState ||
        "unknown",
      evidenceScore: ctx.evidenceScore || 0,
      confidence: ctx.confidence || "low",
      activity: ctx.activity || node.lastActivity || "No recent activity",
      interpretation:
        ctx.interpretation ||
        "No active security interpretation for this node at the current stage.",
    };
  });

  return runtime;
}