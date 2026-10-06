function climbStairs(n) {
  let a = 1;
  let b = 1;
  for (let i = 2; i <= n; i++) [a, b] = [b, a + b];
  return b;
}
