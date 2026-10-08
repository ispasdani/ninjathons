A matrix is a grid of numbers stored as a list of rows: `matrix[r][c]` is row `r`, column `c`. Matrix problems are rarely about clever algorithms; they're about **indices**, and getting them exactly right.

## Rows, columns and loops

```javascript
const rows = matrix.length;
const cols = matrix[0].length;
for (let r = 0; r < rows; r++) {
  for (let c = 0; c < cols; c++) {
    // matrix[r][c]
  }
}
```

```python
rows, cols = len(matrix), len(matrix[0])
for r in range(rows):
    for c in range(cols):
        pass  # matrix[r][c]
```

`r` goes down, `c` goes across. Mixing them up is the most common bug, and on a square matrix it can stay hidden until a test with more columns than rows. Test on a non-square example.

Creating a new matrix needs care in both languages: `[[0] * cols] * rows` in Python and `new Array(rows).fill(new Array(cols))` in JavaScript make every row **the same list**, so changing one changes all. Build each row separately: `[[0] * cols for _ in range(rows)]`, `Array.from({ length: rows }, () => new Array(cols).fill(0))`.

## Where a cell goes: transpose and flip

Most rearrangements are a formula for where each cell ends up.

- **Transpose** (swap rows and columns): `t[c][r] = m[r][c]`. A `rows × cols` matrix becomes `cols × rows`.
- **Flip left to right**: `f[r][c] = m[r][cols - 1 - c]`.
- **Flip upside down**: `f[r][c] = m[rows - 1 - r][c]`.

Combinations of these give every rotation. A quarter turn clockwise is a transpose followed by flipping each row left to right; check it on a 2 × 2 matrix with pen and paper. Rotating *in place*, without a second matrix, works the same way: transpose by swapping `m[r][c]` with `m[c][r]` for `c > r` only (doing every pair would swap them back), then reverse each row.

## Walking a path: boundaries

Some problems walk the matrix in an unusual order: diagonals, zigzags, a spiral. Rather than tracking a direction and a lot of `if`s, keep **boundaries** that shrink as you go. For a zigzag (row 0 left to right, row 1 right to left, and so on):

```python
def zigzag(matrix):
    out = []
    for r, row in enumerate(matrix):
        out.extend(row if r % 2 == 0 else reversed(row))
    return out
```

A spiral is the same idea with four boundaries, `top`, `bottom`, `left` and `right`: walk one side, move that boundary in, turn. The edge case to watch is a single remaining row or column in the middle, which would otherwise be walked twice, once in each direction. Check that the boundaries haven't crossed before each walk back.

## Diagonals

Every cell on the same top-left-to-bottom-right diagonal has the same `r - c`; on the same top-right-to-bottom-left diagonal, the same `r + c`. That turns "check both diagonals" (in noughts and crosses, or the eight-queens puzzle) into a lookup by one number.
