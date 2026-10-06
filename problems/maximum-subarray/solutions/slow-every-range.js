// Correct but O(n^2): must time out on the large tests.
function maxSubArray(nums) {
  let best = -Infinity;
  for (let i = 0; i < nums.length; i++) {
    let sum = 0;
    for (let j = i; j < nums.length; j++) best = Math.max(best, (sum += nums[j]));
  }
  return best;
}
