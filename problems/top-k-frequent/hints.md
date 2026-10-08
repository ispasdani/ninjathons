## Hint

First count how often each value appears, with a hash map.

## Hint

Then order the distinct values by count (highest first), breaking ties by value (smallest first), and take the first `k`. A heap of size `k`, or bucketing values by their count, avoids sorting all of them.
