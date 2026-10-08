// A sliding window: right only when every value is positive.
function subarraySum(nums, k) {
  let left = 0;
  let sum = 0;
  let count = 0;
  for (let right = 0; right < nums.length; right++) {
    sum += nums[right];
    while (sum > k && left < right) sum -= nums[left++];
    if (sum === k) count++;
  }
  return count;
}
