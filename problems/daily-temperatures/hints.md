## Hint

Looking ahead from every day is O(n²) when temperatures keep falling.

## Hint

Keep a stack of days still waiting for a warmer one. Their temperatures are decreasing from bottom to top.

## Hint

On each new day, pop every waiting day that is colder and record the gap; then push today.
