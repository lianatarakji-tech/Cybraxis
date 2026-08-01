import React from 'react';
import './AlertsPanel.css';

const SEV = {
  Critical: { cls: 'crit',   symbol: '◉' },
  High:     { cls: 'high',   symbol: '◈' },
  Medium:   { cls: 'med',    symbol: '◇' },
  Low:      { cls: 'low',    symbol: '○' },
};

export default function AlertsPanel({ alerts, selectedAlert, resolvedAlerts = new Set(), onAlertClick }) {
  const activeCount   = alerts.filter(a => !resolvedAlerts.has(a.id)).length;
  const resolvedCount = alerts.filter(a =>  resolvedAlerts.has(a.id)).length;

  return (
    <section className="panel ap">
      <div className="panel-hdr">
        <span className="panel-title">ALERTS</span>
        <span className="panel-badge">{activeCount} ACTIVE</span>
        {resolvedCount > 0 && <span className="panel-badge panel-badge--resolved">{resolvedCount} RESOLVED</span>}
      </div>
      <div className="ap__list">
        {alerts.length === 0 && <p className="ap__empty">No alerts in this stage.</p>}
        {alerts.map(a => {
          const s    = SEV[a.severity] || SEV.Low;
          const sel  = selectedAlert?.id === a.id;
          const done = resolvedAlerts.has(a.id);
          return (
            <div
              key={a.id}
              className={`ap__card ap__card--${s.cls} ${sel ? 'ap__card--sel' : ''} ${done ? 'ap__card--resolved' : ''}`}
              onClick={() => onAlertClick(a)}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && onAlertClick(a)}
            >
              <div className="ap__card-top">
                <span className={`ap__sev ap__sev--${s.cls}`}>{s.symbol} {a.severity.toUpperCase()}</span>
                <span className="ap__id">{a.id}</span>
                {done && <span className="ap__resolved-tag">✔ RESOLVED</span>}
              </div>
              <div className="ap__event">{a.event}</div>
              <div className="ap__meta">
                <span className="ap__ip">SRC: {a.sourceIp}</span>
                <span className="ap__ts">{a.timestamp}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
