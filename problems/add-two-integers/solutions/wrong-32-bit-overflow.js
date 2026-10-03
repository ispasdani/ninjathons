// Wraps around like a 32-bit int: fails when the sum doesn't fit.
function add(a, b) {
  return (a + b) | 0;
}
