// Correct but exponential: must time out for larger n.
function climbStairs(n) {
  return n <= 1 ? 1 : climbStairs(n - 1) + climbStairs(n - 2);
}
