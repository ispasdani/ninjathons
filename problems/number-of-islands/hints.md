## Hint

Each time you find a land cell you haven't visited, you've found a new island.

## Hint

From that cell, visit all the land connected to it (breadth-first or depth-first) and mark it, so it isn't counted again.

## Hint

On a 300 × 300 grid an island can have 45,000 cells. Recursive depth-first search can overflow the stack, especially in Python; a queue or an explicit stack is safer.
