You won't be told which technique a problem needs. Recognising it from the problem's shape is the skill. Here is a field guide for array problems: the clues in the statement, and what they usually point to.

## Clues and the patterns they suggest

| The problem says or implies… | Reach for… |
|---|---|
| Find a pair (or triple) with some sum or property | A hash map of what you've seen; or sort and use two pointers |
| The array is **sorted** | Two pointers, or binary search |
| A **contiguous** run (subarray) with a sum/length/condition | Sliding window (positive values); prefix sums with a hash map (any values) |
| Sum of any range, many times | Prefix sums |
| The **next** greater or smaller item, for every position | A monotonic stack |
| The best answer such that a check is easy | Binary search on the answer |
| For each position, something about everything to its **left** and to its **right** | Two passes: one from each end, storing running values |
| Count, group, or find duplicates | A hash map or set |
| Choose items, maximise a total, with a rule between neighbours | Dynamic programming |

## Example: "for each position, left and right"

*For each day, how much higher is the highest temperature after it than the highest before it?* For every day, you need the maximum of everything to its left and of everything to its right. Recomputing both for every day is O(n²). Two passes fix it:

```python
def spread(temps):
    n = len(temps)
    left_max = [0] * n
    right_max = [0] * n
    best = float("-inf")
    for i in range(n):            # highest strictly before i
        left_max[i] = best
        best = max(best, temps[i])
    best = float("-inf")
    for i in range(n - 1, -1, -1):  # highest strictly after i
        right_max[i] = best
        best = max(best, temps[i])
    return [right_max[i] - left_max[i] for i in range(n)]
```

Three O(n) passes and O(n) memory. Once you can see "the answer at `i` depends on the best to its left and the best to its right", this shape solves a whole family of problems, including the exercise below. There, the water above each position depends on the tallest bar on each side. Work out exactly how, by hand on the example, before coding. There's also a two-pointer version that needs no extra arrays, if you want a follow-up challenge.

## Practise recognising

When you read a new problem, before thinking about code, ask:

1. Is the input sorted, or would sorting lose nothing?
2. Is the answer about a contiguous run, or any subset?
3. Does each position's answer depend on its neighbourhood, its left, its right?
4. Would remembering something I've seen turn a search into a lookup?

Say your answers out loud in an interview. Even when you're unsure which pattern fits, ruling patterns out shows how you think.
