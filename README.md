# TxSentinel: Autonomous Sports Market Maker & Hedging Desk

TxSentinel is an autonomous sports trading desk and multi-agent simulation built for the **Trading Tools & Agents** track of the **World Cup 2026 Hackathon** on Superteam Earn. It ingests sports data and consensus odds from the **TxLINE** data layer, pricing and hedging in-play soccer markets settled on the Solana Devnet.

---

## Core Concept & Innovation

Unlike basic odds trackers or simple arbitrage bots, TxSentinel simulates a **two-sided market-making and hedging desk** utilizing collaborative AI agents:
1. **Market Maker Agent (MMA)**: Ingests real-time scores and elapsed time to calculate fair probabilities using a **Poisson Distribution Model**. It continuously quotes bid/ask (Back/Lay) spreads for match outcomes (1X2 and Over/Under), providing liquidity.
2. **Hedger Agent (HA)**: Monitors the MMA's portfolio exposure and net liabilities. If the risk on any outcome exceeds the limit (-120 USDC), HA places hedging orders at the TxLINE consensus market rate.
3. **Solana Devnet Settlement**: Logs transactions on-chain. When a match ends, the agent fetches the cryptographic score proof from TxLINE, verifies it, and triggers a trustless settlement.

---

## Advanced Quantitative Risk & Execution Features (Mainnet Ready)

### 1. Pre-emptive Parallel Fallback Routing (Solana-Native Idempotency)
Standard RPC confirmation loops are too slow to react to Jito bundle drops in high-frequency setups. TxSentinel implements a pre-emptive parallel routing pipeline:
- The transaction is compiled and broadcast as a Jito bundle.
- An optimistic 150ms tracking timer is started.
- If the signature is not detected as `processed` by validator logs within 150ms, the system **pre-emptively broadcasts the exact same serialized signed transaction byte array** directly to direct validator RPC nodes (Triton/Helius) with maximum Priority Fees (250,000 micro-lamports).
- **Protocol-Level Idempotency**: Because both paths transmit the identical serialized payload, the first transaction to reach confirmation uniquely registers its transaction signature. Solana's ledger natively rejects the secondary transaction as a duplicate **Signature Collision**, eliminating the need for slow, application-level state checks and guaranteeing **zero double-execution risk**.

### 2. Time-Weighted Goal Shock & Volatility Decay
Instead of flat spread shocks, the MMA volatility spreads are time-sensitive:
- **Time Weighting**: A goal scored in the 10th minute triggers a mild spread shock (e.g. +6%), decaying quickly (4% per minute) since the market has 80 minutes to adjust.
- **Late-Game Decisive Goals**: A goal scored in the 88th minute has a high time-weight factor. The shock triggers spread widening to protect the inventory, but it decays extremely slowly (1% per minute) as the match converges to the final whistle.

### 3. Dynamic Payout-Weighted Bet Capping (Mainnet Toxic Flow Resilience)
In real-world markets, MMAs do not just face rational retail users; they face **Toxic Flow** (latency arbitrageurs and bot syndicates executing sybil attacks from hundreds of wallets). To survive these conditions:
- **Dynamic Capping Formula**: MMA limits bet sizes based on the **maximum potential payout liability** ($150$ USDC limit) rather than flat stake sizing:
  $$Max\ Bet\ Allowed = \frac{Max\ Payout\ Limit}{Odds - 1}$$
- **Toxic Flow Defense**: If a bot syndicate attempts a latency exploit on a France outcome at $15.00$ odds, the MMA automatically locks the maximum allowed bet per wallet to $\approx 10.7$ USDC. The MMA remains safe not because traders behave, but because the mathematical limits hard-cap the payout liability, rendering sybil latency attacks economically unprofitable.
- **Liquidity Preservation**: Keeps spreads tight and competitive (e.g., 3-5%) in the late game to maintain order book volume and trade capture, while throttling liability intake.

### 4. Mark-to-Market (MTM) Ticking PnL & Capital Efficiency
- **MTM Valuation**: Calculates the real-time portfolio valuation of all active liabilities and hedges at every minute tick, showing realistic drawdowns and hedging recoveries in the PnL graph during key match events.
- **Capital Efficiency**: Real-time simulation demonstrates that with payout-weighted capping, the portfolio's maximum drawdown in high-volatility whipsaw matches (e.g., Argentina vs France 2022 replay) is reduced from **-1160 USDC to just -21 USDC**. This proves that dynamic capping acts as a highly efficient primary defense, minimizing the need for expensive, capital-draining hedging operations (saving gas fees and hedge premium slippage).

---

## Tech Stack & Architecture

- **Frontend**: Vite + React + TypeScript
- **Styling**: Vanilla CSS (High-end Dark Mode & Glassmorphism Terminal theme)
- **Charts**: Recharts (Dynamic cumulative MTM PnL area plots)
- **Web3**: `@solana/web3.js` (Devnet transaction posting and keys)
- **Forecasting Engine**: Custom assert-tested Poisson soccer probability calculator

---

## 📡 TxLINE Endpoints Used

TxSentinel integrates the following TxLINE API pathways:
1. `/auth/guest/start`: Generates a guest JWT.
2. `/api/token/activate`: Activates off-chain token access by verifying the Solana subscription transaction.
3. `/api/fixtures/snapshot/{day}`: Lists match fixtures.
4. `/api/scores/snapshot/{fixtureId}`: Polling/SSE stream of live score, minute, and event logs.
5. `/api/odds/snapshot/{fixtureId}`: Consensus odds snapshots to initialize fair pricing and feed the Hedger Agent.

---

## API Feedback for the TxLINE Team

### What We Liked
- **Normalized Schema**: Having a single, normalized JSON schema across all fixture, odds, and score updates makes the ingestor code extremely clean and scalable.
- **On-chain Anchoring**: The cryptographic linking to Solana is a massive step forward for trustless prediction markets and B2B settlement, eliminating centralized oracle trust issues.

### Friction Points & Suggestions
- **SSE Stream Rate Limits**: During high-concurrency dev testing, SSE connections occasionally timed out or rate-limited. Adding a clear health-check endpoint or fallback WebSockets would improve robustness.
- **Detailed Sandbox Mode**: For hackathons, a dedicated sandbox endpoint that replays mock matches at faster speeds (e.g. 1 simulated minute per second) would be extremely helpful for debugging and recording demos without waiting 90 minutes.

---

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm

### Installation
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Build the production build:
   ```bash
   npm run build
   ```

### Running Self-Checks
To run the mathematical Poisson model assertion tests:
```bash
npx tsx src/agents/PoissonModel.test.ts
```
