// Divides the total product, which breaks when there is a zero.
function productExceptSelf(nums) {
  const total = nums.reduce((a, b) => a * b, 1);
  return nums.map((x) => total / x);
}
