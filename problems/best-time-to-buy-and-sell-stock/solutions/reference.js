function maxProfit(prices) {
  let lowest = Infinity;
  let best = 0;
  for (const p of prices) {
    lowest = Math.min(lowest, p);
    best = Math.max(best, p - lowest);
  }
  return best;
}
