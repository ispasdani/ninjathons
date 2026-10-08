## Hint

Write a binary search for the first index whose value is at least `target` (a *lower bound*). If that index is past the end, or its value isn't `target`, the answer is `[-1, -1]`.

## Hint

The last occurrence is one before the first index whose value is greater than `target`: the same search with `>` in place of `>=`.
