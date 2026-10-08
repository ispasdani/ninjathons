// Counts down from the smaller number: billions of steps for large inputs.
function greatestCommonDivisor(a, b) {
  if (a === 0) return b;
  if (b === 0) return a;
  for (let d = Math.min(a, b); d > 1; d--) if (a % d === 0 && b % d === 0) return d;
  return 1;
}
