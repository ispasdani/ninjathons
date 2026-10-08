// Kadane with products keeps only the largest, so a negative times a negative is lost.
function maxProduct(nums) {
  let here = nums[0];
  let best = nums[0];
  for (let i = 1; i < nums.length; i++) {
    here = Math.max(nums[i], here * nums[i]);
    best = Math.max(best, here);
  }
  return best;
}
