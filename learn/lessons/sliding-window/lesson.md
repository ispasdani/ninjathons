A sliding window is a run of consecutive items, from `left` to `right`, that moves across an array or string. Instead of recomputing everything for each possible run (O(n²) runs, or worse), you update the window by one item as it moves: one item comes in on the right, maybe some leave on the left.

## Fixed size: add one, remove one

For a window of exactly `k` items, keep its sum (or count, or whatever you need) and adjust it as it slides:

```javascript
function maxSumOfK(nums, k) {
  let sum = 0;
  for (let i = 0; i < k; i++) sum += nums[i];
  let best = sum;
  for (let right = k; right < nums.length; right++) {
    sum += nums[right] - nums[right - k]; // one in, one out
    best = Math.max(best, sum);
  }
  return best;
}
```

```python
def max_sum_of_k(nums, k):
    window = sum(nums[:k])
    best = window
    for right in range(k, len(nums)):
        window += nums[right] - nums[right - k]  # one in, one out
        best = max(best, window)
    return best
```

## Variable size: grow, then shrink

When the window must satisfy a rule, grow it on the right one item at a time, and while the rule is broken, shrink it from the left. Each item enters once and leaves at most once, so the whole walk is O(n), even though there's a loop inside a loop.

The shortest run of positive numbers that adds up to at least `target`:

```javascript
function shortestAtLeast(nums, target) {
  let left = 0;
  let sum = 0;
  let best = Infinity;
  for (let right = 0; right < nums.length; right++) {
    sum += nums[right]; // grow
    while (sum >= target) {
      // the rule holds: record, then shrink
      best = Math.min(best, right - left + 1);
      sum -= nums[left++];
    }
  }
  return best === Infinity ? 0 : best;
}
```

```python
def shortest_at_least(nums, target):
    left = window = 0
    best = float("inf")
    for right, x in enumerate(nums):
        window += x  # grow
        while window >= target:  # the rule holds: record, then shrink
            best = min(best, right - left + 1)
            window -= nums[left]
            left += 1
    return 0 if best == float("inf") else best
```

For the longest run with no repeated character, the rule is "no character twice". Keep a map of where each character was last seen: when the new character was last seen *inside* the window, the left edge jumps just past that earlier copy. A character seen before the window started isn't a repeat.

## The maximum of every window

Sums are easy to update: add and subtract. A maximum isn't: when the largest item leaves the window, what's the new largest? Re-scanning the window costs O(k) per step.

The trick is a **deque** (a queue you can add to and remove from at both ends) of positions whose values are in decreasing order:

- Before adding a new item on the right, remove from the back every position whose value is **smaller or equal**. Those items can never be a window's maximum again: the new item is bigger and will stay in the window longer.
- Remove the front if it has slid out of the window on the left.
- The front of the deque is the current maximum.

Each position is added once and removed at most once, so the whole walk is O(n). Python has `collections.deque`.

In JavaScript, an array with a moving `head` index works as a deque: `push` and `pop` at the back, and advance `head` instead of calling `shift()`, which is O(n).

## When to reach for it

The problem asks about **contiguous** runs (a *substring* or *subarray*, not a subsequence), and the thing you're measuring can be updated when one item enters or leaves: a sum, a count, the set of characters inside.
