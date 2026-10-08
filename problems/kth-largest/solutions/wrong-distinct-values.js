// Drops repeated values, so it finds the k-th largest distinct value.
function kthLargest(nums, k) {
  const distinct = [...new Set(nums)].sort((a, b) => b - a);
  return distinct[Math.min(k, distinct.length) - 1];
}
