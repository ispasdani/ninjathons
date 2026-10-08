## Hint

Adding every booking to each of its flights is up to 100,000 × 100,000 steps.

## Hint

Instead of writing a booking into every flight, mark only where it starts and where it stops.

## Hint

Keep an array `diff` of length `n + 1`. For each booking add `seats` at `diff[first - 1]` and subtract it at `diff[last]`. The running sum of `diff` is the answer.
