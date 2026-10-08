// Starts the loop at 1, so the first number is never looked at.
function countEvens(nums) {
  let count = 0;
  for (let i = 1; i < nums.length; i++) if (nums[i] % 2 === 0) count++;
  return count;
}
