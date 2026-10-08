## Hint

Trying `r = 0, 1, 2, …` takes up to 95 million steps for one large `x`, and there can be 10,000 of them.

## Hint

If `r × r <= x`, every smaller `r` works too; if it's too big, every larger `r` is too big. A yes/no question that flips once can be binary searched.

## Hint

A floating-point square root rounds: near `2^53` it can be off by one. Binary search `r` between 0 and 94,906,265 with exact integer comparisons, or correct a float guess up or down until `r × r <= x < (r + 1) × (r + 1)`.
