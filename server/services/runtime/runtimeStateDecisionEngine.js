function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function getConnectedEdgeIds({ connections = [], selectedNodeId = null } = {}) {
  if (!selectedNodeId) return [];

  return normalizeArray(connections)
    .filter(connection =>
      connection?.from === selectedNodeId || connection?.to === selectedNodeId
    )
    .map(connection => connection.id)
    .filter(Boolean);
}

function getExternalOrSelectedEdgeIds({
  connections = [],
  selectedNodeId = null,
} = {}) {
  return normalizeArray(connections)
    .filter(connection =>
      connection?.from === "external" ||
      connection?.to === "external" ||
      (
        selectedNodeId &&
        (connection?.from === selectedNodeId || connection?.to === selectedNodeId)
      )
    )
    .map(connection => connection.id)
    .filter(Boolean);
}

function buildRuntimeStateDecision({
  actionId,
  selectedNodeId = null,
  selectedAlertId = null,
  connections = [],
  timestamp = null,
} = {}) {
  const decision = {
    actionId,
    selectedNodeId,
    selectedAlertId,
    highlightedEdgeIds: [],
    blockedConnectionIds: [],
    resolvedAlertIds: [],
    highlightedLogId: null,
    nodeRuntimePatches: {},
    actionLogs: [],
    mentorHint: null,
  };

  if (selectedAlertId && actionId !== "ignore") {
    decision.resolvedAlertIds.push(selectedAlertId);
  }

  if (actionId === "inv-ip" && selectedNodeId) {
    decision.highlightedEdgeIds = getConnectedEdgeIds({
      connections,
      selectedNodeId,
    });

    decision.nodeRuntimePatches[selectedNodeId] = {
      evidenceScoreDelta: 10,
      evidenceScoreMax: 100,
      confidence: "high",
      activity: "IP/path investigation performed by analyst",
      interpretation:
        "The analyst reviewed the node communication path. Correlation focus should remain on identity, connectivity, controls, activity, then interpretation.",
    };

    decision.mentorHint = {
      text: "Connectivity investigation recorded. Confirm required coverage before containment.",
      trigger: "ACTION",
    };
  }

  if (actionId === "inv-user" && selectedNodeId) {
    decision.nodeRuntimePatches[selectedNodeId] = {
      evidenceScoreDelta: 8,
      evidenceScoreMax: 100,
      confidence: "high",
      activity: "User-context investigation performed by analyst",
      interpretation:
        "User and baseline context were reviewed. The node should be assessed against expected privileges and behavior, not alerts alone.",
    };

    decision.mentorHint = {
      text: "Identity investigation recorded. Review required coverage before escalating containment.",
      trigger: "ACTION",
    };
  }

  if (actionId === "isolate" && selectedNodeId) {
    decision.nodeRuntimePatches[selectedNodeId] = {
      status: "isolated",
      controlState: "isolated-by-analyst",
      activity: "Machine isolated — network access severed",
      interpretation:
        "The node has been contained by analyst action. It is no longer participating in active network communication.",
    };

    decision.blockedConnectionIds = getConnectedEdgeIds({
      connections,
      selectedNodeId,
    });

    decision.actionLogs.push({
      idPrefix: "act",
      time: timestamp,
      msg: `ACTION: ${String(selectedNodeId).toUpperCase()} isolated — all network connections severed`,
      type: "action",
    });
  }

  if (actionId === "block-ip") {
    decision.blockedConnectionIds = getExternalOrSelectedEdgeIds({
      connections,
      selectedNodeId,
    });

    decision.nodeRuntimePatches.external = {
      status: "isolated",
      controlState: "blocked-at-perimeter",
      activity: "Perimeter block rule applied against external endpoint",
      interpretation: "The external route has been cut off by firewall action.",
    };

    if (selectedNodeId) {
      decision.nodeRuntimePatches[selectedNodeId] = {
        activity: "Node communication path restricted after IP block",
      };
    }

    decision.actionLogs.push({
      idPrefix: "act-blk",
      time: timestamp,
      msg: "FIREWALL: Block rule applied — attacker IP removed from network topology",
      type: "action",
    });

    decision.mentorHint = {
      text: "IP blocked. The attacker communication path has been severed at the perimeter.",
      trigger: "ACTION",
    };
  }

  if (actionId === "ignore" && selectedAlertId) {
    decision.mentorHint = {
      text: "Ignoring this alert leaves the attacker more time to exploit trust paths and deepen the campaign.",
      trigger: "IGNORE",
    };
  }

  return decision;
}

function sortArray(value) {
  return normalizeArray(value).filter(Boolean).sort();
}

function normalizeDecision(decision = {}) {
  return {
    actionId: decision.actionId || null,
    selectedNodeId: decision.selectedNodeId || null,
    selectedAlertId: decision.selectedAlertId || null,
    highlightedEdgeIds: sortArray(decision.highlightedEdgeIds),
    blockedConnectionIds: sortArray(decision.blockedConnectionIds),
    resolvedAlertIds: sortArray(decision.resolvedAlertIds),
    highlightedLogId: decision.highlightedLogId || null,
    nodeRuntimePatches: decision.nodeRuntimePatches || {},
    actionLogs: normalizeArray(decision.actionLogs).map(log => ({
      msg: log.msg || null,
      type: log.type || null,
    })),
    mentorHint: decision.mentorHint
      ? {
          text: decision.mentorHint.text || null,
          trigger: decision.mentorHint.trigger || null,
        }
      : null,
  };
}

function compareRuntimeStateDecision({
  frontendDecision = {},
  backendDecision = {},
} = {}) {
  const frontend = normalizeDecision(frontendDecision);
  const backend = normalizeDecision(backendDecision);

  const checks = {
    actionId: frontend.actionId === backend.actionId,
    selectedNodeId: frontend.selectedNodeId === backend.selectedNodeId,
    selectedAlertId: frontend.selectedAlertId === backend.selectedAlertId,
    highlightedEdgeIds:
      JSON.stringify(frontend.highlightedEdgeIds) ===
      JSON.stringify(backend.highlightedEdgeIds),
    blockedConnectionIds:
      JSON.stringify(frontend.blockedConnectionIds) ===
      JSON.stringify(backend.blockedConnectionIds),
    resolvedAlertIds:
      JSON.stringify(frontend.resolvedAlertIds) ===
      JSON.stringify(backend.resolvedAlertIds),
    nodeRuntimePatches:
      JSON.stringify(frontend.nodeRuntimePatches) ===
      JSON.stringify(backend.nodeRuntimePatches),
    actionLogs:
      JSON.stringify(frontend.actionLogs) ===
      JSON.stringify(backend.actionLogs),
    mentorHint:
      JSON.stringify(frontend.mentorHint) ===
      JSON.stringify(backend.mentorHint),
  };

  return {
    matches: Object.values(checks).every(Boolean),
    checks,
    frontend,
    backend,
    checkedAt: new Date().toISOString(),
  };
}

module.exports = {
  buildRuntimeStateDecision,
  compareRuntimeStateDecision,
};