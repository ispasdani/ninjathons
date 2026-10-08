// Always pops the smallest balloon left.
function maxCoins(balloons) {
  const row = [...balloons];
  let coins = 0;
  while (row.length) {
    let at = 0;
    for (let i = 1; i < row.length; i++) if (row[i] < row[at]) at = i;
    coins += (row[at - 1] ?? 1) * row[at] * (row[at + 1] ?? 1);
    row.splice(at, 1);
  }
  return coins;
}
