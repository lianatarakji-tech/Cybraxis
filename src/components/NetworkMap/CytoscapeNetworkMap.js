import React, { useMemo, useRef, useEffect, useCallback, useState } from "react";
import CytoscapeComponent from "react-cytoscapejs";
import "./CytoscapeNetworkMap.css";

const TYPE_STYLE = {
  router: { bg: "#0a1e35", border: "#1a6fb5", color: "#5ab4f5" },
  workstation: { bg: "#0a2218", border: "#1a7a45", color: "#4fd080" },
  server: { bg: "#241808", border: "#a06010", color: "#f0a040" },
  database: { bg: "#1e0a28", border: "#8020b0", color: "#c060e0" },
  external: { bg: "#280a0a", border: "#aa1515", color: "#f05050" },
};

const STATUS_STYLE = {
  normal: null,
  suspicious: {
    border: "#ffd740",
    color: "#ffd740",
    shadow: "0 0 10px rgba(255,215,64,0.45)",
  },
  compromised: {
    border: "#ff3b3b",
    color: "#ff3b3b",
    shadow: "0 0 12px rgba(255,59,59,0.5)",
  },
  isolated: {
    border: "#555",
    color: "#888",
    shadow: "none",
    bg: "#111",
  },
};

const STATUS_COLORS = {
  normal: "#4fd080",
  suspicious: "#ffd740",
  compromised: "#ff3b3b",
  isolated: "#888",
};

const INVESTIGATION_TABS = [
  { id: "identity", label: "IDENTITY" },
  { id: "connectivity", label: "CONNECTIVITY" },
  { id: "controls", label: "CONTROLS" },
  { id: "activity", label: "ACTIVITY" },
  { id: "interpretation", label: "INTERPRETATION" },
];

function resolveStatus(nodeId, nodeRuntime, suspiciousNodes = []) {
  if (nodeRuntime?.[nodeId]?.status) return nodeRuntime[nodeId].status;
  if (suspiciousNodes.includes(nodeId)) return "suspicious";
  return "normal";
}

function getNodeVisual(nodeType, status, isSelected) {
  const typeStyle = TYPE_STYLE[nodeType] || TYPE_STYLE.workstation;
  const statusStyle = STATUS_STYLE[status] || STATUS_STYLE.normal;

  return {
    bg: statusStyle?.bg || typeStyle.bg,
    border: isSelected ? "#00e5ff" : statusStyle?.border || typeStyle.border,
    color: isSelected ? "#00e5ff" : statusStyle?.color || typeStyle.color,
    shadow: isSelected
      ? "0 0 16px rgba(0,229,255,0.5)"
      : statusStyle?.shadow || "none",
    opacity: status === "isolated" ? 0.55 : 1,
  };
}

function buildCyElements({
  scenario,
  nodeRuntime,
  suspiciousNodes,
  selectedNodeId,
  attackEdges,
  blockedConnections,
  highlightedEdges,
}) {
  const nodes = scenario.nodes.map((node) => {
    const runtime = nodeRuntime?.[node.id] || {};
    const status = resolveStatus(node.id, nodeRuntime, suspiciousNodes);
    const visual = getNodeVisual(node.nodeType, status, node.id === selectedNodeId);

    return {
      data: {
        id: node.id,
        label: node.label,
        nodeType: node.nodeType,
        ip: node.ip,
        user: node.user,
        hostname: node.hostname || node.id.toUpperCase(),
        role: node.role,
        zone: node.zone,
        criticality: node.criticality,
        securityProfile: node.securityProfile,
        networkProfile: node.networkProfile,
        accessProfile: node.accessProfile,
        status,
        controlState: runtime.controlState || "unknown",
        evidenceScore: runtime.evidenceScore || 0,
        confidence: runtime.confidence || "low",
        lastActivity: runtime.activity || node.lastActivity || null,
        interpretation: runtime.interpretation || "No interpretation available.",
        bg: visual.bg,
        border: visual.border,
        color: visual.color,
        shadow: visual.shadow,
        opacity: visual.opacity,
      },
      position: node.position,
      classes: node.id === selectedNodeId ? "selected" : "",
    };
  });

  const edges = scenario.connections
    .filter((connection) => {
      const fromStatus = resolveStatus(connection.from, nodeRuntime, suspiciousNodes);
      const toStatus = resolveStatus(connection.to, nodeRuntime, suspiciousNodes);

      return (
        !blockedConnections.has(connection.id) &&
        fromStatus !== "isolated" &&
        toStatus !== "isolated"
      );
    })
    .map((connection) => {
      const isAttack = attackEdges.includes(connection.id);
      const isHighlighted = highlightedEdges && highlightedEdges.has(connection.id);
      const stroke = isHighlighted ? "#00e5ff" : isAttack ? "#ff4444" : "#1a3a55";
      const width = isAttack || isHighlighted ? 2.6 : 1.4;

      return {
        data: {
          id: connection.id,
          source: connection.from,
          target: connection.to,
          stroke,
          width,
          animated: isAttack || isHighlighted,
        },
        classes: [
          isAttack ? "attack-edge" : "",
          isHighlighted ? "highlighted-edge" : "",
        ].join(" "),
      };
    });

  return [...nodes, ...edges];
}

function InfoRow({ label, value, accent }) {
  return (
    <div className="cynm__info-row">
      <div className="cynm__info-label">{label}</div>
      <div
        className="cynm__info-value"
        style={accent ? { color: accent, fontWeight: 700 } : undefined}
      >
        {value || "—"}
      </div>
    </div>
  );
}

function joinList(items) {
  if (!items || items.length === 0) return "—";
  return items.join(", ");
}

function InvestigationDrawer({ node, scenario, onClose }) {
  const [activeTab, setActiveTab] = useState("identity");

  if (!node) return null;

  const connectedEdges = scenario.connections.filter(
    (connection) => connection.from === node.id || connection.to === node.id
  );

  const connectedNodes = connectedEdges.map((connection) =>
    connection.from === node.id ? connection.to : connection.from
  );

  const status = node.status || "normal";

  const renderTabContent = () => {
    switch (activeTab) {
      case "identity":
        return (
          <>
            <InfoRow label="Host" value={node.hostname || node.id.toUpperCase()} />
            <InfoRow label="IP" value={node.ip || "N/A"} />
            <InfoRow label="Type" value={node.nodeType || "—"} />
            <InfoRow label="Role" value={node.role || "—"} />
            <InfoRow label="Zone" value={node.zone || "—"} />
            <InfoRow label="Criticality" value={String(node.criticality || "—").toUpperCase()} />
            <InfoRow label="User" value={node.user || "—"} />
            <InfoRow
              label="Status"
              value={String(status).toUpperCase()}
              accent={STATUS_COLORS[status] || "#4fd080"}
            />
            <InfoRow label="Confidence" value={String(node.confidence || "low").toUpperCase()} />
            <InfoRow label="Evidence" value={`${node.evidenceScore || 0}/100`} />
          </>
        );

      case "connectivity":
        return (
          <>
            <InfoRow label="Peers" value={joinList(connectedNodes)} />
            <InfoRow label="Segment" value={node.networkProfile?.segment || "—"} />
            <InfoRow label="Inbound" value={joinList(node.networkProfile?.allowedInbound)} />
            <InfoRow label="Outbound" value={joinList(node.networkProfile?.allowedOutbound)} />
            <InfoRow label="Services" value={joinList(node.networkProfile?.exposedServices)} />
            <InfoRow label="Expected Peers" value={joinList(node.networkProfile?.expectedPeers)} />
          </>
        );

      case "controls":
        return (
          <>
            <InfoRow
              label="Firewall"
              value={node.securityProfile?.firewall?.present ? "Present" : "Not present"}
            />
            <InfoRow label="FW Product" value={node.securityProfile?.firewall?.product || "Unknown"} />
            <InfoRow label="Baseline" value={node.securityProfile?.firewall?.baselineState || "Unknown"} />
            <InfoRow label="Ctrl State" value={node.controlState || "unknown"} />
            <InfoRow label="Trust" value={node.securityProfile?.trustLevel || "—"} />
            <InfoRow label="Access" value={node.accessProfile?.accessLevel || "—"} />
            <InfoRow label="Monitoring" value={joinList(node.securityProfile?.monitoring)} />
            <InfoRow label="Restrictions" value={joinList(node.securityProfile?.restrictions)} />
          </>
        );

      case "activity":
        return (
          <>
            <InfoRow label="Last Activity" value={node.lastActivity || "No recent activity"} />
            <InfoRow label="Limits" value={joinList(node.accessProfile?.limitations)} />
            <InfoRow label="Evidence" value={`${node.evidenceScore || 0}/100`} />
            <InfoRow label="Confidence" value={String(node.confidence || "low").toUpperCase()} />
          </>
        );

      case "interpretation":
        return (
          <div className="cynm__interpretation">
            {node.interpretation || "No interpretation available."}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <aside className="cynm__drawer">
      <div className="cynm__drawer-hdr">
        <div>
          <span className="cynm__drawer-eyebrow">NODE INVESTIGATION</span>
          <strong className="cynm__drawer-title">
            {node.hostname || node.id.toUpperCase()}
          </strong>
        </div>

        <button className="cynm__drawer-close" onClick={onClose}>
          ✕
        </button>
      </div>

      <div className="cynm__drawer-tabs">
        {INVESTIGATION_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`cynm__drawer-tab ${activeTab === tab.id ? "is-active" : ""}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="cynm__drawer-content">{renderTabContent()}</div>
    </aside>
  );
}

export default function CytoscapeNetworkMap({
  scenario,
  attackEdges = [],
  nodeRuntime = {},
  blockedConnections = new Set(),
  highlightedEdges = new Set(),
  suspiciousNodes = [],
  selectedNodeId,
  onNodeClick,
}) {
  const cyRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);

  const elements = useMemo(
    () =>
      buildCyElements({
        scenario,
        nodeRuntime,
        suspiciousNodes,
        selectedNodeId,
        attackEdges,
        blockedConnections,
        highlightedEdges,
      }),
    [
      scenario,
      nodeRuntime,
      suspiciousNodes,
      selectedNodeId,
      attackEdges,
      blockedConnections,
      highlightedEdges,
    ]
  );

  const selectedNodeData = useMemo(() => {
    if (!selectedNodeId) return null;

    const element = elements.find(
      (item) => item.data?.id === selectedNodeId && !item.data?.source
    );

    return element?.data || null;
  }, [elements, selectedNodeId]);

  const stylesheet = useMemo(
    () => [
      {
        selector: "node",
        style: {
          "background-color": "data(bg)",
          "border-color": "data(border)",
          "border-width": 2,
          color: "data(color)",
          label: "data(label)",
          "font-family": "Share Tech Mono",
          "font-size": 10,
          "font-weight": 700,
          "text-valign": "center",
          "text-halign": "center",
          "text-wrap": "wrap",
          "text-max-width": 110,
          width: 110,
          height: 52,
          shape: "round-rectangle",
          "overlay-opacity": 0,
          opacity: "data(opacity)",
        },
      },
      {
        selector: "node.selected",
        style: {
          "border-color": "#00e5ff",
          "border-width": 3,
          color: "#00e5ff",
        },
      },
      {
        selector: "edge",
        style: {
          width: "data(width)",
          "line-color": "data(stroke)",
          "target-arrow-color": "data(stroke)",
          "target-arrow-shape": "triangle",
          "curve-style": "bezier",
          opacity: 0.88,
        },
      },
      {
        selector: ".attack-edge",
        style: {
          "line-style": "solid",
          opacity: 1,
        },
      },
      {
        selector: ".highlighted-edge",
        style: {
          opacity: 1,
        },
      },
    ],
    []
  );

  const layout = useMemo(
    () => ({
      name: "preset",
      fit: true,
      padding: 45,
      animate: false,
    }),
    []
  );

  const handleCyReady = useCallback(
    (cy) => {
      cyRef.current = cy;

      cy.on("tap", "node", (event) => {
        const nodeId = event.target.id();
        onNodeClick(nodeId);
      });

      cy.on("mouseover", "node", (event) => {
        const renderedPosition = event.target.renderedPosition();
        const data = event.target.data();

        setTooltip({
          data,
          x: renderedPosition.x,
          y: renderedPosition.y,
        });
      });

      cy.on("mouseout", "node", () => {
        setTooltip(null);
      });

      setTimeout(() => {
        cy.fit(undefined, 45);
      }, 80);
    },
    [onNodeClick]
  );

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    setTimeout(() => {
      cy.resize();
      cy.fit(undefined, 45);
    }, 80);
  }, [selectedNodeId, elements]);

  return (
    <section className="panel cynm">
      <div className="panel-hdr">
        <span className="panel-title">NETWORK MAP</span>
        <div className="cynm__legend">
          <span className="cynm__leg" style={{ color: "#4fd080" }}>● NORMAL</span>
          <span className="cynm__leg" style={{ color: "#ffd740" }}>● SUSPICIOUS</span>
          <span className="cynm__leg" style={{ color: "#ff3b3b" }}>● COMPROMISED</span>
          <span className="cynm__leg" style={{ color: "#888" }}>● ISOLATED</span>
        </div>
      </div>

      <div className={`cynm__body ${selectedNodeData ? "has-drawer" : ""}`}>
        <div className="cynm__graph">
          <CytoscapeComponent
            elements={elements}
            stylesheet={stylesheet}
            layout={layout}
            cy={handleCyReady}
            className="cynm__cy"
          />

          {tooltip && (
            <div
              className="cynm__tooltip"
              style={{
                left: tooltip.x + 18,
                top: tooltip.y - 120,
              }}
            >
              <div className="cynm__tooltip-host">
                {tooltip.data.hostname || tooltip.data.id.toUpperCase()}
              </div>

              {tooltip.data.ip && (
                <div className="cynm__tooltip-row">
                  <span>IP</span>
                  <span>{tooltip.data.ip}</span>
                </div>
              )}

              {tooltip.data.zone && (
                <div className="cynm__tooltip-row">
                  <span>Zone</span>
                  <span>{tooltip.data.zone}</span>
                </div>
              )}

              <div className="cynm__tooltip-row">
                <span>Status</span>
                <span
                  style={{
                    color: STATUS_COLORS[tooltip.data.status] || "#4fd080",
                    fontWeight: 700,
                  }}
                >
                  {(tooltip.data.status || "normal").toUpperCase()}
                </span>
              </div>

              <div className="cynm__tooltip-row">
                <span>Control</span>
                <span>{tooltip.data.controlState || "unknown"}</span>
              </div>

              <div className="cynm__tooltip-row">
                <span>Evidence</span>
                <span>{tooltip.data.evidenceScore || 0}/100</span>
              </div>
            </div>
          )}
        </div>

        {selectedNodeData && (
          <InvestigationDrawer
            node={selectedNodeData}
            scenario={scenario}
            onClose={() => onNodeClick(selectedNodeId)}
          />
        )}
      </div>
    </section>
  );
}