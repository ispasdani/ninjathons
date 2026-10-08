// Correct but O(n × q): must time out on the large tests.
function rangeSums(nums, queries) {
  return queries.map(([left, right]) => {
    let sum = 0;
    for (let i = left; i <= right; i++) sum += nums[i];
    return sum;
  });
}
