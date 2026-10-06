// Correct but O(n^2): must time out on the large tests.
function maxArea(height) {
  let best = 0;
  for (let i = 0; i < height.length; i++)
    for (let j = i + 1; j < height.length; j++) best = Math.max(best, Math.min(height[i], height[j]) * (j - i));
  return best;
}
