// Treats right as exclusive, so it leaves out nums[right].
function rangeSums(nums, queries) {
  const prefix = new Array(nums.length + 1).fill(0);
  for (let i = 0; i < nums.length; i++) prefix[i + 1] = prefix[i] + nums[i];
  return queries.map(([left, right]) => prefix[right] - prefix[left]);
}
