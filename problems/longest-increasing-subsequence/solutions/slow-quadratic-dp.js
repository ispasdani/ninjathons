// The classic O(n^2) dynamic programming: correct, but must time out here.
function lengthOfLIS(nums) {
  const len = new Array(nums.length).fill(1);
  let best = 1;
  for (let i = 0; i < nums.length; i++) {
    for (let j = 0; j < i; j++) if (nums[j] < nums[i] && len[j] + 1 > len[i]) len[i] = len[j] + 1;
    best = Math.max(best, len[i]);
  }
  return best;
}
