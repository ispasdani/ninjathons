// Correct but O(n^2): must time out on the large tests.
function productExceptSelf(nums) {
  return nums.map((_, i) => {
    let p = 1;
    for (let j = 0; j < nums.length; j++) if (j !== i) p *= nums[j];
    return p + 0;
  });
}
