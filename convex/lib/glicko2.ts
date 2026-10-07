/**
 * Glicko-2 (Glickman, "Example of the Glicko-2 system", 2013). Pure maths, no
 * database: ratings.ts stores the results. Each ranked game is its own rating
 * period, the way most online games use it.
 */

export type Glicko = { rating: number; rd: number; volatility: number };
export type GameResult = { opponent: Pick<Glicko, "rating" | "rd">; score: 0 | 0.5 | 1 };

export const DEFAULT_GLICKO: Glicko = { rating: 1500, rd: 350, volatility: 0.06 };

// Constrains how fast volatility changes; the paper suggests 0.3 to 1.2.
const TAU = 0.5;
const SCALE = 173.7178;
const EPSILON = 0.000001;
// A rating deviation never grows past where a new player starts.
const MAX_RD = DEFAULT_GLICKO.rd;

const g = (phi: number) => 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI));
const expected = (mu: number, muJ: number, phiJ: number) => 1 / (1 + Math.exp(-g(phiJ) * (mu - muJ)));

/** The player's new rating after one rating period with these games. */
export function rate(player: Glicko, games: GameResult[]): Glicko {
  const mu = (player.rating - 1500) / SCALE;
  const phi = player.rd / SCALE;
  const sigma = player.volatility;

  // No games: only the uncertainty grows (step 6 of the paper).
  if (games.length === 0) {
    return { ...player, rd: Math.min(MAX_RD, Math.sqrt(phi * phi + sigma * sigma) * SCALE) };
  }

  const opponents = games.map(({ opponent, score }) => {
    const muJ = (opponent.rating - 1500) / SCALE;
    const phiJ = opponent.rd / SCALE;
    return { g: g(phiJ), e: expected(mu, muJ, phiJ), score };
  });

  // Steps 3 and 4: estimated variance and improvement.
  const v = 1 / opponents.reduce((sum, o) => sum + o.g * o.g * o.e * (1 - o.e), 0);
  const sumImprovement = opponents.reduce((sum, o) => sum + o.g * (o.score - o.e), 0);
  const delta = v * sumImprovement;

  // Step 5: new volatility, by the Illinois algorithm.
  const a = Math.log(sigma * sigma);
  const f = (x: number) => {
    const ex = Math.exp(x);
    return (ex * (delta * delta - phi * phi - v - ex)) / (2 * (phi * phi + v + ex) ** 2) - (x - a) / (TAU * TAU);
  };
  let A = a;
  let B: number;
  if (delta * delta > phi * phi + v) {
    B = Math.log(delta * delta - phi * phi - v);
  } else {
    let k = 1;
    while (f(a - k * TAU) < 0) k++;
    B = a - k * TAU;
  }
  let fA = f(A);
  let fB = f(B);
  while (Math.abs(B - A) > EPSILON) {
    const C = A + ((A - B) * fA) / (fB - fA);
    const fC = f(C);
    if (fC * fB <= 0) {
      A = B;
      fA = fB;
    } else {
      fA /= 2;
    }
    B = C;
    fB = fC;
  }
  const newSigma = Math.exp(A / 2);

  // Steps 6 to 8: new deviation and rating, back on the Glicko scale.
  const phiStar = Math.sqrt(phi * phi + newSigma * newSigma);
  const newPhi = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v);
  const newMu = mu + newPhi * newPhi * sumImprovement;
  return {
    rating: newMu * SCALE + 1500,
    rd: Math.min(MAX_RD, newPhi * SCALE),
    volatility: newSigma,
  };
}
