function countPaths(grid) {
  const MOD = 1_000_000_007;
  const cols = grid[0].length;
  const ways = new Int32Array(cols);
  ways[0] = grid[0][0] === "." ? 1 : 0;
  for (const row of grid) {
    for (let c = 0; c < cols; c++) {
      if (row[c] === "#") ways[c] = 0;
      else if (c > 0) ways[c] = (ways[c] + ways[c - 1]) % MOD;
    }
  }
  return ways[cols - 1];
}
