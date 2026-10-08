## Hint

Adding up each range on its own is up to 100,000 × 100,000 steps.

## Hint

If you knew the sum of the first `i` numbers for every `i`, how would you get the sum of a range from two of them?

## Hint

Build `prefix` with `prefix[0] = 0` and `prefix[i + 1] = prefix[i] + nums[i]`. The sum of `[left, right]` is `prefix[right + 1] - prefix[left]`.
