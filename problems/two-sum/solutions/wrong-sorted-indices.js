// Two pointers on a sorted copy, but returns positions in the sorted copy.
function twoSum(nums, target) {
  const sorted = [...nums].sort((a, b) => a - b);
  let lo = 0;
  let hi = sorted.length - 1;
  while (lo < hi) {
    const sum = sorted[lo] + sorted[hi];
    if (sum === target) return [lo, hi];
    if (sum < target) lo++;
    else hi--;
  }
  return [];
}
