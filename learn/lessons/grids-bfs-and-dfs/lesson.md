A grid (a maze, a map, a game board) is a graph in disguise: every cell is a point, joined to its neighbours up, down, left and right. Two ways of exploring it answer most grid questions: **depth-first search** (DFS) to visit everything connected, and **breadth-first search** (BFS) to find shortest paths.

## Neighbours

Write the four directions once and loop over them, checking the edges of the grid:

```javascript
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
for (const [dr, dc] of DIRS) {
  const nr = r + dr, nc = c + dc;
  if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue; // off the grid
  // (nr, nc) is a neighbour
}
```

```python
for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
    nr, nc = r + dr, c + dc
    if 0 <= nr < rows and 0 <= nc < cols:
        pass  # (nr, nc) is a neighbour
```

## Flood fill: visit everything connected

The paint bucket in a drawing program fills every cell connected to the one you click. Start there, and keep a stack of cells to visit; mark each cell as **visited when you add it**, so nothing is added twice:

```python
def fill_size(grid, r, c):
    """How many cells of the same colour are connected to (r, c)."""
    rows, cols = len(grid), len(grid[0])
    colour = grid[r][c]
    seen = {(r, c)}
    stack = [(r, c)]
    while stack:
        r, c = stack.pop()
        for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
            if 0 <= nr < rows and 0 <= nc < cols and (nr, nc) not in seen and grid[nr][nc] == colour:
                seen.add((nr, nc))
                stack.append((nr, nc))
    return len(seen)
```

Each cell is visited once: O(rows × cols).

DFS is often written recursively, and that reads nicely, but a 300 × 300 grid can be a single winding path of 90,000 cells, 90,000 calls deep. That overflows the call stack in Python (its default limit is 1,000) and often in JavaScript too. A loop with your own stack, as above, never does.

**Counting regions** is flood fill in a loop: go over every cell, and each time you find one that's land and not yet visited, that's a new region. Count it, then flood-fill it so its cells aren't counted again.

## BFS: shortest paths in steps

DFS visits everything, in no useful order. BFS explores in **rings**: first every cell one step away, then two, then three. So the first time it reaches a cell is by a shortest path. The only change is a **queue** (first in, first out) instead of a stack, and remembering each cell's distance:

```javascript
function stepsTo(grid, start, goal) {
  const rows = grid.length, cols = grid[0].length;
  const dist = grid.map((row) => row.map(() => -1));
  dist[start[0]][start[1]] = 0;
  const queue = [start];
  for (let head = 0; head < queue.length; head++) { // a moving head instead of shift(), which is O(n)
    const [r, c] = queue[head];
    if (r === goal[0] && c === goal[1]) return dist[r][c];
    for (const [nr, nc] of [[r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]]) {
      if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;
      if (grid[nr][nc] === "#" || dist[nr][nc] !== -1) continue; // wall or seen
      dist[nr][nc] = dist[r][c] + 1;
      queue.push([nr, nc]);
    }
  }
  return -1; // unreachable
}
```

In Python use `collections.deque` and `popleft()`; `list.pop(0)` is O(n).

BFS finds the fewest **steps**. When steps cost different amounts (rough terrain, weighted roads), it no longer gives the cheapest path, and you need Dijkstra's algorithm, from the Graphs module.

## Grids as strings

Grids often arrive as a list of strings, one per row: `grid[r][c]` reads a character just the same. Strings can't be changed, so keep visited cells in a separate set or array rather than editing the grid. Or turn each row into a list first, if marking cells in place is simpler.
