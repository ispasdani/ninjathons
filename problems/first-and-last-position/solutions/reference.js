function searchRange(nums, target) {
  // The first index whose value is at least (or, with after, greater than) target.
  function firstAtLeast(value, after) {
    let lo = 0;
    let hi = nums.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (nums[mid] < value || (after && nums[mid] === value)) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }
  const first = firstAtLeast(target, false);
  if (first === nums.length || nums[first] !== target) return [-1, -1];
  return [first, firstAtLeast(target, true) - 1];
}
