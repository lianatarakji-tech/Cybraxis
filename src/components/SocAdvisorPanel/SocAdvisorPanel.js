import React, { useState, useEffect, useRef } from 'react';
import {
  TUTOR_RESPONSES,
} from "../../data/mock/mockData";
import './SocAdvisorPanel.css';

const QUERY_BUTTONS = [
  { key: 'hint',      label: 'Stage Hint' },
  { key: 'alert',     label: 'Explain Alert' },
  { key: 'log',       label: 'Explain Log' },
  { key: 'killchain', label: 'Kill Chain Stage' },
];

function buildScenarioStageResponse(key, stage, fallbackStageId) {
  if (!stage) {
    return TUTOR_RESPONSES[key]?.[fallbackStageId] ?? 'No data available for this stage.';
  }

  if (key === 'killchain') {
    return `Stage ${stage.number || ''} â€” ${stage.label || stage.name || stage.id}: ${stage.description || stage.learningObjective || 'Review the current attack phase and connect the evidence before taking response action.'}`;
  }

  if (key === 'hint') {
    return stage.guidance || stage.learningObjective || stage.description || 'Review the current stage objective, inspect the relevant evidence, and avoid response actions before investigation coverage is complete.';
  }

  if (key === 'alert') {
    return stage.alertExplanation || `The current alert belongs to ${stage.label || stage.name || stage.id}. Use it as the starting point, then validate related nodes, logs, and the network path before choosing a response.`;
  }

  if (key === 'log') {
    return stage.logExplanation || `Logs in this stage should be used to confirm timing, source, destination, and whether the activity matches normal baseline behavior.`;
  }

  return TUTOR_RESPONSES[key]?.[fallbackStageId] ?? 'No data available for this stage.';
}


function isOperationalMentorNoise(text = "") {
  const value = String(text || "").trim();

  return (
    /^(identity|connectivity|controls|activity|interpretation)\s+investigation\s+recorded\.?/i.test(value) ||
    /this\s+action\s+is\s+not\s+part\s+of\s+the\s+expected\s+response\s+set\s+for\s+the\s+current\s+stage/i.test(value) ||
    /selected\s+node\s+or\s+target\s+does\s+not\s+match\s+the\s+action\s+objective/i.test(value)
  );
}
function formatHintTrigger(trigger) {
  const value = String(trigger || "").toUpperCase();

  if (!value) return "";

  if (
    value.includes("FALLBACK") ||
    value.includes("REQUEST") ||
    value.includes("AI") ||
    value.includes("MENTOR")
  ) {
    return "MENTOR";
  }

  if (value.includes("WRONG")) return "GUIDANCE";
  if (value.includes("STAGE")) return "STAGE";
  if (value.includes("ALERT")) return "ALERT";
  if (value.includes("LOG")) return "LOG";

  return "MENTOR";
}

export default function SocAdvisorPanel({
  open,
  onClose,
  currentStageIndex,
  killChainStages = [],
  hints = [],
  onRequestHint,
aiAdaptiveLoading = false,
}) {
  const [activeQuery,   setActiveQuery]   = useState(null);
  const [queryResponse, setQueryResponse] = useState(null);
  const [queryLoading,  setQueryLoading]  = useState(false);
  const hintsRef = useRef(null);
  const shouldAutoScrollHintsRef = useRef(true);

  function handleHintsScroll() {
    const node = hintsRef.current;
    if (!node) return;

    const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
    shouldAutoScrollHintsRef.current = distanceFromBottom < 28;
  }

  const stages = Array.isArray(killChainStages) ? killChainStages : [];
  const currentStage = stages[currentStageIndex];

  const stageId = currentStage?.id;
  const stageLabel = currentStage?.label || currentStage?.name || currentStage?.id;

  const visibleHints = (Array.isArray(hints) ? hints : []).filter(
    hint => !isOperationalMentorNoise(hint?.text)
  );

  useEffect(() => {
    setActiveQuery(null);
    setQueryResponse(null);
  }, [currentStageIndex, stageId]);

  useEffect(() => {
    if (!open || !hintsRef.current) return;

    if (shouldAutoScrollHintsRef.current) {
      hintsRef.current.scrollTop = hintsRef.current.scrollHeight;
    }
  }, [visibleHints.length, open]);

  const handleQuery = (key) => {
    if (queryLoading) return;

    setActiveQuery(key);
    setQueryLoading(true);
    setQueryResponse(null);

    setTimeout(() => {
      setQueryResponse(buildScenarioStageResponse(key, currentStage, stageId));
      setQueryLoading(false);
    }, 700);
  };

  return (
    <>
      {open && <div className="soc-backdrop" onClick={onClose} />}

      <aside className={`soc-panel${open ? ' soc-panel--open' : ''}`}>
        <div className="soc-panel__hdr">
          <svg className="soc-panel__eye" viewBox="0 0 24 24" fill="none">
            <ellipse cx="12" cy="12" rx="10" ry="6" stroke="currentColor" strokeWidth="1.5"/>
            <circle  cx="12" cy="12" r="3"  stroke="currentColor" strokeWidth="1.5"/>
            <circle  cx="12" cy="12" r="1"  fill="currentColor"/>
            <line x1="2"  y1="12" x2="5"  y2="12" stroke="currentColor" strokeWidth="1" strokeDasharray="1 1"/>
            <line x1="19" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="1" strokeDasharray="1 1"/>
            <line x1="12" y1="2"  x2="12" y2="5"  stroke="currentColor" strokeWidth="1" strokeDasharray="1 1"/>
            <line x1="12" y1="19" x2="12" y2="22" stroke="currentColor" strokeWidth="1" strokeDasharray="1 1"/>
          </svg>

          <span className="soc-panel__title">SOC ADVISOR</span>

          <button className="soc-panel__close" onClick={onClose} title="Close">X</button>
        </div>

        <div className="soc-panel__sub">
          STAGE: {stageLabel?.toUpperCase() ?? "-"}
        </div>

        <div className="soc-panel__body">
          <section className="soc-section">
            <div className="soc-section__hdr">
              <span className="soc-section__title">STAGE GUIDANCE</span>
            </div>

            <div className="soc-query-btns">
              {QUERY_BUTTONS.map(btn => (
                <button
                  key={btn.key}
                  className={`soc-query-btn${activeQuery === btn.key ? ' soc-query-btn--active' : ''}`}
                  onClick={() => handleQuery(btn.key)}
                  disabled={queryLoading}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            <div className="soc-response-area">
              {queryLoading && (
                <div className="soc-typing">
                  <span /><span /><span />
                </div>
              )}

              {!queryLoading && queryResponse && (
                <div className="soc-response">
                  <div className="soc-response__tag">
                    {QUERY_BUTTONS.find(b => b.key === activeQuery)?.label}
                  </div>
                  <p className="soc-response__text">{queryResponse}</p>
                </div>
              )}

              {!queryLoading && !queryResponse && (
                <p className="soc-response__placeholder">
                  Select a query above for guidance on the current stage.
                </p>
              )}
            </div>
          </section>

          <section className="soc-section soc-section--hints">
            <div className="soc-section__hdr">
              <span className="soc-section__title">MENTOR HINTS</span>
              <span className="soc-section__count">{visibleHints.length}</span>
            </div>

            <div className="soc-hints-list" ref={hintsRef} onScroll={handleHintsScroll}>
              {hints.length === 0 && (
                <p className="soc-empty">
                  No hints yet. Request one below or interact with the simulation.
                </p>
              )}

              {visibleHints.map((hint, i) => (
                <div key={`${hint.id}-${i}`} className="soc-hint">
                  <div className="soc-hint__meta">
                    <span className="soc-hint__num">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="soc-hint__ts">{hint.ts}</span>
                    {hint.trigger && (
                      <span className="soc-hint__trigger">{formatHintTrigger(hint.trigger)}</span>
                    )}
                  </div>

                  <p className="soc-hint__text">{hint.text}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="soc-panel__footer">
          <button className="soc-request-btn" onClick={onRequestHint} disabled={aiAdaptiveLoading}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            {aiAdaptiveLoading ? "Requesting..." : "Request Hint"}
          </button>
        </div>
      </aside>
    </>
  );
}



