function integerSqrt(xs) {
  return xs.map((x) => {
    // Exact: every mid * mid here stays below 2^53.
    let lo = 0;
    let hi = Math.min(x, 94906265);
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (mid * mid <= x) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  });
}
