// Correct but exponential: must time out on larger amounts.
function coinChange(coins, amount) {
  const go = (a) => {
    if (a === 0) return 0;
    let best = Infinity;
    for (const c of coins) if (c <= a) best = Math.min(best, go(a - c) + 1);
    return best;
  };
  const r = go(amount);
  return r === Infinity ? -1 : r;
}
