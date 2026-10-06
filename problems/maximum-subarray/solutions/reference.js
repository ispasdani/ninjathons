function maxSubArray(nums) {
  let best = nums[0];
  let current = 0;
  for (const x of nums) {
    current = Math.max(x, current + x);
    best = Math.max(best, current);
  }
  return best;
}
