function subarraySum(nums, k) {
  const seen = new Map([[0, 1]]);
  let sum = 0;
  let count = 0;
  for (const x of nums) {
    sum += x;
    count += seen.get(sum - k) ?? 0;
    seen.set(sum, (seen.get(sum) ?? 0) + 1);
  }
  return count;
}
