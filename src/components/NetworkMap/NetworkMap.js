import React, { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import ReactFlow, { Background, Controls, MiniMap, MarkerType } from 'reactflow';
import 'reactflow/dist/style.css';
import './NetworkMap.css';

const TYPE_STYLE = {
  router: {
    bg: 'linear-gradient(180deg, rgba(0,229,255,0.13), rgba(4,18,32,0.98))',
    border: '#1a8fd2',
    color: '#72caff',
    glow: 'rgba(0, 229, 255, 0.22)',
  },
  workstation: {
    bg: 'linear-gradient(180deg, rgba(0,255,160,0.11), rgba(5,29,22,0.98))',
    border: '#1a8a63',
    color: '#65e0aa',
    glow: 'rgba(0, 255, 160, 0.18)',
  },
  server: {
    bg: 'linear-gradient(180deg, rgba(120,180,230,0.11), rgba(11,24,38,0.98))',
    border: '#4b789f',
    color: '#9fc7e8',
    glow: 'rgba(120,180,230,0.16)',
  },
  database: {
    bg: 'linear-gradient(180deg, rgba(170,130,255,0.12), rgba(21,14,36,0.98))',
    border: '#7965c8',
    color: '#c5b4ff',
    glow: 'rgba(170,130,255,0.18)',
  },
  external: {
    bg: 'linear-gradient(180deg, rgba(150,170,190,0.1), rgba(15,20,27,0.98))',
    border: '#647386',
    color: '#bac7d6',
    glow: 'rgba(150,170,190,0.12)',
  },
};

const STATUS_STYLE = {
  normal: null,
  suspicious: {
    border: '#ffd740',
    color: '#ffd740',
    shadow: '0 0 18px rgba(255,215,64,0.5), inset 0 0 16px rgba(255,215,64,0.08)',
    bg: 'linear-gradient(180deg, rgba(255,215,64,0.15), rgba(34,27,8,0.98))',
  },
  compromised: {
    border: '#ff3b3b',
    color: '#ff6060',
    shadow: '0 0 22px rgba(255,59,59,0.62), inset 0 0 18px rgba(255,59,59,0.1)',
    bg: 'linear-gradient(180deg, rgba(255,59,59,0.18), rgba(36,8,8,0.98))',
  },
  isolated: {
    border: '#4e5a64',
    color: '#87919a',
    shadow: 'none',
    bg: 'linear-gradient(180deg, rgba(110,120,130,0.08), rgba(12,14,16,0.98))',
  },
};

const STATUS_COLORS = {
  normal: '#4fd080',
  suspicious: '#ffd740',
  compromised: '#ff3b3b',
  isolated: '#888',
};

const INVESTIGATION_TABS = [
  { id: 'identity', label: 'IDENTITY' },
  { id: 'connectivity', label: 'CONNECTIVITY' },
  { id: 'controls', label: 'CONTROLS' },
  { id: 'activity', label: 'ACTIVITY' },
  { id: 'interpretation', label: 'INTERPRETATION' },
];

function resolveStatus(nodeId, nodeRuntime, suspiciousNodes = []) {
  if (nodeRuntime?.[nodeId]?.status) return nodeRuntime[nodeId].status;
  if (suspiciousNodes.includes(nodeId)) return 'suspicious';
  return 'normal';
}

function buildNodeStyle(nodeType, status, isSelected) {
  const t = TYPE_STYLE[nodeType] || TYPE_STYLE.workstation;
  const s = STATUS_STYLE[status] || STATUS_STYLE.normal;

  const baseShadow =
    s?.shadow !== undefined
      ? s.shadow
      : `0 0 12px ${t.glow}, inset 0 0 12px rgba(255,255,255,0.025)`;

  return {
    background: s?.bg || t.bg,
    border: `1.7px solid ${isSelected ? '#00e5ff' : (s?.border || t.border)}`,
    borderRadius: 7,
    color: isSelected ? '#00e5ff' : (s?.color || t.color),
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '0.7px',
    padding: '8px 13px',
    textAlign: 'center',
    whiteSpace: 'pre-line',
    lineHeight: 1.45,
    minWidth: 116,
    boxShadow: isSelected
      ? '0 0 24px rgba(0,229,255,0.72), 0 0 0 1px rgba(0,229,255,0.42), inset 0 0 18px rgba(0,229,255,0.12)'
      : baseShadow,
    transition: 'background 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease, color 0.22s ease, opacity 0.22s ease',
    cursor: 'pointer',
    opacity: status === 'isolated' ? 0.5 : 1,
    outline: isSelected ? '1px solid rgba(0,229,255,0.45)' : 'none',
    outlineOffset: 3,
  };
}

function buildFlowNodes(scenario, nodeRuntime, suspiciousNodes, selectedNodeId) {
  return scenario.nodes.map((n) => {
    const runtime = nodeRuntime?.[n.id] || {};
    const status = resolveStatus(n.id, nodeRuntime, suspiciousNodes);

    return {
      id: n.id,
      type: 'default',
      position: n.position,
      data: {
        label: n.label,
        nodeType: n.nodeType,
        ip: n.ip,
        user: n.user,
        hostname: n.hostname || n.id.toUpperCase(),
        role: n.role,
        zone: n.zone,
        criticality: n.criticality,
        securityProfile: n.securityProfile,
        networkProfile: n.networkProfile,
        accessProfile: n.accessProfile,
        status,
        controlState: runtime.controlState || 'unknown',
        evidenceScore: runtime.evidenceScore || 0,
        confidence: runtime.confidence || 'low',
        lastActivity: runtime.activity || n.lastActivity || null,
        interpretation: runtime.interpretation || 'No interpretation available.',
      },
      className: `nm-node nm-node--${n.nodeType || 'asset'} nm-node--${status} ${n.id === selectedNodeId ? 'nm-node--selected' : ''}`,
      style: buildNodeStyle(n.nodeType, status, n.id === selectedNodeId),
    };
  });
}

function buildFlowEdges(
  scenario,
  attackEdges = [],
  blockedConnections = new Set(),
  highlightedEdges = new Set(),
  nodeRuntime = {},
  suspiciousNodes = []
) {
  return scenario.connections
    .filter(c => {
      const fromStatus = resolveStatus(c.from, nodeRuntime, suspiciousNodes);
      const toStatus = resolveStatus(c.to, nodeRuntime, suspiciousNodes);

      return (
        !blockedConnections.has(c.id) &&
        fromStatus !== 'isolated' &&
        toStatus !== 'isolated'
      );
    })
    .map(c => {
      const isAttack = attackEdges.includes(c.id);
      const isHighlighted = highlightedEdges && highlightedEdges.has(c.id);

      const stroke = isHighlighted ? '#00e5ff' : isAttack ? '#ff4444' : '#2f789b';
      const width = isHighlighted ? 3 : isAttack ? 3.2 : 1.9;

      return {
        id: c.id,
        source: c.from,
        target: c.to,
        type: 'default',
        className: [
          'nm-edge',
          isAttack ? 'nm-edge--attack' : '',
          isHighlighted ? 'nm-edge--highlighted' : '',
        ].filter(Boolean).join(' '),
        style: {
          stroke,
          strokeWidth: width,
          strokeDasharray: isAttack ? '9 6' : isHighlighted ? '6 5' : '4 7',
          filter: isAttack
            ? 'drop-shadow(0 0 8px rgba(255,68,68,0.72))'
            : isHighlighted
              ? 'drop-shadow(0 0 8px rgba(0,229,255,0.65))'
              : 'drop-shadow(0 0 4px rgba(0,229,255,0.2))',
          opacity: isAttack || isHighlighted ? 1 : 0.88,
        },
        animated: isAttack || isHighlighted,
        markerEnd: isAttack || isHighlighted
          ? {
              type: MarkerType.ArrowClosed,
              color: stroke,
              width: 9,
              height: 9,
              strokeWidth: 1.8,
            }
          : undefined,
      };
    });
}

function InfoRow({ label, value, accent }) {
  return (
    <div className="nm__info-row">
      <div className="nm__info-label">{label}</div>
      <div
        className="nm__info-value"
        style={accent ? { color: accent, fontWeight: 700 } : undefined}
      >
        {value || '—'}
      </div>
    </div>
  );
}

function joinList(items) {
  if (!items || items.length === 0) return '—';
  return items.join(', ');
}

function InvestigationDrawer({ node, scenario, onClose }) {
  const [activeTab, setActiveTab] = useState('identity');

  if (!node) return null;

  const connectedEdges = scenario.connections.filter(
    (c) => c.from === node.id || c.to === node.id
  );

  const connectedNodes = connectedEdges.map((c) => (
    c.from === node.id ? c.to : c.from
  ));

  const status = node.data.status || 'normal';

  const renderTabContent = () => {
    switch (activeTab) {
      case 'identity':
        return (
          <>
            <InfoRow label="Host" value={node.data.hostname || node.id.toUpperCase()} />
            <InfoRow label="IP" value={node.data.ip || 'N/A'} />
            <InfoRow label="Type" value={node.data.nodeType || '—'} />
            <InfoRow label="Role" value={node.data.role || '—'} />
            <InfoRow label="Zone" value={node.data.zone || '—'} />
            <InfoRow label="Criticality" value={String(node.data.criticality || '—').toUpperCase()} />
            <InfoRow label="User" value={node.data.user || '—'} />
            <InfoRow
              label="Status"
              value={String(status).toUpperCase()}
              accent={STATUS_COLORS[status] || '#4fd080'}
            />
            <InfoRow label="Confidence" value={String(node.data.confidence || 'low').toUpperCase()} />
            <InfoRow label="Evidence" value={`${node.data.evidenceScore || 0}/100`} />
          </>
        );

      case 'connectivity':
        return (
          <>
            <InfoRow label="Peers" value={joinList(connectedNodes)} />
            <InfoRow label="Segment" value={node.data.networkProfile?.segment || '—'} />
            <InfoRow label="Inbound" value={joinList(node.data.networkProfile?.allowedInbound)} />
            <InfoRow label="Outbound" value={joinList(node.data.networkProfile?.allowedOutbound)} />
            <InfoRow label="Services" value={joinList(node.data.networkProfile?.exposedServices)} />
            <InfoRow label="Expected Peers" value={joinList(node.data.networkProfile?.expectedPeers)} />
          </>
        );

      case 'controls':
        return (
          <>
            <InfoRow
              label="Firewall"
              value={node.data.securityProfile?.firewall?.present ? 'Present' : 'Not present'}
            />
            <InfoRow label="FW Product" value={node.data.securityProfile?.firewall?.product || 'Unknown'} />
            <InfoRow label="Baseline" value={node.data.securityProfile?.firewall?.baselineState || 'Unknown'} />
            <InfoRow label="Ctrl State" value={node.data.controlState || 'unknown'} />
            <InfoRow label="Trust" value={node.data.securityProfile?.trustLevel || '—'} />
            <InfoRow label="Access" value={node.data.accessProfile?.accessLevel || '—'} />
            <InfoRow label="Monitoring" value={joinList(node.data.securityProfile?.monitoring)} />
            <InfoRow label="Restrictions" value={joinList(node.data.securityProfile?.restrictions)} />
          </>
        );

      case 'activity':
        return (
          <>
            <InfoRow label="Last Activity" value={node.data.lastActivity || 'No recent activity'} />
            <InfoRow label="Limits" value={joinList(node.data.accessProfile?.limitations)} />
            <InfoRow label="Evidence" value={`${node.data.evidenceScore || 0}/100`} />
            <InfoRow label="Confidence" value={String(node.data.confidence || 'low').toUpperCase()} />
          </>
        );

      case 'interpretation':
        return (
          <div className="nm__interpretation">
            {node.data.interpretation || 'No interpretation available.'}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <aside className={`nm__drawer nm__drawer--${status}`}>
      <div className="nm__drawer-hdr">
        <div>
          <span className="nm__drawer-eyebrow">NODE INVESTIGATION</span>
          <strong className="nm__drawer-title">
            {node.data.hostname || node.id.toUpperCase()}
          </strong>
        </div>

        <button className="nm__drawer-close" onClick={onClose}>
          ✕
        </button>
      </div>

      <div className="nm__drawer-tabs">
        {INVESTIGATION_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`nm__drawer-tab ${activeTab === tab.id ? 'is-active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="nm__drawer-content">
        {renderTabContent()}
      </div>
    </aside>
  );
}

export default function NetworkMap({
  scenario,
  attackEdges,
  nodeRuntime,
  blockedConnections,
  highlightedEdges,
  suspiciousNodes,
  selectedNodeId,
  onNodeClick,
}) {
  const [tooltip, setTooltip] = useState(null);
  const reactFlowInstanceRef = useRef(null);
  const lastCenteredNodeRef = useRef(null);

  const flowNodes = useMemo(
    () => buildFlowNodes(scenario, nodeRuntime, suspiciousNodes, selectedNodeId),
    [scenario, nodeRuntime, suspiciousNodes, selectedNodeId]
  );

  const flowEdges = useMemo(
    () => buildFlowEdges(
      scenario,
      attackEdges,
      blockedConnections,
      highlightedEdges,
      nodeRuntime,
      suspiciousNodes
    ),
    [scenario, attackEdges, blockedConnections, highlightedEdges, nodeRuntime, suspiciousNodes]
  );

  const centerNodeInView = useCallback((nodeId) => {
    const instance = reactFlowInstanceRef.current;
    if (!instance || !nodeId) return;

    const node = instance.getNode(nodeId);
    if (!node) return;

    const nodeWidth = node.width || 116;
    const nodeHeight = node.height || 58;
    const zoom = instance.getZoom();

    instance.setCenter(
      node.position.x + nodeWidth / 2,
      node.position.y + nodeHeight / 2,
      {
        zoom,
        duration: 360,
      }
    );
  }, []);

  const handleNodeClick = useCallback((_, node) => {
    onNodeClick(node.id);

    window.setTimeout(() => {
      centerNodeInView(node.id);
    }, 120);
  }, [onNodeClick, centerNodeInView]);

  useEffect(() => {
    if (!selectedNodeId) {
      lastCenteredNodeRef.current = null;
      return;
    }

    if (lastCenteredNodeRef.current === selectedNodeId) return;

    lastCenteredNodeRef.current = selectedNodeId;

    const timer = window.setTimeout(() => {
      centerNodeInView(selectedNodeId);
    }, 160);

    return () => window.clearTimeout(timer);
  }, [selectedNodeId, centerNodeInView]);

  const handleNodeMouseEnter = useCallback((e, node) => {
    setTooltip({ node, x: e.clientX, y: e.clientY });
  }, []);

  const handleNodeMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  const selectedFlowNode = selectedNodeId
    ? flowNodes.find(n => n.id === selectedNodeId)
    : null;

  return (
    <section className="panel nm">
      <div className="panel-hdr">
        <span className="panel-title">NETWORK MAP</span>
        <div className="nm__legend">
          <span className="nm__leg" style={{ color: '#4fd080' }}>● NORMAL</span>
          <span className="nm__leg" style={{ color: '#ffd740' }}>● SUSPICIOUS</span>
          <span className="nm__leg" style={{ color: '#ff3b3b' }}>● COMPROMISED</span>
          <span className="nm__leg" style={{ color: '#888' }}>● ISOLATED</span>
        </div>
      </div>

      <div className={`nm__body ${selectedFlowNode ? 'has-drawer' : ''}`}>
        <div className="nm__graph">
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            onInit={(instance) => {
              reactFlowInstanceRef.current = instance;
            }}
            onNodeClick={handleNodeClick}
            onNodeMouseEnter={handleNodeMouseEnter}
            onNodeMouseLeave={handleNodeMouseLeave}
            fitView
            fitViewOptions={{ padding: 0.22 }}
            nodesDraggable={false}
            nodesConnectable={false}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#0d3550" gap={22} size={0.65} />
            <Controls className="nm__controls" />

            {!selectedFlowNode && (
              <MiniMap
                className="nm__minimap"
                style={{ background: '#03101c', border: '1px solid #1a5575' }}
                nodeColor={(n) => {
                  const st = resolveStatus(n.id, nodeRuntime, suspiciousNodes);

                  return st !== 'normal'
                    ? STATUS_COLORS[st]
                    : (TYPE_STYLE[n.data?.nodeType]?.border || '#1a6fb5');
                }}
                maskColor="rgba(0,0,0,0.74)"
              />
            )}
          </ReactFlow>
        </div>

        {selectedFlowNode && (
          <InvestigationDrawer
            node={selectedFlowNode}
            scenario={scenario}
            onClose={() => onNodeClick(selectedNodeId)}
          />
        )}
      </div>

      {tooltip && (
        <div
          className="nm__tooltip"
          style={{
            position: 'fixed',
            left: tooltip.x + 14,
            top: tooltip.y - 140,
            zIndex: 9999,
          }}
        >
          <div className="nm__tooltip-host">
            {tooltip.node.data.hostname || tooltip.node.id.toUpperCase()}
          </div>

          {tooltip.node.data.ip && (
            <div className="nm__tooltip-row">
              <span>IP</span>
              <span>{tooltip.node.data.ip}</span>
            </div>
          )}

          {tooltip.node.data.zone && (
            <div className="nm__tooltip-row">
              <span>Zone</span>
              <span>{tooltip.node.data.zone}</span>
            </div>
          )}

          <div className="nm__tooltip-row">
            <span>Status</span>
            <span
              style={{
                color: STATUS_COLORS[tooltip.node.data.status] || '#4fd080',
                fontWeight: 700,
              }}
            >
              {(tooltip.node.data.status || 'normal').toUpperCase()}
            </span>
          </div>

          <div className="nm__tooltip-row">
            <span>Control</span>
            <span>{tooltip.node.data.controlState || 'unknown'}</span>
          </div>

          <div className="nm__tooltip-row">
            <span>Evidence</span>
            <span>{tooltip.node.data.evidenceScore || 0}/100</span>
          </div>

          {tooltip.node.data.lastActivity && (
            <div className="nm__tooltip-row">
              <span>Last</span>
              <span>{tooltip.node.data.lastActivity}</span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}