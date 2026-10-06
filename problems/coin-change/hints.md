## Hint

Always taking the largest coin that fits doesn't work: with coins [1, 3, 4] and amount 6, it gives 4 + 1 + 1 (three coins) instead of 3 + 3 (two).

## Hint

If you knew the fewest coins for every smaller amount, the answer for amount a is 1 + the best over each coin c of fewest(a − c).

## Hint

Fill a table best[0..amount] from 0 upwards, with best[0] = 0 and "impossible" as a large value.
