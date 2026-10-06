You are in a maze drawn as a grid. Each move takes you one cell up, down, left or right (not diagonally), and you can't walk through walls or leave the grid.

Find the fewest moves from `S` to `E`.

## Input

The first line holds two integers `R` and `C`, the number of rows and columns. Then follow `R` lines of `C` characters each:

- `.` an open cell,
- `#` a wall,
- `S` the start (exactly one),
- `E` the end (exactly one).

## Output

Print the fewest moves from `S` to `E`, or `-1` if `E` can't be reached.

## Constraints

- `1 <= R, C <= 500`
