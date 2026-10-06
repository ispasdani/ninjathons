## Hint

The water above bar i is min(tallest bar to its left, tallest bar to its right) − height[i], or 0 if that's negative.

## Hint

Precomputing the tallest bar to the left and to the right of every position gives an O(n) solution with two extra arrays.

## Hint

With two pointers you need no extra arrays: always move the side with the lower maximum, because that maximum decides its water level. Use a 64-bit total.
