// Treats equal neighbours as out of order.
function isSorted(nums) {
  for (let i = 1; i < nums.length; i++) if (nums[i] <= nums[i - 1]) return false;
  return true;
}
