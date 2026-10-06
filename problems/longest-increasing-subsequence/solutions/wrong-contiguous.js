// Finds the longest increasing run of neighbours, not a subsequence.
function lengthOfLIS(nums) {
  let best = 1;
  let run = 1;
  for (let i = 1; i < nums.length; i++) {
    run = nums[i] > nums[i - 1] ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return best;
}
