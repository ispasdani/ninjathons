function coinChange(coins, amount) {
  const best = new Array(amount + 1).fill(Infinity);
  best[0] = 0;
  for (let a = 1; a <= amount; a++)
    for (const c of coins) if (c <= a && best[a - c] + 1 < best[a]) best[a] = best[a - c] + 1;
  return best[amount] === Infinity ? -1 : best[amount];
}
