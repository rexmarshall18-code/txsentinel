import type { Inventory } from './MarketMakerAgent';
import type { ConsensusOdds } from '../services/TxLineClient';
import { solanaService } from '../services/SolanaService';

export interface HedgePosition {
  outcome: 'home' | 'draw' | 'away';
  amount: number;
  odds: number;
  payout: number;
}

export class HedgerAgent {
  private riskThreshold = -120;
  private hedgeRatio = 0.70;
  private activeHedges: HedgePosition[] = [];
  private logCallback: (msg: string) => void = () => {};

  constructor(logCallback?: (msg: string) => void) {
    if (logCallback) this.logCallback = logCallback;
  }

  setLogCallback(callback: (msg: string) => void) {
    this.logCallback = callback;
  }

  getActiveHedges(): HedgePosition[] {
    return this.activeHedges;
  }

  reset() {
    this.activeHedges = [];
  }

  checkAndHedge(
    inventory: Inventory,
    consensusOdds: ConsensusOdds,
    probs: { homeWin: number; draw: number; awayWin: number }
  ): void {
    const outcomes: Array<'home' | 'draw' | 'away'> = ['home', 'draw', 'away'];

    outcomes.forEach((outcome) => {
      const liability = inventory[outcome];
      const prob = outcome === 'home' ? probs.homeWin : outcome === 'draw' ? probs.draw : probs.awayWin;
      const expectedLiability = prob * liability;

      if (expectedLiability < this.riskThreshold) {
        const existingHedge = this.activeHedges
          .filter((h) => h.outcome === outcome)
          .reduce((sum, h) => sum + h.amount, 0);

        const targetHedgeLiability = Math.abs(expectedLiability) * this.hedgeRatio;
        const remainingHedgeNeeded = targetHedgeLiability - existingHedge;

        if (remainingHedgeNeeded > 10) {
          const odds = outcome === 'home' 
            ? consensusOdds.home 
            : outcome === 'draw' 
            ? consensusOdds.draw 
            : consensusOdds.away;

          const hedgeAmount = parseFloat(remainingHedgeNeeded.toFixed(2));
          const potentialPayout = parseFloat((hedgeAmount * (odds - 1)).toFixed(2));

          const newHedge: HedgePosition = {
            outcome,
            amount: hedgeAmount,
            odds,
            payout: potentialPayout
          };

          this.activeHedges.push(newHedge);

          solanaService.placeTradeOnChain(
            outcome.toUpperCase(),
            hedgeAmount,
            odds,
            'BUY'
          );

          this.logCallback(
            `[HEDGER] ⚠️ Risk limit breached on [${outcome.toUpperCase()}] (Expected Liab: ${Math.round(
              expectedLiability
            )} USDC). Hedging ${hedgeAmount} USDC @ consensus ${odds}`
          );
        }
      }
    });
  }

  getNetExposure(inventory: Inventory): { home: number; draw: number; away: number } {
    let homeNet = inventory.home;
    let drawNet = inventory.draw;
    let awayNet = inventory.away;

    this.activeHedges.forEach((hedge) => {
      if (hedge.outcome === 'home') {
        homeNet += hedge.amount * (hedge.odds - 1);
        drawNet -= hedge.amount;
        awayNet -= hedge.amount;
      } else if (hedge.outcome === 'draw') {
        homeNet -= hedge.amount;
        drawNet += hedge.amount * (hedge.odds - 1);
        awayNet -= hedge.amount;
      } else if (hedge.outcome === 'away') {
        homeNet -= hedge.amount;
        drawNet -= hedge.amount;
        awayNet += hedge.amount * (hedge.odds - 1);
      }
    });

    return {
      home: Math.round(homeNet),
      draw: Math.round(drawNet),
      away: Math.round(awayNet)
    };
  }
}
