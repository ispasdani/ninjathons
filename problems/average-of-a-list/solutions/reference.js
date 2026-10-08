function average(nums) {
  if (nums.length === 0) return 0;
  let sum = 0;
  for (const x of nums) sum += x;
  return sum / nums.length;
}
