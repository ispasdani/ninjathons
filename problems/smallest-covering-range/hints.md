## Hint

Take one number from each list: the range that covers them runs from the smallest to the largest. To make it smaller, the only useful move is to replace the smallest one with the next number from its list.

## Hint

Keep the current number of every list in a min-heap, and remember the largest of them. Each step, the range is `[heap top, largest]`; then pop the top, push the next number from its list, and update the largest. Stop when a list runs out.

## Hint

On a tie in width keep the earlier range, which has the smaller `a`. Widths go up to `2 × 10^9`, past a 32-bit integer.
