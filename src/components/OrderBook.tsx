import React from 'react';
import type { MarketQuotes } from '../agents/MarketMakerAgent';
import type { ConsensusOdds } from '../services/TxLineClient';
import { TrendingUp } from 'lucide-react';

interface OrderBookProps {
  quotes: MarketQuotes | null;
  consensusOdds: ConsensusOdds | null;
  onPlaceBet: (outcome: 'home' | 'draw' | 'away', odds: number) => void;
}

export const OrderBook: React.FC<OrderBookProps> = ({ quotes, consensusOdds, onPlaceBet }) => {
  if (!quotes || !consensusOdds) {
    return (
      <div className="panel flex-between" style={{ flexDirection: 'column', padding: '40px 20px', textAlign: 'center', height: '100%', justifyContent: 'center' }}>
        <TrendingUp className="w-12 h-12 text-slate-600 mb-3 animate-pulse" style={{ color: '#475569', marginBottom: '12px' }} />
        <p style={{ color: '#94a3b8', fontWeight: 500 }}>Waiting for live odds feed...</p>
        <p style={{ fontSize: '11px', color: '#475569', marginTop: '4px' }}>Start a match simulation or connect to TxLINE</p>
      </div>
    );
  }

  const rows = [
    { key: 'home' as const, label: 'Home Team', quote: quotes.home, consensus: consensusOdds.home },
    { key: 'draw' as const, label: 'Draw', quote: quotes.draw, consensus: consensusOdds.draw },
    { key: 'away' as const, label: 'Away Team', quote: quotes.away, consensus: consensusOdds.away }
  ];

  return (
    <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="flex-between" style={{ marginBottom: '12px' }}>
        <h3 className="title-with-icon font-semibold text-slate-100">
          <TrendingUp className="w-5 h-5 text-sky-400" style={{ color: '#38bdf8' }} />
          Autonomous Order Book
        </h3>
        <span style={{ fontSize: '9px', fontFamily: 'monospace', padding: '2px 8px', borderRadius: '4px', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
          Spread Active
        </span>
      </div>

      <p className="text-muted-p" style={{ marginBottom: '16px' }}>
        Below are the two-sided quotes offered by our <strong>Market Maker Agent (MMA)</strong>. 
        Click any MMA quote to place a simulated retail trade and shift the agent's risk inventory.
      </p>

      {/* Main Table */}
      <div style={{ flex: 1, overflowX: 'auto' }}>
        <table className="orderbook-table">
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Outcome</th>
              <th style={{ textAlign: 'center' }}>MMA Bid (Back)</th>
              <th style={{ textAlign: 'center' }}>MMA Ask (Lay)</th>
              <th style={{ textAlign: 'right' }}>TxLINE Consensus</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <td style={{ fontWeight: 600, color: '#f8fafc' }}>{row.label}</td>
                
                {/* BID */}
                <td style={{ textAlign: 'center' }}>
                  {row.quote ? (
                    <button
                      onClick={() => onPlaceBet(row.key, row.quote!.bid)}
                      className="btn-quote bid"
                    >
                      {row.quote.bid.toFixed(2)}
                    </button>
                  ) : (
                    <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, fontFamily: 'monospace', background: 'rgba(255,255,255,0.02)', padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.04)' }}>
                      SUSPENDED
                    </span>
                  )}
                </td>

                {/* ASK */}
                <td style={{ textAlign: 'center' }}>
                  {row.quote ? (
                    <button
                      onClick={() => onPlaceBet(row.key, row.quote!.ask)}
                      className="btn-quote ask"
                    >
                      {row.quote.ask.toFixed(2)}
                    </button>
                  ) : (
                    <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, fontFamily: 'monospace', background: 'rgba(255,255,255,0.02)', padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.04)' }}>
                      SUSPENDED
                    </span>
                  )}
                </td>

                {/* CONSENSUS */}
                <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#94a3b8' }}>
                  {row.consensus > 50 ? '—' : row.consensus.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Extra Markets: Over/Under 2.5 */}
      <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <h4 className="control-label" style={{ marginBottom: '8px' }}>Over/Under 2.5 Goals</h4>
        <div className="extra-market-grid">
          <div className="extra-market-box">
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Over 2.5</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              {quotes.over2_5 ? (
                <>
                  <span className="extra-odds-pill bid">
                    Bid {quotes.over2_5.bid.toFixed(2)}
                  </span>
                  <span className="extra-odds-pill ask">
                    Ask {quotes.over2_5.ask.toFixed(2)}
                  </span>
                </>
              ) : (
                <span style={{ fontSize: '9px', color: '#64748b', fontWeight: 700, fontFamily: 'monospace' }}>SUSPENDED</span>
              )}
            </div>
          </div>
          <div className="extra-market-box">
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Under 2.5</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              {quotes.under2_5 ? (
                <>
                  <span className="extra-odds-pill bid">
                    Bid {quotes.under2_5.bid.toFixed(2)}
                  </span>
                  <span className="extra-odds-pill ask">
                    Ask {quotes.under2_5.ask.toFixed(2)}
                  </span>
                </>
              ) : (
                <span style={{ fontSize: '9px', color: '#64748b', fontWeight: 700, fontFamily: 'monospace' }}>SUSPENDED</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
