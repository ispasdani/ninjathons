function canSplit(nums) {
  const total = nums.reduce((a, b) => a + b, 0);
  if (total % 2) return false;
  const half = total / 2;
  const reachable = new Uint8Array(half + 1);
  reachable[0] = 1;
  for (const x of nums) {
    for (let s = half; s >= x; s--) if (reachable[s - x]) reachable[s] = 1;
  }
  return reachable[half] === 1;
}
