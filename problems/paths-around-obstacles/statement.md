A robot starts in the top-left cell of a grid and wants to reach the bottom-right cell. It can only move one cell right or one cell down at a time, and it can't enter a cell with an obstacle.

The grid is given as rows of text: `.` is an open cell and `#` is an obstacle.

Return how many different paths the robot can take, modulo `1,000,000,007`. If the start or the end has an obstacle, there are 0 paths.

## Constraints

- `1 <= grid.length <= 1000` (rows)
- `1 <= grid[i].length <= 1000` (columns), and every row has the same length
- Each cell is `.` or `#`.
