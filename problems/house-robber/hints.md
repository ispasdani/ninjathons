## Hint

Taking every other house (all the even ones, or all the odd ones) isn't always best: sometimes you skip two in a row.

## Hint

Think about the last house. Either you take it, and the house before it is off limits, or you don't, and you have the best for all the houses before it.

## Hint

`best[i] = max(best[i - 1], best[i - 2] + houses[i])`. You only ever need the last two values, so two variables are enough. Trying every choice without remembering results doubles the work with each house.
