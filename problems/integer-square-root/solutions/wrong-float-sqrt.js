// A floating-point root: rounds up just below large squares.
function integerSqrt(xs) {
  return xs.map((x) => Math.floor(Math.sqrt(x)));
}
