## Hint

The bigger `d` is, the smaller the sum. So once some `d` works, every bigger one works too: the answer is the point where "too small" turns into "works".

## Hint

Binary search on `d` between 1 and the largest number in `nums` (where every division gives 1). For each middle value, compute the sum in one pass and move the bounds.

## Hint

Rounding up without floating point: `Math.floor((x + d - 1) / d)`, or `(x + d - 1) // d` in Python.
