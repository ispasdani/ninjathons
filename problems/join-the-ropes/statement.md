You have ropes of lengths `ropes` and want to tie them all into one. Tying two ropes of lengths `a` and `b` costs `a + b` and gives one rope of length `a + b`, which can be tied again later.

Return the smallest total cost to end up with a single rope. With only one rope to begin with, the cost is 0.

The total can be larger than a 32-bit integer.

## Constraints

- `1 <= ropes.length <= 100000`
- `1 <= ropes[i] <= 10^4`
