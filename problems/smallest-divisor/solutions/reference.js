function smallestDivisor(nums, threshold) {
  let lo = 1;
  let hi = 1;
  for (const x of nums) if (x > hi) hi = x;
  while (lo < hi) {
    const d = Math.floor((lo + hi) / 2);
    let sum = 0;
    for (const x of nums) sum += Math.floor((x + d - 1) / d);
    if (sum <= threshold) hi = d;
    else lo = d + 1;
  }
  return lo;
}
