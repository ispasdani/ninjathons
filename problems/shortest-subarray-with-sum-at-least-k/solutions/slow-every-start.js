// Correct but O(n^2): must time out on the large tests.
function shortestSubarray(nums, k) {
  let best = Infinity;
  for (let i = 0; i < nums.length; i++) {
    let sum = 0;
    for (let j = i; j < nums.length && j - i + 1 < best; j++) {
      sum += nums[j];
      if (sum >= k) best = j - i + 1;
    }
  }
  return best === Infinity ? -1 : best;
}
