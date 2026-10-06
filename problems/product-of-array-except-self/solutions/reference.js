function productExceptSelf(nums) {
  const n = nums.length;
  const answer = new Array(n).fill(1);
  let left = 1;
  for (let i = 0; i < n; i++) {
    answer[i] = left;
    left *= nums[i];
  }
  let right = 1;
  for (let i = n - 1; i >= 0; i--) {
    answer[i] *= right;
    right *= nums[i];
  }
  return answer.map((x) => x + 0); // turns -0 into 0
}
