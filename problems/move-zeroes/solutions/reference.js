function moveZeroes(nums) {
  let w = 0;
  for (const x of nums) if (x !== 0) nums[w++] = x;
  while (w < nums.length) nums[w++] = 0;
  return nums;
}
