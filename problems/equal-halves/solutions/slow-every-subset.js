// Correct but tries every subset (2^n): must time out when there's no split
// and the total is even.
function canSplit(nums) {
  const total = nums.reduce((a, b) => a + b, 0);
  if (total % 2) return false;
  const half = total / 2;
  const tryFrom = (i, sum) => {
    if (sum === half) return true;
    if (i === nums.length || sum > half) return false;
    return tryFrom(i + 1, sum + nums[i]) || tryFrom(i + 1, sum);
  };
  return tryFrom(0, 0);
}
