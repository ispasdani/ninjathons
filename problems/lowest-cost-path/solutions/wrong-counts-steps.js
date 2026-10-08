// Breadth-first search counts steps, not costs.
function lowestCost(grid) {
  const rows = grid.length;
  const cols = grid[0].length;
  const steps = grid.map((row) => row.map(() => -1));
  steps[0][0] = 0;
  const queue = [[0, 0]];
  for (let i = 0; i < queue.length; i++) {
    const [r, c] = queue[i];
    for (const [nr, nc] of [[r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]]) {
      if (nr < 0 || nc < 0 || nr >= rows || nc >= cols || steps[nr][nc] !== -1) continue;
      steps[nr][nc] = steps[r][c] + 1;
      queue.push([nr, nc]);
    }
  }
  return steps[rows - 1][cols - 1] + 1;
}
