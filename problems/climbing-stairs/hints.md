## Hint

Your last move was either 1 step (from step n − 1) or 2 steps (from step n − 2).

## Hint

So ways(n) = ways(n − 1) + ways(n − 2). Computing that recursively without remembering results repeats the same work exponentially many times.

## Hint

Build the answer upwards from ways(1) = 1 and ways(2) = 2, keeping only the last two values. Use a 64-bit integer: the answer for 75 is over 3 × 10^15.
