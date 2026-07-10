function factorial(n: number): number {
  if (n <= 1) return 1;
  let res = 1;
  for (let i = 2; i <= n; i++) res *= i;
  return res;
}

export function poissonProbability(lambda: number, k: number): number {
  if (lambda < 0) return 0;
  if (lambda === 0) return k === 0 ? 1 : 0;
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

export interface MatchProbabilities {
  homeWin: number;
  draw: number;
  awayWin: number;
  over2_5: number;
  under2_5: number;
  homeExpectedRemaining: number;
  awayExpectedRemaining: number;
}

export function calculateInPlayProbabilities(
  elapsedMinutes: number,
  currentHomeScore: number,
  currentAwayScore: number,
  preMatchHomeExpectation: number = 1.5,
  preMatchAwayExpectation: number = 1.2
): MatchProbabilities {
  const minutesClamped = Math.min(Math.max(0, elapsedMinutes), 90);
  const remainingTimeFraction = (90 - minutesClamped) / 90;

  const homeLambda = preMatchHomeExpectation * remainingTimeFraction;
  const awayLambda = preMatchAwayExpectation * remainingTimeFraction;

  let homeWin = 0;
  let draw = 0;
  let awayWin = 0;
  let over2_5 = 0;
  let under2_5 = 0;

  const maxGoals = 8;

  for (let h = 0; h <= maxGoals; h++) {
    const pHome = poissonProbability(homeLambda, h);
    for (let a = 0; a <= maxGoals; a++) {
      const pAway = poissonProbability(awayLambda, a);
      const pScenario = pHome * pAway;

      const finalHomeScore = currentHomeScore + h;
      const finalAwayScore = currentAwayScore + a;

      if (finalHomeScore > finalAwayScore) {
        homeWin += pScenario;
      } else if (finalHomeScore === finalAwayScore) {
        draw += pScenario;
      } else {
        awayWin += pScenario;
      }

      if (finalHomeScore + finalAwayScore > 2.5) {
        over2_5 += pScenario;
      } else {
        under2_5 += pScenario;
      }
    }
  }

  const sum1X2 = homeWin + draw + awayWin;
  if (sum1X2 > 0) {
    homeWin /= sum1X2;
    draw /= sum1X2;
    awayWin /= sum1X2;
  }

  const sumOU = over2_5 + under2_5;
  if (sumOU > 0) {
    over2_5 /= sumOU;
    under2_5 /= sumOU;
  }

  return {
    homeWin: parseFloat(homeWin.toFixed(4)),
    draw: parseFloat(draw.toFixed(4)),
    awayWin: parseFloat(awayWin.toFixed(4)),
    over2_5: parseFloat(over2_5.toFixed(4)),
    under2_5: parseFloat(under2_5.toFixed(4)),
    homeExpectedRemaining: parseFloat(homeLambda.toFixed(2)),
    awayExpectedRemaining: parseFloat(awayLambda.toFixed(2))
  };
}
