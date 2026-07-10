import React from 'react';
import type { Inventory } from '../agents/MarketMakerAgent';
import type { HedgePosition } from '../agents/HedgerAgent';
import type { TxRecord } from '../services/SolanaService';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { Shield, Coins, CheckCircle, ExternalLink, Activity } from 'lucide-react';

interface RiskPanelProps {
  inventory: Inventory;
  netExposure: { home: number; draw: number; away: number };
  activeHedges: HedgePosition[];
  txHistory: TxRecord[];
  pnlHistory: { step: number; pnl: number }[];
  solBalance: number;
  pubKey: string;
}

export const RiskPanel: React.FC<RiskPanelProps> = ({
  inventory,
  netExposure,
  activeHedges,
  txHistory,
  pnlHistory,
  solBalance,
  pubKey
}) => {
  const getExposureClass = (val: number) => {
    if (val < -100) return 'net-badge risk';
    if (val < 0) return 'net-badge warn';
    return 'net-badge profit';
  };

  return (
    <div className="panel flex flex-col h-full" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <div className="flex-between" style={{ marginBottom: '12px' }}>
          <h3 className="title-with-icon font-semibold text-slate-100">
            <Shield className="w-5 h-5 text-rose-500" style={{ color: '#f43f5e' }} />
            Risk & Hedging Desk
          </h3>
          <div className="title-with-icon" style={{ fontSize: '12px', fontFamily: 'monospace' }}>
            <Coins className="w-4 h-4 text-amber-500" style={{ color: '#f59e0b' }} />
            <span>Wallet:</span>
            <span style={{ color: '#f59e0b', fontWeight: 700 }}>{solBalance.toFixed(2)} SOL</span>
          </div>
        </div>

        <div className="solana-pubkey-bar">
          SOLANA DEVNET PUBKEY: {pubKey}
        </div>

        <div className="exposure-grid">
          {(['home', 'draw', 'away'] as const).map((outcome) => {
            const rawLiab = Math.round(inventory[outcome]);
            const netExp = netExposure[outcome];
            const label = outcome.toUpperCase();

            return (
              <div key={outcome} className="exposure-card">
                <div className="exposure-card-label">{label}</div>
                <div className="exposure-card-row">
                  <span style={{ color: '#64748b' }}>MMA Liab:</span>
                  <span style={{ fontWeight: 600, color: rawLiab < 0 ? '#f43f5e' : '#10b981' }}>
                    {rawLiab} USDC
                  </span>
                </div>
                <div className="exposure-card-row net">
                  <span style={{ color: '#94a3b8' }}>Net Exp:</span>
                  <span className={getExposureClass(netExp)}>
                    {netExp} USDC
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ flex: 1 }}>
        <h4 className="control-label" style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Activity className="w-4 h-4 text-sky-400" style={{ color: '#38bdf8' }} />
          Cumulative Agent Portfolio PnL (USDC)
        </h4>
        <div style={{ height: '120px', background: 'rgba(9, 12, 20, 0.4)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)', padding: '8px' }}>
          {pnlHistory.length === 0 ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#475569', fontFamily: 'monospace' }}>
              Waiting for trade settlements to plot PnL...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={pnlHistory} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="step" hide />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 9 }} />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '6px' }}
                  labelStyle={{ display: 'none' }}
                  itemStyle={{ color: '#f8fafc', fontSize: 11, fontFamily: 'monospace' }}
                />
                <Area type="monotone" dataKey="pnl" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#pnlGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="hedges-list-container">
        <h4 className="control-label" style={{ marginBottom: '6px' }}>
          Active Hedges ({activeHedges.length})
        </h4>
        <div className="hedges-list">
          {activeHedges.length === 0 ? (
            <span style={{ color: '#475569', fontStyle: 'italic' }}>No active hedging positions</span>
          ) : (
            activeHedges.map((h, i) => (
              <div key={i} className="hedge-item">
                <span style={{ color: '#fbbf24', fontWeight: 700, textTransform: 'uppercase' }}>{h.outcome}</span>
                <span>{h.amount} USDC @ {h.odds.toFixed(2)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '140px' }}>
        <h4 className="control-label">Solana Devnet Tx Ledger</h4>
        <div className="solana-ledger-list">
          {txHistory.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#475569', fontFamily: 'monospace', padding: '32px 0' }}>
              No transactions recorded on Devnet yet.
            </div>
          ) : (
            txHistory.map((tx) => (
              <div key={tx.signature} className="solana-ledger-item">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className={`solana-ledger-type ${
                      tx.type === 'AIRDROP' ? 'airdrop' :
                      tx.type === 'TRADE_EXEC' ? 'trade' :
                      tx.type === 'SETTLE_PROVED' ? 'settle' : 'quote'
                    }`}>{tx.type}</span>
                    <span style={{ fontSize: '10px', color: '#475569', fontFamily: 'monospace' }}>{tx.signature.substring(0, 10)}...</span>
                  </div>
                  <span style={{ color: '#94a3b8', fontSize: '10px' }}>{tx.description}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {tx.status === 'SUCCESS' ? (
                    <span className="solana-ledger-status confirmed">
                      <CheckCircle className="w-3 h-3" /> Confirmed
                    </span>
                  ) : tx.status === 'FAILED' ? (
                    <span className="solana-ledger-status pending" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                      Failed
                    </span>
                  ) : (
                    <span className="solana-ledger-status pending">Pending</span>
                  )}
                  <a href={`https://explorer.solana.com/tx/${tx.signature}?cluster=devnet`} target="_blank" rel="noreferrer" style={{ color: '#94a3b8' }}>
                    <ExternalLink className="w-3 h-3 hover:text-slate-200" />
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
