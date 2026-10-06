## Hint

Scanning `nums` for every query is up to 10 billion steps in total.

## Hint

Compare the query with the middle element. Because `nums` is sorted, that tells you which half can still contain it.

## Hint

Keep a range [lo, hi] and halve it each step until the value is found or the range is empty.
