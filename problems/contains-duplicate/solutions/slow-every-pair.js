// Correct but O(n^2): must time out on the large tests.
function containsDuplicate(nums) {
  for (let i = 0; i < nums.length; i++)
    for (let j = i + 1; j < nums.length; j++) if (nums[i] === nums[j]) return true;
  return false;
}
