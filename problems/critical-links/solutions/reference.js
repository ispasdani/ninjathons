function criticalLinks(n, links) {
  const m = links.length;
  // Adjacency as linked lists of arcs; arc 2i and 2i + 1 are link i's two directions.
  const head = new Int32Array(n).fill(-1);
  const nextArc = new Int32Array(2 * m);
  const arcTo = new Int32Array(2 * m);
  links.forEach(([a, b], id) => {
    arcTo[2 * id] = b;
    nextArc[2 * id] = head[a];
    head[a] = 2 * id;
    arcTo[2 * id + 1] = a;
    nextArc[2 * id + 1] = head[b];
    head[b] = 2 * id + 1;
  });
  const time = new Int32Array(n).fill(-1);
  const low = new Int32Array(n);
  const viaArc = new Int32Array(n).fill(-1);
  const cursor = new Int32Array(n);
  const stack = new Int32Array(n);
  const result = [];
  let clock = 0;
  for (let root = 0; root < n; root++) {
    if (time[root] !== -1) continue;
    let top = 0;
    stack[0] = root;
    time[root] = low[root] = clock++;
    cursor[root] = head[root];
    while (top >= 0) {
      const u = stack[top];
      const arc = cursor[u];
      if (arc !== -1) {
        cursor[u] = nextArc[arc];
        if ((arc ^ 1) === viaArc[u]) continue; // the link we came in by
        const v = arcTo[arc];
        if (time[v] === -1) {
          time[v] = low[v] = clock++;
          viaArc[v] = arc;
          cursor[v] = head[v];
          stack[++top] = v;
        } else if (time[v] < low[u]) {
          low[u] = time[v];
        }
      } else {
        top--;
        if (top >= 0) {
          const parent = stack[top];
          if (low[u] < low[parent]) low[parent] = low[u];
          if (low[u] > time[parent]) result.push(parent < u ? [parent, u] : [u, parent]);
        }
      }
    }
  }
  return result;
}
