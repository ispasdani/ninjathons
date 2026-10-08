Adding up a range of an array, `nums[left]` to `nums[right]`, takes a loop. Asking it a hundred thousand times takes a hundred thousand loops. A **prefix sum** array answers every range question in O(1), after one O(n) pass.

## Build it once

`prefix[i]` is the sum of the first `i` items. It has one more entry than `nums`, starting with `prefix[0] = 0`:

```javascript
const prefix = [0];
for (const x of nums) prefix.push(prefix[prefix.length - 1] + x);
```

```python
prefix = [0]
for x in nums:
    prefix.append(prefix[-1] + x)
```

For `nums = [3, 1, 4, 1, 5]`, `prefix = [0, 3, 4, 8, 9, 14]`.

## Any range is one subtraction

The sum from `left` to `right`, both included, is everything up to `right` minus everything before `left`:

```text
sum(left..right) = prefix[right + 1] - prefix[left]
```

`sum(1..3)` = `prefix[4] - prefix[1]` = 9 − 3 = 6, which is 1 + 4 + 1. The extra 0 at the front means `left = 0` needs no special case.

Watch the sizes: the sum of 100,000 values can pass 2³¹. Python doesn't mind; JavaScript is exact up to 2⁵³; in Java, C# and C++ use 64-bit integers.

## Products from both sides

The same idea works with any running total, and from either end. *Product of Array Except Self* asks, for each position, the product of everything else, without dividing. That's the product of everything to its **left** times the product of everything to its **right**: two running products, one pass from the front and one from the back. You can keep the first in the answer array itself and multiply the second in on the way back, so the only extra memory is one variable.

## Counting ranges with a hash map

*How many subarrays add up to exactly k?* There are O(n²) subarrays. But a subarray from `left` to `right` sums to `k` exactly when `prefix[right + 1] - prefix[left] = k`, that is, when an **earlier** prefix sum equals the current one minus `k`. So walk once and remember the prefix sums seen so far. Here's the yes-or-no version, *does any subarray sum to k?*, with a set:

```javascript
function hasSubarraySum(nums, k) {
  const seen = new Set([0]); // the empty prefix
  let current = 0;
  for (const x of nums) {
    current += x;
    if (seen.has(current - k)) return true;
    seen.add(current);
  }
  return false;
}
```

```python
def has_subarray_sum(nums, k):
    seen = {0}  # the empty prefix
    current = 0
    for x in nums:
        current += x
        if current - k in seen:
            return True
        seen.add(current)
    return False
```

To **count** them instead, swap the set for a map from each prefix sum to how many times it has appeared, and add that count at each step.

This works with negative numbers too, where a sliding window wouldn't: with negatives, growing a window doesn't always make its sum bigger.

## Updating many ranges: difference arrays

The reverse question is "add `v` to every item from `left` to `right`", many times, then read the result. Record only the edges: `diff[left] += v` and `diff[right + 1] -= v`. A single prefix sum over `diff` at the end gives every item's total. That's the idea behind the *Flight Bookings* problem in the library.
