// Breadth-first by number of links: keeps the first arrival, not the fastest.
function signalTime(n, links, source) {
  const out = Array.from({ length: n }, () => []);
  for (const [from, to, ms] of links) out[from].push([to, ms]);
  const time = new Array(n).fill(-1);
  time[source] = 0;
  const queue = [source];
  for (let head = 0; head < queue.length; head++) {
    const u = queue[head];
    for (const [v, ms] of out[u]) {
      if (time[v] === -1) {
        time[v] = time[u] + ms;
        queue.push(v);
      }
    }
  }
  return time.includes(-1) ? -1 : Math.max(...time);
}
