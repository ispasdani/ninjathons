function numIslands(grid) {
  const rows = grid.length;
  const cols = grid[0].length;
  const seen = new Uint8Array(rows * cols);
  let islands = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== "1" || seen[r * cols + c]) continue;
      islands++;
      const stack = [r * cols + c];
      seen[r * cols + c] = 1;
      while (stack.length) {
        const cell = stack.pop();
        const y = Math.floor(cell / cols);
        const x = cell % cols;
        for (const [ny, nx] of [[y - 1, x], [y + 1, x], [y, x - 1], [y, x + 1]]) {
          if (ny < 0 || nx < 0 || ny >= rows || nx >= cols) continue;
          const k = ny * cols + nx;
          if (grid[ny][nx] === "1" && !seen[k]) {
            seen[k] = 1;
            stack.push(k);
          }
        }
      }
    }
  }
  return islands;
}
