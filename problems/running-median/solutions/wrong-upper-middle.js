// Keeps the extra number in the upper half, so with an even count it reports
// the larger middle value.
function runningMedians(nums) {
  const sorted = [];
  return nums.map((x) => {
    let lo = 0;
    let hi = sorted.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (sorted[mid] < x) lo = mid + 1;
      else hi = mid;
    }
    sorted.splice(lo, 0, x);
    return sorted[sorted.length >> 1];
  });
}
