export function buildFrontendRuntimeStateDecision({
  actionId,
  selectedNodeId = null,
  selectedAlertId = null,
  connections = [],
  timestamp = null,
}) {
  if (!actionId) return null;

  const baseDecision = {
    actionId,
    selectedNodeId,
    selectedAlertId,
    highlightedEdgeIds: [],
    blockedConnectionIds: [],
    resolvedAlertIds: selectedAlertId ? [selectedAlertId] : [],
    highlightedLogId: null,
    nodeRuntimePatches: {},
    actionLogs: [],
    mentorHint: null,
    timestamp,
  };

  if (actionId === "inv-ip" && selectedNodeId) {
    const highlightedEdgeIds = connections
      .filter(
        connection =>
          connection.from === selectedNodeId ||
          connection.to === selectedNodeId
      )
      .map(connection => connection.id)
      .filter(Boolean);

    return {
      ...baseDecision,
      highlightedEdgeIds,
      nodeRuntimePatches: {
        [selectedNodeId]: {
          evidenceScoreDelta: 10,
          evidenceScoreMax: 100,
          confidence: "high",
          activity: "IP/path investigation performed by analyst",
          interpretation:
            "The analyst reviewed the node communication path. Correlation focus should remain on identity, connectivity, controls, activity, then interpretation.",
        },
      },
      mentorHint: {
        text: "Connectivity investigation recorded. Confirm required coverage before containment.",
        trigger: "ACTION",
      },
    };
  }

  if (actionId === "inv-user" && selectedNodeId) {
    return {
      ...baseDecision,
      nodeRuntimePatches: {
        [selectedNodeId]: {
          evidenceScoreDelta: 8,
          evidenceScoreMax: 100,
          confidence: "high",
          activity: "User-context investigation performed by analyst",
          interpretation:
            "User and baseline context were reviewed. The node should be assessed against expected privileges and behavior, not alerts alone.",
        },
      },
      mentorHint: {
        text: "Identity investigation recorded. Review required coverage before escalating containment.",
        trigger: "ACTION",
      },
    };
  }

  if (actionId === "isolate" && selectedNodeId) {
    const blockedConnectionIds = connections
      .filter(
        connection =>
          connection.from === selectedNodeId ||
          connection.to === selectedNodeId
      )
      .map(connection => connection.id)
      .filter(Boolean);

    return {
      ...baseDecision,
      blockedConnectionIds,
      nodeRuntimePatches: {
        [selectedNodeId]: {
          status: "isolated",
          controlState: "isolated-by-analyst",
          activity: "Machine isolated — network access severed",
          interpretation:
            "The node has been contained by analyst action. It is no longer participating in active network communication.",
        },
      },
      actionLogs: [
        {
          msg: `ACTION: ${String(selectedNodeId).toUpperCase()} isolated — all network connections severed`,
          type: "action",
        },
      ],
    };
  }

  if (actionId === "block-ip") {
    const blockedConnectionIds = connections
      .filter(
        connection =>
          connection.from === "external" ||
          connection.to === "external" ||
          (
            selectedNodeId &&
            (
              connection.from === selectedNodeId ||
              connection.to === selectedNodeId
            )
          )
      )
      .map(connection => connection.id)
      .filter(Boolean);

    return {
      ...baseDecision,
      blockedConnectionIds,
      nodeRuntimePatches: {
        external: {
          status: "isolated",
          controlState: "blocked-at-perimeter",
          activity: "Perimeter block rule applied against external endpoint",
          interpretation: "The external route has been cut off by firewall action.",
        },
        ...(selectedNodeId
          ? {
              [selectedNodeId]: {
                activity: "Node communication path restricted after IP block",
              },
            }
          : {}),
      },
      actionLogs: [
        {
          msg: "FIREWALL: Block rule applied — attacker IP removed from network topology",
          type: "action",
        },
      ],
      mentorHint: {
        text: "IP blocked. The attacker communication path has been severed at the perimeter.",
        trigger: "ACTION",
      },
    };
  }

  if (actionId === "ignore" && selectedAlertId) {
    return {
      ...baseDecision,
      resolvedAlertIds: [],
      mentorHint: {
        text: "Ignoring this alert leaves the attacker more time to exploit trust paths and deepen the campaign.",
        trigger: "IGNORE",
      },
    };
  }

  return baseDecision;
}