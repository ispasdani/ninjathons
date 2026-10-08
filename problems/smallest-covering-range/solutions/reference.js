function smallestRange(lists) {
  // A binary min-heap of [value, list, index in list].
  const heap = [];
  const less = (a, b) => a[0] < b[0];
  const push = (item) => {
    heap.push(item);
    for (let i = heap.length - 1; i > 0; ) {
      const p = (i - 1) >> 1;
      if (!less(heap[i], heap[p])) break;
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
        if (l < heap.length && less(heap[l], heap[m])) m = l;
        if (r < heap.length && less(heap[r], heap[m])) m = r;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i], heap[m]];
        i = m;
      }
    }
    return top;
  };
  let largest = -Infinity;
  lists.forEach((list, i) => {
    push([list[0], i, 0]);
    largest = Math.max(largest, list[0]);
  });
  let best = [heap[0][0], largest];
  for (;;) {
    const [value, i, j] = pop();
    if (largest - value < best[1] - best[0]) best = [value, largest];
    if (j + 1 === lists[i].length) return best;
    const next = lists[i][j + 1];
    push([next, i, j + 1]);
    largest = Math.max(largest, next);
  }
}
