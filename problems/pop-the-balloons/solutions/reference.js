function maxCoins(balloons) {
  const v = [1, ...balloons, 1];
  const n = v.length;
  // best[l * n + r]: coins from popping everything strictly between l and r.
  const best = new Int32Array(n * n);
  for (let gap = 2; gap < n; gap++) {
    for (let l = 0; l + gap < n; l++) {
      const r = l + gap;
      const ends = v[l] * v[r];
      let most = 0;
      for (let k = l + 1; k < r; k++) {
        const coins = best[l * n + k] + ends * v[k] + best[k * n + r];
        if (coins > most) most = coins;
      }
      best[l * n + r] = most;
    }
  }
  return best[n - 1];
}
