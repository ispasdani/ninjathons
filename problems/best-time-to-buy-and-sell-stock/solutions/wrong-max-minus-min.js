// Ignores the order of the days: may "sell" before buying.
function maxProfit(prices) {
  return Math.max(...prices) - Math.min(...prices);
}
