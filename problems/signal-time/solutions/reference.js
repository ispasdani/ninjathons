function signalTime(n, links, source) {
  const out = Array.from({ length: n }, () => []);
  for (const [from, to, ms] of links) out[from].push(to, ms);
  const time = new Float64Array(n).fill(Infinity);
  time[source] = 0;
  // A binary min-heap of [time, server].
  const heap = [[0, source]];
  const push = (item) => {
    heap.push(item);
    for (let i = heap.length - 1; i > 0; ) {
      const p = (i - 1) >> 1;
      if (heap[p][0] <= heap[i][0]) break;
      [heap[p], heap[i]] = [heap[i], heap[p]];
      i = p;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop();
    if (heap.length) {
      heap[0] = last;
      for (let i = 0; ; ) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i], heap[m]];
        i = m;
      }
    }
    return top;
  };
  while (heap.length) {
    const [t, u] = pop();
    if (t > time[u]) continue;
    const edges = out[u];
    for (let k = 0; k < edges.length; k += 2) {
      const v = edges[k];
      const nt = t + edges[k + 1];
      if (nt < time[v]) {
        time[v] = nt;
        push([nt, v]);
      }
    }
  }
  let worst = 0;
  for (const t of time) worst = Math.max(worst, t);
  return worst === Infinity ? -1 : worst;
}
