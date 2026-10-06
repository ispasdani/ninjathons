## Hint

The elements don't have to be next to each other: in [0, 8, 4, 12, 2] the answer [0, 4, 12] skips 8 and 2.

## Hint

Keep tails[k] = the smallest possible last value of an increasing subsequence of length k + 1. tails is always sorted.

## Hint

For each x, binary-search tails for the first value >= x and replace it with x (or append x if there is none). The answer is the length of tails.
