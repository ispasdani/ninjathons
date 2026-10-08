// Dynamic programming over right and down moves misses paths that go up or left.
function lowestCost(grid) {
  const rows = grid.length;
  const cols = grid[0].length;
  const best = grid.map((row) => row.map(() => Infinity));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (r === 0 && c === 0) best[r][c] = grid[0][0];
      else best[r][c] = grid[r][c] + Math.min(r > 0 ? best[r - 1][c] : Infinity, c > 0 ? best[r][c - 1] : Infinity);
    }
  }
  return best[rows - 1][cols - 1];
}
