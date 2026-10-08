## Hint

Count what `t` needs. Then slide a window over `s`: grow it on the right until it has everything, then shrink it from the left while it still does, recording the shortest.

## Hint

Checking "does the window have everything?" by comparing all the counts each step is slow. Keep a single number: how many of the needed characters are still missing, and update it as characters enter and leave.

## Hint

Record a window only when it's strictly shorter than the best so far, so the earliest of equal-length windows wins.
