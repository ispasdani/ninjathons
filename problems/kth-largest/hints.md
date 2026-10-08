## Hint

Finding and removing the largest value `k` times is O(n × k): too slow when `k` is near 100,000.

## Hint

Sorting works in O(n log n). Can you do it while only ever keeping `k` values around?

## Hint

Keep a min-heap of the `k` largest values seen so far. For each new value, push it, and if the heap holds more than `k`, pop the smallest. At the end, the top of the heap is the answer. Don't drop repeated values.
