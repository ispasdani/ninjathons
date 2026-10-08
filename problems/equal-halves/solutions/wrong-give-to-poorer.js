// Hands out the items from largest to smallest, each to whoever has less.
function canSplit(nums) {
  let a = 0;
  let b = 0;
  for (const x of [...nums].sort((p, q) => q - p)) {
    if (a <= b) a += x;
    else b += x;
  }
  return a === b;
}
