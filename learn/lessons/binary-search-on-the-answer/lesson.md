Some problems ask for the smallest (or largest) value that makes something possible: the slowest speed that still finishes on time, the smallest truck that delivers everything in a week. Searching for that value directly is hard. **Checking** a candidate value is often easy. Binary search connects the two.

## The shape to look for

You need a yes/no question about a candidate value `v` that is:

1. **monotonic**: once the answer is *yes* for some `v`, it's *yes* for every bigger `v` (or every smaller one), and
2. **cheap to check**: usually one pass over the input.

Then the values line up as *no, no, …, no, yes, yes, …*, and a lower-bound binary search finds the first *yes* in O(log(range)) checks.

## An example: painting fences

A row of fences has lengths `boards`. You have `k` painters; each paints a run of **neighbouring** fences, and every painter works at the same speed. What's the smallest *longest workload*, the total length the busiest painter has to paint?

The check: *can `k` painters manage if nobody paints more than `limit`?* Walk the fences, giving each to the current painter while it fits under `limit`, and start a new painter when it doesn't. Count the painters used:

```javascript
function painters(boards, limit) {
  let count = 1;
  let load = 0;
  for (const b of boards) {
    if (load + b > limit) {
      count++;
      load = 0;
    }
    load += b;
  }
  return count;
}

function smallestLongestWorkload(boards, k) {
  let lo = Math.max(...boards); // nobody can paint less than the longest fence
  let hi = boards.reduce((a, b) => a + b, 0); // one painter does it all
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (painters(boards, mid) <= k) hi = mid; // possible: try smaller
    else lo = mid + 1;                        // impossible: need more
  }
  return lo;
}
```

```python
def painters(boards, limit):
    count, load = 1, 0
    for b in boards:
        if load + b > limit:
            count += 1
            load = 0
        load += b
    return count


def smallest_longest_workload(boards, k):
    lo, hi = max(boards), sum(boards)
    while lo < hi:
        mid = (lo + hi) // 2
        if painters(boards, mid) <= k:
            hi = mid  # possible: try smaller
        else:
            lo = mid + 1  # impossible: need more
    return lo
```

A bigger limit never needs more painters, so the check is monotonic. With n fences and a total length S, it costs O(n log S): about 30 passes even when S is a billion.

## Choosing the range

`lo` must be a value that could be the answer (or a safe *no*), and `hi` one that's certainly a *yes*. Think about the extremes:

- The smallest sensible value: nothing below it can work, like the longest single fence.
- The largest sensible value: always enough, like one painter doing everything.

Get these right and the loop `while lo < hi` with `hi = mid` on *yes* and `lo = mid + 1` on *no* finds the boundary without any special cases.

## Watch the arithmetic

- **Rounding up a division**: `Math.ceil(a / b)` works, but with integers `Math.floor((a + b - 1) / b)` (or `(a + b - 1) // b` in Python) avoids floating point.
- **Overflow**: sums inside the check can exceed 2³¹. Use 64-bit integers in Java, C# and C++.
- **Early exit**: stop the check as soon as it fails, such as when the count passes `k`.

The exercises are all this shape: find the yes/no question, prove to yourself it's monotonic, pick the range, and the binary search is the easy part.
