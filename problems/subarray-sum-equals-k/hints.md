## Hint

Negative numbers are allowed, so a sliding window that shrinks when the sum gets too big doesn't work.

## Hint

The subarray from `i` to `j` sums to `prefix[j + 1] - prefix[i]`. It equals `k` exactly when `prefix[i] = prefix[j + 1] - k`.

## Hint

Walk through the array keeping a running sum, and a hash map counting how many times each running sum has been seen so far (starting with 0 seen once). At each step, add the count of `sum - k` to the answer.
