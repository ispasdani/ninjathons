## Hint

Trying `k = 1, 2, 3, …` can take a billion tries, each going through every book.

## Hint

If you can finish at speed `k`, you can finish at any faster speed. So the speeds that work form a range, and you're looking for where it starts: binary search `k` between 1 and the longest book.

## Hint

At speed `k`, book `i` takes `ceil(pages[i] / k)` hours, which is `(pages[i] + k - 1) / k` in integer division. The total can pass 32 bits at small speeds.
