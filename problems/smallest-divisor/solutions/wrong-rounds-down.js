// Rounds the divisions down, so it settles on a divisor that's too small.
function smallestDivisor(nums, threshold) {
  let lo = 1;
  let hi = Math.max(...nums);
  while (lo < hi) {
    const d = Math.floor((lo + hi) / 2);
    let sum = 0;
    for (const x of nums) sum += Math.floor(x / d);
    if (sum <= threshold) hi = d;
    else lo = d + 1;
  }
  return lo;
}
