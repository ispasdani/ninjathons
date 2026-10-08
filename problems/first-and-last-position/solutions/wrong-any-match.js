// A plain binary search finds *a* match, then returns it as both ends.
function searchRange(nums, target) {
  let lo = 0;
  let hi = nums.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (nums[mid] === target) return [mid, mid];
    if (nums[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return [-1, -1];
}
