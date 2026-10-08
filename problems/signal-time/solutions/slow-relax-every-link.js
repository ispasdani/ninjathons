// Correct but relaxes every link round after round (Bellman-Ford): must time
// out on a long chain.
function signalTime(n, links, source) {
  const time = new Float64Array(n).fill(Infinity);
  time[source] = 0;
  for (let round = 0; round < n; round++) {
    let changed = false;
    for (const [from, to, ms] of links) {
      if (time[from] + ms < time[to]) {
        time[to] = time[from] + ms;
        changed = true;
      }
    }
    if (!changed) break;
  }
  let worst = 0;
  for (const t of time) worst = Math.max(worst, t);
  return worst === Infinity ? -1 : worst;
}
