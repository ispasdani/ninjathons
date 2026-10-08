// Correct but tries every popping order (n!): must time out on anything but
// a handful of balloons.
function maxCoins(balloons) {
  const best = (row) => {
    let most = 0;
    for (let i = 0; i < row.length; i++) {
      const gain = (row[i - 1] ?? 1) * row[i] * (row[i + 1] ?? 1);
      const rest = best([...row.slice(0, i), ...row.slice(i + 1)]);
      if (gain + rest > most) most = gain + rest;
    }
    return most;
  };
  return best(balloons);
}
