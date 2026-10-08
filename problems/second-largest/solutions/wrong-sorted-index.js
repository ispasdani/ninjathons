// Sorts and takes the one before last, which is the maximum again when it appears twice.
function secondLargest(nums) {
  if (nums.length < 2) return -1;
  const sorted = [...nums].sort((a, b) => a - b);
  return sorted[sorted.length - 2];
}
