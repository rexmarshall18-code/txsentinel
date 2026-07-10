import { calculateInPlayProbabilities, poissonProbability } from './PoissonModel';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`[PASS] ${message}`);
}

console.log('Starting Poisson soccer model self-check...');

const e_minus_1_5 = Math.exp(-1.5);
const p0 = poissonProbability(1.5, 0);
assert(Math.abs(p0 - e_minus_1_5) < 0.0001, 'poissonProbability(1.5, 0) should equal e^-1.5');

const startProbs = calculateInPlayProbabilities(0, 0, 0, 1.5, 1.2);
const sumStart = startProbs.homeWin + startProbs.draw + startProbs.awayWin;
assert(Math.abs(sumStart - 1.0) < 0.001, 'Start probabilities must sum to 1.0');
assert(startProbs.homeWin > startProbs.awayWin, 'Home team with higher expectation should have higher win probability');

const endProbsHomeWin = calculateInPlayProbabilities(90, 2, 0, 1.5, 1.2);
assert(endProbsHomeWin.homeWin === 1.0, 'If 2-0 at minute 90, Home win probability must be 1.0');
assert(endProbsHomeWin.draw === 0.0, 'If 2-0 at minute 90, Draw probability must be 0.0');

const endProbsDraw = calculateInPlayProbabilities(90, 1, 1, 1.5, 1.2);
assert(endProbsDraw.draw === 1.0, 'If 1-1 at minute 90, Draw probability must be 1.0');

console.log('All model self-checks completed successfully!');
