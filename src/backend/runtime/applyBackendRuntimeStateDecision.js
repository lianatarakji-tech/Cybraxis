import { nowStr } from "../../engine/runtime/runtimeState";

export function applyBackendRuntimeStateDecisionToFrontend({
  runtimeDecision,
  setHighlightedEdges,
  setBlockedConnections,
  setResolvedAlerts,
  setHlLogId,
  setNodeRuntime,
  setActionLogs,
  addMentorHint,
}) {
  if (!runtimeDecision) return;

  if (Array.isArray(runtimeDecision.highlightedEdgeIds)) {
    setHighlightedEdges(new Set(runtimeDecision.highlightedEdgeIds));
  }

  if (
    Array.isArray(runtimeDecision.blockedConnectionIds) &&
    runtimeDecision.blockedConnectionIds.length > 0
  ) {
    setBlockedConnections(prev =>
      new Set([...prev, ...runtimeDecision.blockedConnectionIds])
    );
  }

  if (
    Array.isArray(runtimeDecision.resolvedAlertIds) &&
    runtimeDecision.resolvedAlertIds.length > 0
  ) {
    setResolvedAlerts(prev =>
      new Set([...prev, ...runtimeDecision.resolvedAlertIds])
    );
  }

  if (runtimeDecision.highlightedLogId) {
    setHlLogId(runtimeDecision.highlightedLogId);
  }

  if (runtimeDecision.nodeRuntimePatches) {
    setNodeRuntime(prev => {
      const nextRuntime = { ...prev };

      Object.entries(runtimeDecision.nodeRuntimePatches).forEach(([nodeId, patch]) => {
        const currentNodeRuntime = nextRuntime[nodeId] || {};
        const appliedPatch = { ...patch };

        if (Number.isFinite(Number(patch.evidenceScoreDelta))) {
          const maxScore = Number.isFinite(Number(patch.evidenceScoreMax))
            ? Number(patch.evidenceScoreMax)
            : 100;

          appliedPatch.evidenceScore = Math.min(
            (currentNodeRuntime.evidenceScore || 0) + Number(patch.evidenceScoreDelta),
            maxScore
          );

          delete appliedPatch.evidenceScoreDelta;
          delete appliedPatch.evidenceScoreMax;
        }

        nextRuntime[nodeId] = {
          ...currentNodeRuntime,
          ...appliedPatch,
        };
      });

      return nextRuntime;
    });
  }

  if (
    Array.isArray(runtimeDecision.actionLogs) &&
    runtimeDecision.actionLogs.length > 0
  ) {
    setActionLogs(prev => [
      ...prev,
      ...runtimeDecision.actionLogs.map((log, index) => {
        const logTime = log.time || runtimeDecision.timestamp || nowStr();

        return {
          id: `${log.idPrefix || "runtime"}-${logTime}-${prev.length + index}`,
          time: logTime,
          msg: log.msg,
          type: log.type || "action",
        };
      }),
    ]);
  }

  if (runtimeDecision.mentorHint?.text) {
    addMentorHint(
      runtimeDecision.mentorHint.text,
      runtimeDecision.mentorHint.trigger || "ACTION"
    );
  }
}
