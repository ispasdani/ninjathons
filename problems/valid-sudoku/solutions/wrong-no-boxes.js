// Checks rows and columns but forgets the 3 × 3 boxes.
function isValidSudoku(board) {
  const seen = new Set();
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const d = board[r][c];
      if (d === ".") continue;
      for (const key of [`r${r}:${d}`, `c${c}:${d}`]) {
        if (seen.has(key)) return false;
        seen.add(key);
      }
    }
  }
  return true;
}
