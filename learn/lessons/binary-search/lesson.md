Looking for a word in a dictionary, you don't start at page one. You open it in the middle, see whether your word comes before or after, and throw away the half it can't be in. Each look halves what's left, so a million pages take about 20 looks. That's binary search: O(log n) instead of O(n), on anything **sorted**.

## The search

Keep a range `[lo, hi]` where the answer might be. Look at the middle; it either is the answer, or tells you which half to keep:

```javascript
function indexOf(sorted, target) {
  let lo = 0;
  let hi = sorted.length - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (sorted[mid] === target) return mid;
    if (sorted[mid] < target) lo = mid + 1; // the answer is to the right
    else hi = mid - 1;                       // the answer is to the left
  }
  return -1;
}
```

```python
def index_of(sorted_nums, target):
    lo, hi = 0, len(sorted_nums) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if sorted_nums[mid] == target:
            return mid
        if sorted_nums[mid] < target:
            lo = mid + 1  # the answer is to the right
        else:
            hi = mid - 1  # the answer is to the left
    return -1
```

Binary search is famous for off-by-one bugs: `lo < hi` versus `lo <= hi`, `hi = mid` versus `hi = mid - 1`. The cure is to decide exactly what your range means and keep that true every time round. Above, the answer, if it exists, is always somewhere in `lo..hi` inclusive; the loop ends when that range is empty.

## Searching for a boundary

Often the question isn't "where is x?" but "where does the array **change**?": the first value that's at least x, the first day over budget. Picture the array as a row of answers to a yes/no question, all *no* and then all *yes*, and search for the first *yes*:

```python
def first_at_least(sorted_nums, x):
    lo, hi = 0, len(sorted_nums)  # the answer is in lo..hi; hi means "none"
    while lo < hi:
        mid = (lo + hi) // 2
        if sorted_nums[mid] >= x:
            hi = mid          # mid might be the first yes: keep it
        else:
            lo = mid + 1      # mid is a no: the first yes is after it
    return lo
```

This version, called *lower bound*, is the most useful form to memorise. It never misses, handles repeated values and returns `len(nums)` when nothing qualifies. The first *greater than* is the same with `>` in the test. With repeated values, the first position of `x` is the lower bound of `x`, and the last is one before the first value greater than `x`.

Python ships both as `bisect.bisect_left` and `bisect.bisect_right`. JavaScript has no built-in binary search.

## Many queries

Binary search shines when the same sorted data is asked many questions. A hundred thousand lookups in a hundred thousand items is 10 billion steps with a linear scan, and under 2 million with binary search. If the data starts unsorted, sorting it once (O(n log n)) and then searching is still far cheaper.

## Numbers, not just arrays

The thing you search doesn't have to be an array. To find the integer square root of `x`, the largest `r` with `r × r <= x`, search `r` between 0 and `x`: the question "is r × r ≤ x?" is *yes* up to the answer and *no* after it. Floating-point `Math.sqrt` can be off by one for very large `x`, which is exactly where a binary search on integers is exact. The next tutorial takes this idea much further.
