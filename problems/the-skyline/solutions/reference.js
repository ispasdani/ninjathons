function skyline(buildings) {
  const byLeft = [...buildings].sort((a, b) => a[0] - b[0]);
  const xs = [...new Set(buildings.flatMap(([l, r]) => [l, r]))].sort((a, b) => a - b);
  // A binary max-heap of [height, right].
  const heap = [];
  const push = (item) => {
    heap.push(item);
    for (let i = heap.length - 1; i > 0; ) {
      const p = (i - 1) >> 1;
      if (heap[p][0] >= heap[i][0]) break;
      [heap[p], heap[i]] = [heap[i], heap[p]];
      i = p;
    }
  };
  const pop = () => {
    const last = heap.pop();
    if (!heap.length) return;
    heap[0] = last;
    for (let i = 0; ; ) {
      const l = 2 * i + 1;
      const r = l + 1;
      let m = i;
      if (l < heap.length && heap[l][0] > heap[m][0]) m = l;
      if (r < heap.length && heap[r][0] > heap[m][0]) m = r;
      if (m === i) break;
      [heap[m], heap[i]] = [heap[i], heap[m]];
      i = m;
    }
  };
  const result = [];
  let last = 0;
  let next = 0;
  for (const x of xs) {
    while (next < byLeft.length && byLeft[next][0] <= x) {
      push([byLeft[next][2], byLeft[next][1]]);
      next++;
    }
    while (heap.length && heap[0][1] <= x) pop();
    const h = heap.length ? heap[0][0] : 0;
    if (h !== last) {
      result.push([x, h]);
      last = h;
    }
  }
  return result;
}
