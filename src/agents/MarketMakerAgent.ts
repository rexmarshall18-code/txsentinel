import { calculateInPlayProbabilities } from './PoissonModel';
import { solanaService } from '../services/SolanaService';

export interface MarketQuotes {
  home: { bid: number; ask: number } | null;
  draw: { bid: number; ask: number } | null;
  away: { bid: number; ask: number } | null;
  over2_5: { bid: number; ask: number } | null;
  under2_5: { bid: number; ask: number } | null;
}

export interface Inventory {
  home: number;
  draw: number;
  away: number;
}

export class MarketMakerAgent {
  private targetSpread = 0.05;
  private inventory: Inventory = { home: 0, draw: 0, away: 0 };
  private activeQuotes: MarketQuotes | null = null;
  private logCallback: (msg: string) => void = () => {};

  private lastHomeScore = 0;
  private lastAwayScore = 0;
  private goalShock = 0.0;

  constructor(logCallback?: (msg: string) => void) {
    if (logCallback) this.logCallback = logCallback;
  }

  setLogCallback(callback: (msg: string) => void) {
    this.logCallback = callback;
  }

  getInventory(): Inventory {
    return this.inventory;
  }

  getActiveQuotes(): MarketQuotes | null {
    return this.activeQuotes;
  }

  reset() {
    this.inventory = { home: 0, draw: 0, away: 0 };
    this.activeQuotes = null;
    this.lastHomeScore = 0;
    this.lastAwayScore = 0;
    this.goalShock = 0.0;
  }

  processMatchUpdate(
    elapsedMinutes: number,
    homeScore: number,
    awayScore: number,
    preHomeExp: number,
    preAwayExp: number
  ): MarketQuotes {
    const timeWeight = Math.min(0.98, elapsedMinutes / 90);

    if (homeScore > this.lastHomeScore || awayScore > this.lastAwayScore) {
      this.goalShock = 0.20 * (1 - timeWeight);
      this.logCallback(`[MMA] ⚡ Volatility Shock (Goal). Widening spreads by +${(this.goalShock * 100).toFixed(1)}%`);
    } else {
      this.goalShock = Math.max(0, this.goalShock - 0.04);
    }
    this.lastHomeScore = homeScore;
    this.lastAwayScore = awayScore;

    const probs = calculateInPlayProbabilities(
      elapsedMinutes,
      homeScore,
      awayScore,
      preHomeExp,
      preAwayExp
    );

    const dynamicSpread = this.targetSpread + this.goalShock;

    const homeQuotes = this.calculateOddsQuote(probs.homeWin, dynamicSpread);
    const drawQuotes = this.calculateOddsQuote(probs.draw, dynamicSpread);
    const awayQuotes = this.calculateOddsQuote(probs.awayWin, dynamicSpread);
    const overQuotes = this.calculateOddsQuote(probs.over2_5, dynamicSpread);
    const underQuotes = this.calculateOddsQuote(probs.under2_5, dynamicSpread);

    const quotes: MarketQuotes = {
      home: homeQuotes,
      draw: drawQuotes,
      away: awayQuotes,
      over2_5: overQuotes,
      under2_5: underQuotes
    };

    this.activeQuotes = quotes;

    if (quotes.home) {
      solanaService.recordMMAQuote('1X2', quotes.home.bid, quotes.home.ask);
    }

    const homeStr = homeQuotes ? `${homeQuotes.bid}/${homeQuotes.ask}` : 'SUSPENDED';
    const drawStr = drawQuotes ? `${drawQuotes.bid}/${drawQuotes.ask}` : 'SUSPENDED';
    const awayStr = awayQuotes ? `${awayQuotes.bid}/${awayQuotes.ask}` : 'SUSPENDED';

    this.logCallback(
      `[MMA] Time: ${elapsedMinutes}' | Score: ${homeScore}-${awayScore} | Probs: H ${Math.round(
        probs.homeWin * 100
      )}% D ${Math.round(probs.draw * 100)}% A ${Math.round(probs.awayWin * 100)}%`
    );
    this.logCallback(
      `[MMA] Quoting 1X2 - Home: ${homeStr} | Draw: ${drawStr} | Away: ${awayStr} (Spread: ${(
        dynamicSpread * 100
      ).toFixed(1)}%)`
    );

    return quotes;
  }

  private calculateOddsQuote(prob: number, spread: number): { bid: number; ask: number } | null {
    if (prob <= 0.015 || prob >= 0.985) return null;

    const bidProb = Math.min(0.99, prob + spread / 2);
    const askProb = Math.max(0.01, prob - spread / 2);

    const bidOdds = parseFloat((1 / bidProb).toFixed(2));
    const askOdds = parseFloat((1 / askProb).toFixed(2));
    const adjustedAsk = askOdds <= bidOdds ? parseFloat((bidOdds + 0.05).toFixed(2)) : askOdds;

    return { bid: bidOdds, ask: adjustedAsk };
  }

  acceptBet(outcome: 'home' | 'draw' | 'away', amountUSDC: number, odds: number): boolean {
    if (this.activeQuotes && !this.activeQuotes[outcome]) {
      this.logCallback(`[MMA] Rejected retail bet on [${outcome.toUpperCase()}]: Market Suspended`);
      return false;
    }

    const maxPayoutLimit = 150;
    const maxBetAllowed = odds <= 1.01 ? 100 : Math.min(100, maxPayoutLimit / (odds - 1));
    
    if (amountUSDC > maxBetAllowed) {
      const originalAmount = amountUSDC;
      amountUSDC = parseFloat(maxBetAllowed.toFixed(2));
      this.logCallback(`[MMA] Bet size cap triggered (Odds: ${odds}). Capped ${originalAmount} USDC down to ${amountUSDC} USDC.`);
    }
    
    if (outcome === 'home') {
      this.inventory.home -= amountUSDC * (odds - 1);
      this.inventory.draw += amountUSDC;
      this.inventory.away += amountUSDC;
    } else if (outcome === 'draw') {
      this.inventory.home += amountUSDC;
      this.inventory.draw -= amountUSDC * (odds - 1);
      this.inventory.away += amountUSDC;
    } else if (outcome === 'away') {
      this.inventory.home += amountUSDC;
      this.inventory.draw += amountUSDC;
      this.inventory.away -= amountUSDC * (odds - 1);
    }

    this.logCallback(
      `[MMA] Accepted BACK bet on [${outcome.toUpperCase()}] | Vol: ${amountUSDC} USDC @ ${odds}. Liabilities: H: ${Math.round(
        this.inventory.home
      )} | D: ${Math.round(this.inventory.draw)} | A: ${Math.round(this.inventory.away)}`
    );
    return true;
  }
}
