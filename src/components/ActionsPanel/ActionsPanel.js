import React, { useState } from 'react';
import './ActionsPanel.css';

const INVESTIGATION_ACTIONS = [
  {
    id: 'inv-user',
    label: 'Review Identity / User Context',
    color: 'blue',
    category: 'Identity',
    dimension: 'identity',
    engineActionId: 'inv-user',
    result:
      'Identity review started. Checking user context, privileges, access history, and behavioral baseline...',
  },
  {
    id: 'inv-ip',
    label: 'Inspect Connectivity / IP Path',
    color: 'blue',
    category: 'Connectivity',
    dimension: 'connectivity',
    engineActionId: 'inv-ip',
    result:
      'Connectivity investigation started. Reviewing node communication paths, external routes, and suspicious edges...',
  },
  {
    id: 'review-logs',
    label: 'Review Activity / Related Logs',
    color: 'blue',
    category: 'Activity / Evidence',
    dimension: 'activity',
    engineActionId: null,
    result:
      'Activity review recorded. Analyst reviewed related logs, timestamps, and alert-linked evidence.',
  },
  {
    id: 'inspect-controls',
    label: 'Inspect Security Controls',
    color: 'yellow',
    category: 'Security Controls',
    dimension: 'controls',
    engineActionId: null,
    result:
      'Security control review recorded. Analyst checked firewall, EDR, and containment posture for the selected context.',
  },
  {
    id: 'interpret-evidence',
    label: 'Interpret Evidence',
    color: 'green',
    category: 'Interpretation',
    dimension: 'interpretation',
    engineActionId: null,
    result:
      'Evidence interpretation recorded. Analyst formed a reasoning-based conclusion from identity, connectivity, controls, and activity.',
  },
];

const RESPONSE_ACTIONS = [
  {
    id: 'isolate',
    label: 'Isolate Machine',
    color: 'yellow',
    category: 'Containment',
    engineActionId: 'isolate',
    result:
      'Machine isolation command sent to EDR. Network access revoked — host quarantined.',
  },
  {
    id: 'block-ip',
    label: 'Block External IP',
    color: 'red',
    category: 'Containment',
    engineActionId: 'block-ip',
    result:
      'Firewall block requested. Traffic to/from the suspicious external route is now being restricted.',
  },
  {
    id: 'ignore',
    label: 'Ignore / Mark Low Priority',
    color: 'dim',
    category: 'Disposition',
    engineActionId: 'ignore',
    result:
      'Alert disposition recorded as ignored or low priority. This may be risky if evidence has not been reviewed.',
  },
];

const INVESTIGATION_ORDER = [
  'identity',
  'connectivity',
  'controls',
  'activity',
  'interpretation',
];

const DIMENSION_LABELS = {
  identity: 'ID',
  connectivity: 'CONN',
  controls: 'CTRL',
  activity: 'ACT',
  interpretation: 'INT',
};

function getLockedMessage(stageLockReason) {
  if (stageLockReason === 'timeout') {
    return 'Stage expired. Actions are locked while the attacker advances to the next phase.';
  }

  return 'Stage secured. Actions are locked while the simulator advances.';
}

export default function ActionsPanel({
  selectedAlert,
  selectedNode,
  stageName,
  learningObjective,
  requiredDimensions = [],
  requiredTargets = [],
  investigationCoverage,
  investigationTargetCoverage,
  stageLocked,
  stageLockReason,
  onInvestigationAction,
  onAction
}) {
  const [result, setResult] = useState(null);
  const [fired, setFired] = useState(null);

  const hasContext = Boolean(selectedAlert || selectedNode);
  const requiredDimensionSet = new Set(requiredDimensions || []);

  const buildContextSuffix = () => {
    const parts = [];

    if (selectedAlert) {
      parts.push(`Alert: ${selectedAlert.id}`);
    }

    if (selectedNode) {
      parts.push(`Node: ${selectedNode}`);
    }

    return parts.length > 0 ? ` [${parts.join(' | ')}]` : '';
  };

  const handle = (action) => {
    if (stageLocked) {
      setResult(getLockedMessage(stageLockReason));
      return;
    }

    const contextSuffix = buildContextSuffix();
    const message = `${action.result}${contextSuffix}`;

    setFired(action.id);
    setResult(message);
    setTimeout(() => setFired(null), 600);

    if (onInvestigationAction && action.dimension) {
      onInvestigationAction({
        id: action.id,
        label: action.label,
        dimension: action.dimension,
        category: action.category,
      });
    }

    if (onAction && action.engineActionId) {
      onAction(action.engineActionId);
    }
  };

  const renderActionButton = (action) => (
    <button
      key={action.id}
      disabled={stageLocked}
      className={`actp__btn actp__btn--${action.color} ${
        fired === action.id ? 'actp__btn--fired' : ''
      } ${stageLocked ? 'is-disabled' : ''}`}
      onClick={() => handle(action)}
    >
      <span className="actp__btn-label">{action.label}</span>
      <span className="actp__btn-meta">{action.category}</span>
    </button>
  );

  return (
    <div className={`actp ${stageLocked ? 'is-locked' : ''}`}>
      <div className="panel-hdr actp__hdr">
        <div className="actp__hdr-main">
          <span className="panel-title">ACTIONS</span>
          <span className={`actp__ctx-state ${hasContext ? 'is-active' : ''}`}>
            {stageLocked
              ? stageLockReason === 'timeout'
                ? 'Expired'
                : 'Secured'
              : hasContext
                ? 'Context'
                : 'No Context'}
          </span>
        </div>

        <div className="actp__ctx">
          {selectedAlert && (
            <span className="actp__ctx-line">
              Alert: {selectedAlert.id}
            </span>
          )}
          {selectedNode && (
            <span className="actp__ctx-line">
              Node: {selectedNode}
            </span>
          )}
          {!selectedAlert && !selectedNode && (
            <span className="actp__ctx-line">
              Select alert, log, or node.
            </span>
          )}
        </div>
      </div>

      <div className="actp__body">
        <section className="actp__compact-stage">
          <div className="actp__compact-title">
            {stageName || 'Active Stage'}
          </div>

          <div className="actp__compact-objective">
            {learningObjective || 'Investigate evidence and respond based on validated findings.'}
          </div>
        </section>

        <section className="actp__compact-coverage">
          <div className="actp__coverage-row">
            <span>Coverage</span>
            <strong>
              {investigationTargetCoverage?.investigatedNodeCount || 0}
              /
              {investigationTargetCoverage?.suspiciousNodeCount || 0}
            </strong>
          </div>

          <div className="actp__mini-dimensions">
            {INVESTIGATION_ORDER.map(dimension => {
              const isCovered = investigationCoverage?.[dimension];
              const isRequired = requiredDimensionSet.has(dimension);

              return (
                <span
                  key={dimension}
                  className={[
                    'actp__mini-chip',
                    isCovered ? 'is-covered' : '',
                    isRequired ? 'is-required' : '',
                    !isRequired ? 'is-optional' : '',
                  ].join(' ')}
                  title={dimension}
                >
                  {isCovered ? '✓ ' : ''}
                  {DIMENSION_LABELS[dimension]}
                </span>
              );
            })}
          </div>

          <div className="actp__target-list">
            {requiredTargets.length > 0 ? (
              requiredTargets.map(targetId => {
                const targetCoverage =
                  investigationTargetCoverage?.nodeCoverage?.[targetId];

                return (
                  <span
                    key={targetId}
                    className={`actp__target-chip ${
                      targetCoverage?.investigated ? 'is-covered' : ''
                    }`}
                  >
                    {targetCoverage?.investigated ? '✓ ' : ''}
                    {targetId}
                  </span>
                );
              })
            ) : (
              <span className="actp__target-empty">
                No explicit targets.
              </span>
            )}
          </div>
        </section>

        <section className="actp__section">
          <div className="actp__section-hdr">
            <span>Investigate</span>
          </div>

          <div className="actp__btns">
            {INVESTIGATION_ACTIONS.map(renderActionButton)}
          </div>
        </section>

        <section className="actp__section">
          <div className="actp__section-hdr">
            <span>Respond</span>
          </div>

          <div
            className={`actp__response-warning ${
              investigationTargetCoverage?.allRequiredCoverageComplete
                ? 'is-ready'
                : 'is-risky'
            }`}
          >
            {investigationTargetCoverage?.allRequiredCoverageComplete
              ? 'Coverage complete. Response decision can be made.'
              : 'Response actions are risky before investigation coverage is complete.'}
          </div>

          <div className="actp__btns">
            {RESPONSE_ACTIONS.map(renderActionButton)}
          </div>
        </section>

        <section className="actp__latest">
          {result ? (
            <span>
              <b>▶</b> {result}
            </span>
          ) : (
            <span>
              Select context, investigate, then respond.
            </span>
          )}
        </section>
      </div>
    </div>
  );
}