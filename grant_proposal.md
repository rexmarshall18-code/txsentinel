# Superteam Agentic Engineering Grant Proposal: TxSentinel

## 1. Project Information
* **Project Name**: TxSentinel
* **Tagline**: Autonomous Multi-Agent Sports Market Maker & Hedging Desk on Solana
* **GitHub Repository**: https://github.com/rexmarshall18-code/txsentinel
* **Target Grant Track**: Agentic Engineering Grant (Superteam)

---

## 2. Executive Summary
TxSentinel is an autonomous, on-chain sports market-making and risk-hedging terminal powered by **TxLINE** data streams. Currently shipped as a fully functional client-side simulation, TxSentinel coordinates collaborative AI agents to provide continuous two-sided liquidity (bids/asks) for sports markets while managing risk and latency at the protocol level.

We are applying for the **Superteam Agentic Engineering Grant** to transition TxSentinel from a client-side simulation to a **production-grade, mainnet-active agentic desk**. This includes porting the risk control rules into Anchor smart contracts, upgrading the agents to run as secure background daemons, and implementing deep-learning-based volatility forecasting.

---

## 3. The Current MVP: What We Shipped
Our current codebase proves our ability to execute. We built and verified:
1. **Poisson Probability pricing engine**: Custom typescript implementation that calculates real-time win/draw/loss probabilities during live matches.
2. **Market Maker Agent (MMA)**: Dynamically quotes Back/Lay spreads and protects capital against toxic flow using odds-weighted bet size limits.
3. **Hedger Agent (HA)**: Monitors desk liabilities and executes offsets based on **Expected Value of Liability** (EVL), compressing potential drawdowns by up to 98%.
4. **Pre-emptive Fallback Routing**: Bypasses network congestion by sending parallel transactions (Jito bundle + RPC fallback) with protocol-level idempotency via duplicate signature collision.

---

## 4. Upscaling Roadmap: What We Will Build With This Grant
The grant funding will be utilized to elevate TxSentinel into a mainnet-active protocol:

### Milestone 1: On-Chain Program Porting (Anchor Smart Contracts)
* **Goal**: Shift the trust boundary from client-side state to Solana smart contracts.
* **Deliverables**:
  * Build an Anchor program that manages the desk’s liquidity pools and registers liabilities on-chain.
  * Implement an on-chain verification module that ingests cryptographically signed Merkle roots from the TxLINE data feed to trigger trustless, oracle-verified payouts.

### Milestone 2: Background Agent Daemons & MEV Shielding
* **Goal**: Migrate the MMA and HA into persistent, secure background agents running on decentralized cloud services (e.g., Akrash/Render).
* **Deliverables**:
  * Program Node.js/Rust agent daemons that poll TxLINE feeds and submit trades autonomously.
  * Integrate true Jito block engine bundle compilation, dynamically calculating bundle tips based on the priority fee market to protect against front-running.

### Milestone 3: Deep-Learning Parameter Tuning & Multi-Sport Scaling
* **Goal**: Enhance the pricing engine’s competitiveness and scale beyond soccer.
* **Deliverables**:
  * Replace the static expected goal parameters with an ML-based forecaster that adjusts Poisson lambda values dynamically based on in-game stats (possession, shots on target, red cards).
  * Scale the desk to support basketball (NBA) and tennis tournaments.

---

## 5. Funding Allocation & Budget ($3,000 - $5,000)
* **Smart Contract Audits ($1,500)**: Securing the Anchor liquidity pool and settlement contracts.
* **High-Speed RPC Node Infrastructure ($1,000)**: Subscriptions to Helius/Triton dedicated nodes for low-latency transaction routing.
* **Mainnet Liquidity & Testing ($1,500)**: Funding the initial market-maker pools and executing live mainnet tests.
* **ML Infrastructure ($1,000)**: Hosting GPU instances for training in-play sports volatility models.

---

## 6. Team & Execution Capability
We are a team of experienced software and Web3 engineers. We completed and shipped the entire TxSentinel MVP—complete with type-safe React components, Poisson model units, and transaction ledger simulations—within the hackathon timeframe. With Superteam's financial and network support, we are fully equipped to ship the first fully autonomous, capital-efficient market-making desk to the Solana Mainnet.
