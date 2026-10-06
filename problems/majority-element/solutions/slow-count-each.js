// Correct but O(n^2) when the majority value comes late: must time out.
function majorityElement(nums) {
  for (const x of nums) {
    let count = 0;
    for (const y of nums) if (y === x) count++;
    if (count > nums.length / 2) return x;
  }
}
