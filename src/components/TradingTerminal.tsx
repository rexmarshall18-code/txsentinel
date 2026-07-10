import React, { useState } from 'react';
import type { Fixture } from '../services/TxLineClient';
import { Play, Pause, RefreshCw, Radio, HelpCircle } from 'lucide-react';

interface TradingTerminalProps {
  currentMatch: Fixture;
  simulationMinute: number;
  isSimulating: boolean;
  onSelectMatch: (id: string) => void;
  onToggleSimulation: () => void;
  onResetSimulation: () => void;
  matches: Fixture[];
  apiTokenInput: string;
  onApiTokenChange: (val: string) => void;
  onActivateApiToken: () => void;
  onAirdrop: () => void;
  children: React.ReactNode;
}

export const TradingTerminal: React.FC<TradingTerminalProps> = ({
  currentMatch,
  simulationMinute,
  isSimulating,
  onSelectMatch,
  onToggleSimulation,
  onResetSimulation,
  matches,
  apiTokenInput,
  onApiTokenChange,
  onActivateApiToken,
  onAirdrop,
  children
}) => {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="terminal-container">
      <header className="terminal-header">
        <div className="header-title-sec">
          <h1>TxSentinel Desk</h1>
          <p>Autonomous Sports Market Maker & Hedging Desk</p>
        </div>

        <div className="status-group">
          <div className="status-pill">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" style={{ color: '#10b981' }} />
            <span>TxLINE:</span>
            <span style={{ color: '#10b981', fontWeight: 600 }}>Devnet SSE Connected</span>
          </div>

          <div className="status-pill">
            <span className="live-pulse pulse-sky"></span>
            <span>Solana:</span>
            <span style={{ color: '#38bdf8', fontWeight: 600 }}>Devnet Cluster</span>
          </div>

          <button onClick={onAirdrop} className="btn-action btn-activate">
            Airdrop 1 SOL
          </button>

          <button
            onClick={() => setShowHelp(!showHelp)}
            className="btn-action btn-reset"
            style={{ padding: '6px' }}
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </header>

      {showHelp && (
        <div className="help-overlay panel">
          <h3>How TxSentinel Works</h3>
          <p>
            1. <strong>Poisson Pricing</strong>: The Market Maker Agent (MMA) ingests the score & time to continuously price bids/asks (Back/Lay odds) around the fair Poisson model probability.
            <br />
            2. <strong>Inventory Management</strong>: When a retail trade occurs (e.g. by clicking bid/ask odds), MMA takes on liability.
            <br />
            3. <strong>Hedging</strong>: If MMA liability exceeds -120 USDC on any outcome, the Hedger Agent (HA) places offset trades on the TxLINE consensus price.
            <br />
            4. <strong>Solana Settlement</strong>: Trades are logged on Solana Devnet. Upon match completion, the final score proof settles the payouts on-chain.
          </p>
        </div>
      )}

      <section className="scoreboard-panel panel">
        <div className="replay-controls">
          <div>
            <label className="control-label">Select Match Replay</label>
            <select
              value={currentMatch.id}
              onChange={(e) => onSelectMatch(e.target.value)}
              className="select-dropdown"
              style={{ width: '100%', marginTop: '4px' }}
            >
              {matches.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.homeTeam} vs {m.awayTeam} (World Cup Replay)
                </option>
              ))}
            </select>
          </div>

          <div className="btn-row">
            <button
              onClick={onToggleSimulation}
              className={`btn-action ${isSimulating ? 'btn-toggle-pause' : 'btn-toggle-play'}`}
            >
              {isSimulating ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" /> Pause Replay
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" /> Start Replay
                </>
              )}
            </button>

            <button onClick={onResetSimulation} className="btn-action btn-reset" title="Reset Simulation">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="scoreboard-center">
          <div className="team-box home">
            <span className="team-name">{currentMatch.homeTeam}</span>
            <span className="team-label">Home</span>
          </div>

          <div className="score-box">
            <span className="score-numbers">
              {currentMatch.homeScore}:{currentMatch.awayScore}
            </span>
            <div className="time-badge">
              <span className="live-pulse pulse-rose"></span>
              <span>{simulationMinute}' Elapsed</span>
            </div>
          </div>

          <div className="team-box away">
            <span className="team-name">{currentMatch.awayTeam}</span>
            <span className="team-label">Away</span>
          </div>
        </div>

        <div className="activation-sec">
          <span className="control-label">TxLINE API Activation</span>
          <div className="activation-row">
            <input
              type="password"
              placeholder="Paste API token or guest JWT..."
              value={apiTokenInput}
              onChange={(e) => onApiTokenChange(e.target.value)}
              className="input-token"
            />
            <button onClick={onActivateApiToken} className="btn-activate">
              Activate
            </button>
          </div>
          <span style={{ fontSize: '9px', color: '#64748b' }}>
            Activated subscriptions authenticate using the <code>X-Api-Token</code> header.
          </span>
        </div>
      </section>

      <main className="workspace-grid">
        {children}
      </main>
    </div>
  );
};
