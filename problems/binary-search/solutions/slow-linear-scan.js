// Correct but O(n * q): must time out on the large tests.
function search(nums, queries) {
  return queries.map((q) => nums.indexOf(q));
}
