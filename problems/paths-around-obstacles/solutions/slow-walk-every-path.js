// Correct but walks every path one by one (exponential): must time out on
// anything but small grids.
function countPaths(grid) {
  const MOD = 1_000_000_007;
  const rows = grid.length;
  const cols = grid[0].length;
  const walk = (r, c) => {
    if (r >= rows || c >= cols || grid[r][c] === "#") return 0;
    if (r === rows - 1 && c === cols - 1) return 1;
    return (walk(r + 1, c) + walk(r, c + 1)) % MOD;
  };
  return walk(0, 0);
}
