import React, { useEffect, useRef } from 'react';
import { Terminal, ShieldAlert } from 'lucide-react';

interface AgentLogsProps {
  logs: string[];
}

export const AgentLogs: React.FC<AgentLogsProps> = ({ logs }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of the container only, preventing window-level scroll hijacking
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  const parseLogLine = (line: string, index: number) => {
    // Determine colors based on agent tags
    let textColor = 'text-slate-300';

    if (line.includes('[MMA]')) {
      textColor = 'text-emerald-300/90';
    } else if (line.includes('[HEDGER]')) {
      textColor = 'text-amber-300/90';
    } else if (line.includes('[SOLANA]')) {
      textColor = 'text-indigo-300/90';
    } else if (line.includes('GOAL') || line.includes('Winner')) {
      textColor = 'text-rose-300 font-semibold';
    }

    // Custom styles for colors
    let customColor = '#e2e8f0'; // Default
    if (textColor.includes('emerald')) customColor = '#6ee7b7';
    else if (textColor.includes('amber')) customColor = '#fcd34d';
    else if (textColor.includes('indigo')) customColor = '#c7d2fe';
    else if (textColor.includes('rose')) customColor = '#fda4af';

    return (
      <div 
        key={index} 
        style={{
          fontFamily: 'monospace',
          fontSize: '11px',
          padding: '2px 0',
          borderLeft: '2px solid rgba(255,255,255,0.06)',
          paddingLeft: '12px',
          color: customColor,
          lineHeight: 1.6
        }}
      >
        <span style={{ color: '#475569', marginRight: '8px' }}>[{new Date().toLocaleTimeString()}]</span>
        {line}
      </div>
    );
  };

  return (
    <div className="panel" style={{ background: 'rgba(9, 12, 20, 0.85)', borderColor: 'rgba(255,255,255,0.04)', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="flex-between" style={{ paddingBottom: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', marginBottom: '12px' }}>
        <h3 className="title-with-icon font-semibold text-slate-200" style={{ fontSize: '13px' }}>
          <Terminal className="w-4 h-4 text-sky-400" style={{ color: '#38bdf8' }} />
          Agent Thought Engine (Mind Logs)
        </h3>
        <span className="title-with-icon" style={{ fontSize: '10px', color: '#fbbf24', fontFamily: 'monospace' }}>
          <ShieldAlert className="w-3.5 h-3.5 animate-pulse" />
          Real-time Audit
        </span>
      </div>

      <div ref={containerRef} className="agent-logs-console" style={{ flex: 1, overflowY: 'auto' }}>
        {logs.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#475569', padding: '32px 0' }}>
            <span className="live-pulse" style={{ backgroundColor: '#475569', boxShadow: 'none', marginBottom: '12px' }}></span>
            <p style={{ fontSize: '11px', fontFamily: 'monospace' }}>Thought engine initialized... waiting for update cycles.</p>
          </div>
        ) : (
          logs.map((log, idx) => parseLogLine(log, idx))
        )}
      </div>
    </div>
  );
};
