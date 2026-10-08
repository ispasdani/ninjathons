// Stops one pair early, so a list that's out of order only at the end passes.
function isSorted(nums) {
  for (let i = 1; i < nums.length - 1; i++) if (nums[i] < nums[i - 1]) return false;
  return true;
}
