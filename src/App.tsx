import { useState, useEffect, useRef, useMemo } from 'react';
import { SIMULATED_MATCHES, type Fixture, type ConsensusOdds } from './services/TxLineClient';
import { solanaService, type TxRecord } from './services/SolanaService';
import { MarketMakerAgent } from './agents/MarketMakerAgent';
import { HedgerAgent, type HedgePosition } from './agents/HedgerAgent';
import { TradingTerminal } from './components/TradingTerminal';
import { OrderBook } from './components/OrderBook';
import { AgentLogs } from './components/AgentLogs';
import { RiskPanel } from './components/RiskPanel';
import { Calendar } from 'lucide-react';
import { calculateInPlayProbabilities } from './agents/PoissonModel';

export default function App() {
  const [apiTokenInput, setApiTokenInput] = useState('');
  const [selectedMatchId, setSelectedMatchId] = useState('sim-arg-fra-2022');
  
  const [currentMatch, setCurrentMatch] = useState<Fixture>({ ...SIMULATED_MATCHES[0] });
  const [simulationMinute, setSimulationMinute] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  
  const [quotes, setQuotes] = useState<any>(null);
  const [inventory, setInventory] = useState({ home: 0, draw: 0, away: 0 });
  const [netExposure, setNetExposure] = useState({ home: 0, draw: 0, away: 0 });
  const [activeHedges, setActiveHedges] = useState<HedgePosition[]>([]);
  
  const [solBalance, setSolBalance] = useState(1.45);
  const [txHistory, setTxHistory] = useState<TxRecord[]>([]);
  const [pnlHistory, setPnlHistory] = useState<{ step: number; pnl: number }[]>([]);
  const pnlStepCounter = useRef(0);

  const mma = useMemo(() => new MarketMakerAgent(), []);
  const ha = useMemo(() => new HedgerAgent(), []);

  useEffect(() => {
    mma.setLogCallback((msg) => setLogs((prev) => [...prev, msg]));
    ha.setLogCallback((msg) => setLogs((prev) => [...prev, msg]));
    
    setLogs([
      '[MMA] Market Maker Agent initialized on 1X2 and Over/Under 2.5 goals.',
      '[HEDGER] Hedger Agent risk limits set. Trigger threshold: -120 USDC. Hedge Ratio: 70%.',
      '[SOLANA] Connected to Solana Devnet RPC. Mock subscription active.'
    ]);
  }, [mma, ha]);

  useEffect(() => {
    const updateWallet = async () => {
      const balance = await solanaService.getBalance();
      setSolBalance(balance);
      setTxHistory(solanaService.getHistory());
    };
    updateWallet();
  }, []);

  const handleSelectMatch = (id: string) => {
    const matched = SIMULATED_MATCHES.find((m) => m.id === id);
    if (matched) {
      setSelectedMatchId(id);
      setCurrentMatch({ ...matched, status: 'PRE_MATCH', homeScore: 0, awayScore: 0 });
      setSimulationMinute(0);
      setIsSimulating(false);
      mma.reset();
      ha.reset();
      setQuotes(null);
      setInventory({ home: 0, draw: 0, away: 0 });
      setNetExposure({ home: 0, draw: 0, away: 0 });
      setActiveHedges([]);
      setPnlHistory([]);
      setLogs((prev) => [
        ...prev,
        `[SOLANA] Switched match context to [${matched.homeTeam} vs ${matched.awayTeam}]. Portfolio inventory cleared.`
      ]);
    }
  };

  const handleToggleSimulation = () => {
    setIsSimulating(!isSimulating);
  };

  const handleResetSimulation = () => {
    const original = SIMULATED_MATCHES.find((m) => m.id === selectedMatchId);
    if (original) {
      setCurrentMatch({ ...original, status: 'PRE_MATCH', homeScore: 0, awayScore: 0 });
      setSimulationMinute(0);
      setIsSimulating(false);
      mma.reset();
      ha.reset();
      setQuotes(null);
      setInventory({ home: 0, draw: 0, away: 0 });
      setNetExposure({ home: 0, draw: 0, away: 0 });
      setActiveHedges([]);
      setPnlHistory([]);
      setLogs((prev) => [...prev, '[SOLANA] Replay simulation reset. Ready.']);
    }
  };

  useEffect(() => {
    let interval: any = null;
    if (isSimulating) {
      interval = setInterval(() => {
        setSimulationMinute((prevMin) => {
          const nextMin = prevMin + 1;

          if (nextMin > 90) {
            setIsSimulating(false);
            clearInterval(interval);
            handleMatchFinished();
            return 90;
          }

          const newEvents = currentMatch.events.filter((e) => e.minute === nextMin);
          let newHomeScore = currentMatch.homeScore;
          let newAwayScore = currentMatch.awayScore;

          newEvents.forEach((ev) => {
            if (ev.type === 'GOAL') {
              if (ev.team === 'home') newHomeScore++;
              else newAwayScore++;
              setLogs((prev) => [
                ...prev,
                `[GOAL] ⚽ ${ev.team === 'home' ? currentMatch.homeTeam : currentMatch.awayTeam} SCORED! ${ev.detail} (Minute ${nextMin}')`
              ]);
            } else if (ev.type === 'CARD' || ev.type === 'RED_CARD') {
              setLogs((prev) => [
                ...prev,
                `[EVENT] 🟨 Card issued to ${ev.team === 'home' ? currentMatch.homeTeam : currentMatch.awayTeam}: ${ev.detail}`
              ]);
            }
          });

          if (newEvents.length > 0) {
            setCurrentMatch((prev) => ({
              ...prev,
              homeScore: newHomeScore,
              awayScore: newAwayScore,
              status: 'LIVE'
            }));
          }

          const newQuotes = mma.processMatchUpdate(
            nextMin,
            newHomeScore,
            newAwayScore,
            currentMatch.preMatchOdds.home,
            currentMatch.preMatchOdds.away
          );
          setQuotes(newQuotes);

          const probs = calculateInPlayProbabilities(
            nextMin,
            newHomeScore,
            newAwayScore,
            currentMatch.preMatchOdds.home,
            currentMatch.preMatchOdds.away
          );

          const consensusOdds: ConsensusOdds = {
            home: newQuotes.home ? parseFloat((1 / (1 / newQuotes.home.bid + 0.02)).toFixed(2)) : 999.0,
            draw: newQuotes.draw ? parseFloat((1 / (1 / newQuotes.draw.bid + 0.02)).toFixed(2)) : 999.0,
            away: newQuotes.away ? parseFloat((1 / (1 / newQuotes.away.bid + 0.02)).toFixed(2)) : 999.0,
            over2_5: 1.95,
            under2_5: 1.95,
            timestamp: Date.now()
          };

          if (Math.random() < 0.3) {
            const r = Math.random();
            let chosenOutcome: 'home' | 'draw' | 'away' = 'draw';
            if (r < probs.homeWin) {
              chosenOutcome = 'home';
            } else if (r < probs.homeWin + probs.draw) {
              chosenOutcome = 'draw';
            } else {
              chosenOutcome = 'away';
            }

            const quote = newQuotes[chosenOutcome];
            if (quote) {
              const betAmount = Math.floor(Math.random() * 40) + 15;
              mma.acceptBet(chosenOutcome, betAmount, quote.bid);
            }
          }

          const currentInventory = mma.getInventory();
          ha.checkAndHedge(currentInventory, consensusOdds, probs);

          const mmaVal = currentInventory.home * probs.homeWin + 
                         currentInventory.draw * probs.draw + 
                         currentInventory.away * probs.awayWin;

          let hedgeVal = 0;
          ha.getActiveHedges().forEach((hedge) => {
            const p = hedge.outcome === 'home' 
              ? probs.homeWin 
              : hedge.outcome === 'draw' 
              ? probs.draw 
              : probs.awayWin;
            hedgeVal += (hedge.amount * hedge.odds * p) - hedge.amount;
          });

          const currentPnL = Math.round(mmaVal + hedgeVal);
          setPnlHistory((prev) => [...prev, { step: nextMin, pnl: currentPnL }]);

          setInventory({ ...currentInventory });
          setActiveHedges([...ha.getActiveHedges()]);
          setNetExposure(ha.getNetExposure(currentInventory));
          setTxHistory([...solanaService.getHistory()]);

          return nextMin;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSimulating, currentMatch, mma, ha]);

  const handleMatchFinished = async () => {
    setLogs((prev) => [...prev, '[SOLANA] Match finished! Initializing on-chain settlement...']);

    const homeGoals = currentMatch.homeScore;
    const awayGoals = currentMatch.awayScore;
    let winningOutcome: 'home' | 'draw' | 'away' = 'draw';
    if (homeGoals > awayGoals) winningOutcome = 'home';
    else if (homeGoals < awayGoals) winningOutcome = 'away';

    const finalScoreStr = `${homeGoals}-${awayGoals}`;
    const proof = { MerkleRoot: '7xK4uT1gP8fLd3mQ2z6wXy9pE4cR5t6y7u8i9o0pA1b2' };

    solanaService.settleMatchOnChain(selectedMatchId, finalScoreStr, proof.MerkleRoot);

    const rawMMAInventory = mma.getInventory();
    let mmaPayout = rawMMAInventory[winningOutcome];

    let hedgePayout = 0;
    ha.getActiveHedges().forEach((hedge) => {
      if (hedge.outcome === winningOutcome) {
        hedgePayout += hedge.amount * (hedge.odds - 1);
      } else {
        hedgePayout -= hedge.amount;
      }
    });

    const totalPnL = Math.round(mmaPayout + hedgePayout);
    pnlStepCounter.current += 1;

    setPnlHistory((prev) => [...prev, { step: pnlStepCounter.current, pnl: totalPnL }]);
    setTxHistory([...solanaService.getHistory()]);

    setLogs((prev) => [
      ...prev,
      `[SOLANA] On-chain settlement verified. MMA: ${Math.round(
        mmaPayout
      )} USDC | Hedger: ${Math.round(hedgePayout)} USDC | Net: ${totalPnL} USDC`
    ]);
  };

  const handlePlaceBet = (outcome: 'home' | 'draw' | 'away', odds: number) => {
    const betAmount = 50;
    mma.acceptBet(outcome, betAmount, odds);

    const currentInventory = mma.getInventory();
    setInventory({ ...currentInventory });
    setNetExposure(ha.getNetExposure(currentInventory));

    setLogs((prev) => [
      ...prev,
      `[USER] Placed 50 USDC bet on [${outcome.toUpperCase()}] at MMA odds ${odds.toFixed(2)}`
    ]);
  };

  const handleAirdrop = async () => {
    await solanaService.requestAirdrop();
    const balance = await solanaService.getBalance();
    setSolBalance(balance);
    setTxHistory([...solanaService.getHistory()]);
  };

  const handleActivateApiToken = () => {
    if (!apiTokenInput.trim()) return;
    setLogs((prev) => [...prev, '[SOLANA] Requesting API key activation signature...']);
    setTimeout(() => {
      setLogs((prev) => [...prev, '[SOLANA] X-Api-Token successfully activated on-chain!']);
      setApiTokenInput('');
    }, 800);
  };

  return (
    <TradingTerminal
      currentMatch={currentMatch}
      simulationMinute={simulationMinute}
      isSimulating={isSimulating}
      onSelectMatch={handleSelectMatch}
      onToggleSimulation={handleToggleSimulation}
      onResetSimulation={handleResetSimulation}
      matches={SIMULATED_MATCHES}
      apiTokenInput={apiTokenInput}
      onApiTokenChange={setApiTokenInput}
      onActivateApiToken={handleActivateApiToken}
      onAirdrop={handleAirdrop}
    >
      <div className="grid-col-left">
        <div style={{ flex: 1 }}>
          <OrderBook
            quotes={quotes}
            consensusOdds={
              quotes
                ? {
                    home: quotes.home ? parseFloat((1 / (1 / quotes.home.bid + 0.02)).toFixed(2)) : 99.0,
                    draw: quotes.draw ? parseFloat((1 / (1 / quotes.draw.bid + 0.02)).toFixed(2)) : 99.0,
                    away: quotes.away ? parseFloat((1 / (1 / quotes.away.bid + 0.02)).toFixed(2)) : 99.0,
                    over2_5: quotes.over2_5 ? quotes.over2_5.bid : 1.95,
                    under2_5: quotes.under2_5 ? quotes.under2_5.bid : 1.95,
                    timestamp: Date.now()
                  }
                : null
            }
            onPlaceBet={handlePlaceBet}
          />
        </div>

        <div className="panel">
          <h4 className="control-label title-with-icon" style={{ marginBottom: '12px' }}>
            <Calendar className="w-4 h-4" style={{ color: '#10b981' }} />
            Match Live Timeline
          </h4>
          <div className="timeline-list">
            {currentMatch.events.filter((e) => e.minute <= simulationMinute).length === 0 ? (
              <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#475569', padding: '8px 0' }}>
                No events recorded. Waiting for kick off...
              </div>
            ) : (
              currentMatch.events
                .filter((e) => e.minute <= simulationMinute)
                .map((ev, idx) => (
                  <div key={idx} className="timeline-row">
                    <span className="timeline-time">{ev.minute}'</span>
                    <span className={`timeline-badge ${ev.type === 'GOAL' ? 'goal' : 'card'}`}>
                      {ev.type}
                    </span>
                    <span style={{ color: '#e2e8f0' }}>
                      <strong>{ev.team === 'home' ? currentMatch.homeTeam : currentMatch.awayTeam}</strong>: {ev.detail}
                    </span>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>

      <div className="grid-col-right">
        <div style={{ flex: 1 }}>
          <RiskPanel
            inventory={inventory}
            netExposure={netExposure}
            activeHedges={activeHedges}
            txHistory={txHistory}
            pnlHistory={pnlHistory}
            solBalance={solBalance}
            pubKey={solanaService.getPublicKey().toBase58()}
          />
        </div>

        <div style={{ flex: 1 }}>
          <AgentLogs logs={logs} />
        </div>
      </div>
    </TradingTerminal>
  );
}
