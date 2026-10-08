// Correct but lists all n^2 / 2 distances: must time out on the large tests.
function kthSmallestDistance(nums, k) {
  const counts = new Uint32Array(1000001);
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) counts[Math.abs(nums[i] - nums[j])]++;
  }
  let seen = 0;
  for (let d = 0; ; d++) {
    seen += counts[d];
    if (seen >= k) return d;
  }
}
