class MinHeap {
  constructor(less) {
    this.items = [];
    this.less = less;
  }
  get size() {
    return this.items.length;
  }
  push(x) {
    const a = this.items;
    a.push(x);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop() {
    const a = this.items;
    const top = a[0];
    const last = a.pop();
    if (a.length > 0) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && this.less(a[l], a[m])) m = l;
        if (r < a.length && this.less(a[r], a[m])) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

function lowestCost(grid) {
  const rows = grid.length;
  const cols = grid[0].length;
  const best = new Array(rows * cols).fill(Infinity);
  best[0] = grid[0][0];
  const queue = new MinHeap((a, b) => a[0] < b[0]);
  queue.push([best[0], 0]);
  while (queue.size) {
    const [cost, cell] = queue.pop();
    if (cost > best[cell]) continue;
    const r = Math.floor(cell / cols);
    const c = cell % cols;
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;
      const next = nr * cols + nc;
      const through = cost + grid[nr][nc];
      if (through < best[next]) {
        best[next] = through;
        queue.push([through, next]);
      }
    }
  }
  return best[rows * cols - 1];
}
