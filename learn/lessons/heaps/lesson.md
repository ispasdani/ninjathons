A heap, also called a **priority queue**, is a collection that always hands you its smallest item (or its largest) in O(log n), however items come and go. It's the tool for "repeatedly take the best one", "keep the top k", and anything that processes events in order of time or cost.

## What a heap does

| Operation | Cost |
|---|---|
| add an item | O(log n) |
| look at the smallest | O(1) |
| remove the smallest | O(log n) |
| build from a list of n items | O(n) |

Compare a sorted list: looking is O(1), but adding keeps it sorted at O(n) a time. A heap is only *partly* ordered (every parent is smaller than its children) and that's just enough to always know the smallest, at a fraction of the cost.

## Heaps in Python

`heapq` turns a plain list into a min-heap:

```python
import heapq

heap = []
heapq.heappush(heap, 5)
heapq.heappush(heap, 1)
heapq.heappush(heap, 3)
heap[0]               # 1, the smallest
heapq.heappop(heap)   # 1
heapq.heapify(items)  # turn an existing list into a heap, O(n)
```

There's no max-heap: push **negated** values, and negate again when you take them out. Tuples compare item by item, so `(cost, name)` pairs come out by cost first.

## Heaps in JavaScript

JavaScript has no built-in heap, so write one. It's a short class over an array, where the item at position `i` has children at `2i + 1` and `2i + 2`:

```javascript
class MinHeap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  peek() { return this.a[0]; }
  push(x) {
    const a = this.a;
    a.push(x);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;          // parent
      if (a[p] <= a[i]) break;
      [a[p], a[i]] = [a[i], a[p]];     // move up
      i = p;
    }
  }
  pop() {
    const a = this.a;
    const top = a[0];
    const last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && a[l] < a[m]) m = l;
        if (r < a.length && a[r] < a[m]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];   // move down
        i = m;
      }
    }
    return top;
  }
}
```

For a max-heap, flip the two comparisons, or push negated numbers. To order objects or pairs, compare a field instead of the values themselves.

## Keep the top k

To find the k largest of a million numbers, don't sort them all. Keep a **min**-heap of the best k so far: when a new number beats the smallest of them (the heap's top), swap it in. The heap never grows past k, so this is O(n log k):

```python
import heapq

def top_k(nums, k):
    heap = []
    for x in nums:
        if len(heap) < k:
            heapq.heappush(heap, x)
        elif x > heap[0]:
            heapq.heapreplace(heap, x)  # pop the smallest, push x
    return sorted(heap, reverse=True)
```

The top of that heap is, at the end, the k-th largest.

## Repeatedly take the best

Simulations like "take the two heaviest, combine them, put the result back" need the largest item again and again while the collection changes. Sorting after every change costs O(n log n) per step; a heap does each step in O(log n).

## Two heaps for the middle

A median splits the data in two halves. Keep the lower half in a **max**-heap and the upper half in a **min**-heap, balanced so they differ in size by at most one. The middle is at the top of one heap or the other, readable in O(1), and each new number costs O(log n) to place and rebalance.

## When to reach for it

You keep needing the smallest or largest of a **changing** collection: scheduling by time, cheapest-first search (Dijkstra, in the Graphs module), merging sorted lists, keeping the top k.
