## Hint

With only positive values a sliding window works. A negative value breaks it: shrinking the window from the left can make the sum go up.

## Hint

With prefix sums, you want the largest `i < j` with `prefix[i] <= prefix[j] - k`. If an earlier start has a prefix sum at least as large as a later one, the earlier start is never the better choice.

## Hint

Keep a deque of start indices with increasing prefix sums. For each `j`: while the front makes a sum of at least `k`, record the length and pop it (no later `j` can do shorter with it); then pop from the back every index whose prefix sum is at least `prefix[j]`, and push `j`. Prefix sums can pass 32 bits.
