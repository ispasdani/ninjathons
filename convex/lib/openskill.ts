/**
 * OpenSkill's Plackett–Luce model (Weng and Lin, 2011) for Territory ratings
 * (decisions §16), one player per team. The usual defaults are multiplied by
 * 60, so a new player starts at 1500 like 1v1. Checked against the openskill
 * package in openskill.test.ts.
 */

const SCALE = 60;
export const DEFAULT_OPENSKILL = { mu: 25 * SCALE, sigma: (25 / 3) * SCALE };
const BETA = (25 / 6) * SCALE;
// Added to every player's uncertainty before a game, so it never shrinks to nothing.
const TAU = (25 / 300) * SCALE;
const KAPPA = 1e-4;

export type Skill = { mu: number; sigma: number };

/**
 * New ratings after one game. `ranks[i]` is player i's place (lower is
 * better; equal places are a tie). Returns ratings in the same order.
 */
export function rateGame(players: Skill[], ranks: number[]): Skill[] {
  if (players.length !== ranks.length) throw new Error("One rank per player");
  if (players.length < 2) throw new Error("A rated game needs at least two players");
  const sigmaSq = players.map((p) => p.sigma ** 2 + TAU ** 2);
  const c = Math.sqrt(sigmaSq.reduce((sum, s) => sum + s + BETA ** 2, 0));
  const expMu = players.map((p) => Math.exp(p.mu / c));
  // For each player q: the sum over everyone placed at or below q, and how many share q's place.
  const sumQ = ranks.map((rq) => ranks.reduce((sum, ri, i) => (ri >= rq ? sum + expMu[i] : sum), 0));
  const shared = ranks.map((rq) => ranks.filter((r) => r === rq).length);

  return players.map((player, i) => {
    let omega = 0;
    let delta = 0;
    for (let q = 0; q < players.length; q++) {
      if (ranks[q] > ranks[i]) continue;
      const quotient = expMu[i] / sumQ[q];
      omega += (i === q ? 1 - quotient : -quotient) / shared[q];
      delta += (quotient * (1 - quotient)) / shared[q];
    }
    const gamma = Math.sqrt(sigmaSq[i]) / c;
    return {
      mu: player.mu + (sigmaSq[i] / c) * omega,
      sigma: Math.sqrt(sigmaSq[i]) * Math.sqrt(Math.max(1 - (sigmaSq[i] / c ** 2) * gamma * delta, KAPPA)),
    };
  });
}
