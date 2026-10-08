You're given `k` lists of integers, each sorted from smallest to largest. Find the smallest range `[a, b]` that contains at least one number from every list.

Range `[a, b]` is smaller than `[c, d]` if `b - a < d - c`, or if they're the same width and `a < c`. Return the smallest range as `[a, b]`.

## Constraints

- `1 <= k <= 10000`
- `1 <= lists[i].length`, and all the lists together hold at most `100000` numbers
- `-10^9 <= lists[i][j] <= 10^9`
- Each list is sorted from smallest to largest.
