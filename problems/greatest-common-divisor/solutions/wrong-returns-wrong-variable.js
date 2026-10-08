// Returns b, which is always 0 when the loop ends.
function greatestCommonDivisor(a, b) {
  while (b !== 0) [a, b] = [b, a % b];
  return b;
}
