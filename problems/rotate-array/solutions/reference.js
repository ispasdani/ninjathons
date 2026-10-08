function rotate(nums, k) {
  const n = nums.length;
  const out = new Array(n);
  for (let i = 0; i < n; i++) out[(i + k) % n] = nums[i];
  return out;
}
