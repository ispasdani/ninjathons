## Hint

Keep a set of digits seen for each row, each column and each box: 27 sets. Go through the cells once and check all three sets for each digit.

## Hint

The box of cell `(r, c)` is number `Math.floor(r / 3) * 3 + Math.floor(c / 3)`, from 0 to 8.
