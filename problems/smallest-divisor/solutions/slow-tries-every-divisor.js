// Tries d = 1, 2, 3, … : up to a million passes over the list.
function smallestDivisor(nums, threshold) {
  for (let d = 1; ; d++) {
    let sum = 0;
    for (const x of nums) sum += Math.ceil(x / d);
    if (sum <= threshold) return d;
  }
}
