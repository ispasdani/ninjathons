function secondLargest(nums) {
  let best = -1;
  let second = -1;
  for (const x of nums) {
    if (x > best) {
      second = best;
      best = x;
    } else if (x < best && x > second) {
      second = x;
    }
  }
  return second;
}
