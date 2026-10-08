// Correct but counts up to each root: must time out on the large tests.
function integerSqrt(xs) {
  return xs.map((x) => {
    let r = 0;
    while ((r + 1) * (r + 1) <= x) r++;
    return r;
  });
}
