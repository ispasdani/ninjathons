// Skips every link back to the parent server instead of only the one it came
// by, so a repeated link still looks critical.
function criticalLinks(n, links) {
  const adj = Array.from({ length: n }, () => []);
  for (const [a, b] of links) {
    adj[a].push(b);
    adj[b].push(a);
  }
  const time = new Int32Array(n).fill(-1);
  const low = new Int32Array(n);
  const parentOf = new Int32Array(n).fill(-1);
  const pos = new Int32Array(n);
  const result = [];
  let clock = 0;
  for (let root = 0; root < n; root++) {
    if (time[root] !== -1) continue;
    const stack = [root];
    time[root] = low[root] = clock++;
    while (stack.length) {
      const u = stack[stack.length - 1];
      if (pos[u] < adj[u].length) {
        const v = adj[u][pos[u]++];
        if (v === parentOf[u]) continue;
        if (time[v] === -1) {
          time[v] = low[v] = clock++;
          parentOf[v] = u;
          stack.push(v);
        } else if (time[v] < low[u]) {
          low[u] = time[v];
        }
      } else {
        stack.pop();
        if (stack.length) {
          const p = stack[stack.length - 1];
          low[p] = Math.min(low[p], low[u]);
          if (low[u] > time[p]) result.push(p < u ? [p, u] : [u, p]);
        }
      }
    }
  }
  return result;
}
