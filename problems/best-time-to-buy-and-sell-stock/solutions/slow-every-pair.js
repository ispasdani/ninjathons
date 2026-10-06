// Correct but O(n^2): must time out on the large tests.
function maxProfit(prices) {
  let best = 0;
  for (let i = 0; i < prices.length; i++)
    for (let j = i + 1; j < prices.length; j++) best = Math.max(best, prices[j] - prices[i]);
  return best;
}
