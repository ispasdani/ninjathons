// Correct but O(n * k): must time out with large windows.
function maxSlidingWindow(nums, k) {
  const out = [];
  for (let i = 0; i + k <= nums.length; i++) {
    let best = -Infinity;
    for (let j = i; j < i + k; j++) best = Math.max(best, nums[j]);
    out.push(best);
  }
  return out;
}
