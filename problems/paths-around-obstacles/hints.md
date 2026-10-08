## Hint

The number of paths grows exponentially with the grid's size, so you can't walk them one by one.

## Hint

Every path into a cell comes from the cell above it or the cell to its left. So the number of paths to a cell is the sum of the paths to those two, or 0 if the cell is an obstacle.

## Hint

Fill the counts row by row, taking the remainder modulo 1,000,000,007 as you add. Be careful with the first row and column: after an obstacle there, nothing further along can be reached. One row of counts is enough memory.
