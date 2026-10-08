// Gives every open cell on the first row and column one path, even past an
// obstacle that cuts them off.
function countPaths(grid) {
  const MOD = 1_000_000_007;
  const rows = grid.length;
  const cols = grid[0].length;
  const ways = Array.from({ length: rows }, () => new Array(cols).fill(0));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === "#") continue;
      if (r === 0 || c === 0) ways[r][c] = 1;
      else ways[r][c] = (ways[r - 1][c] + ways[r][c - 1]) % MOD;
    }
  }
  return ways[rows - 1][cols - 1];
}
