// A binary heap over a typed array; `before(a, b)` puts a above b.
function makeHeap(capacity, before) {
  const items = new Float64Array(capacity);
  let size = 0;
  return {
    get size() {
      return size;
    },
    top: () => items[0],
    push(x) {
      let i = size++;
      items[i] = x;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (!before(items[i], items[p])) break;
        [items[i], items[p]] = [items[p], items[i]];
        i = p;
      }
    },
    pop() {
      const top = items[0];
      items[0] = items[--size];
      for (let i = 0; ; ) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < size && before(items[l], items[m])) m = l;
        if (r < size && before(items[r], items[m])) m = r;
        if (m === i) break;
        [items[i], items[m]] = [items[m], items[i]];
        i = m;
      }
      return top;
    },
  };
}

function runningMedians(nums) {
  const lower = makeHeap(nums.length, (a, b) => a > b); // max-heap
  const upper = makeHeap(nums.length, (a, b) => a < b); // min-heap
  return nums.map((x) => {
    if (lower.size === 0 || x <= lower.top()) lower.push(x);
    else upper.push(x);
    if (lower.size > upper.size + 1) upper.push(lower.pop());
    else if (upper.size > lower.size) lower.push(upper.pop());
    return lower.top();
  });
}
