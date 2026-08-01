import React, { useEffect, useRef } from 'react';
import './LogsPanel.css';

export default function LogsPanel({ logs, highlightedLogId, onLogClick }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs.length]);

  return (
    <section className="panel lp">
      <div className="panel-hdr">
        <span className="panel-title">SYSTEM LOGS</span>
        <span className="panel-badge">{logs.length} ENTRIES</span>
        <span className="lp__live">● LIVE FEED</span>
      </div>
      <div className="lp__scroll">
        {(logs || []).filter(Boolean).map((log, i) => (
          <div
            key={`${log.id || log.time || 'log'}-${i}`}
            className={`lp__row lp__row--${log.type || 'log'} ${highlightedLogId === log.id ? 'lp__row--hl' : ''}`}
            onClick={() => onLogClick(log)}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && onLogClick(log)}
          >
            <span className="lp__time">{log.time}</span>
            <span className="lp__dot" />
            <span className="lp__msg">{log.msg}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </section>
  );
}
