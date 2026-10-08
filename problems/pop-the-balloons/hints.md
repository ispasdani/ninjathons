## Hint

Popping the smallest balloon first sounds sensible but isn't always best, and trying every order is 200! orders.

## Hint

Choosing the **first** balloon to pop leaves two sides whose neighbours keep changing. Choose the **last** one instead: while it's still standing, it walls off its left side from its right side, so the two sides can be solved on their own.

## Hint

Put a 1 at each end. Let `best[l][r]` be the most coins from popping every balloon strictly between positions `l` and `r`. Then `best[l][r] = max over k of best[l][k] + v[l] × v[k] × v[r] + best[k][r]`, with `k` the last one popped. Fill it by increasing gap between `l` and `r`: O(n³).
