"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261006)

def maze(rows, cols, walls, ends=None):
    grid = [["#" if rng.random() < walls else "." for _ in range(cols)] for _ in range(rows)]
    (sr, sc), (er, ec) = ends or ((rng.randrange(rows), rng.randrange(cols)), (rng.randrange(rows), rng.randrange(cols)))
    if (sr, sc) == (er, ec):
        er, ec = (sr + 1) % rows, sc if rows > 1 else (sc + 1) % cols
    grid[sr][sc] = "S"
    grid[er][ec] = "E"
    return f"{rows} {cols}\n" + "\n".join("".join(row) for row in grid) + "\n"

def serpentine(size):
    # One long corridor that winds through the whole grid.
    grid = []
    for r in range(size):
        if r % 2 == 0:
            grid.append(["."] * size)
        else:
            row = ["#"] * size
            row[-1 if r % 4 == 1 else 0] = "."
            grid.append(row)
    grid[0][0] = "S"
    grid[size - 1][size - 1 if (size - 1) % 4 == 0 else 0] = "E"
    return f"{size} {size}\n" + "\n".join("".join(row) for row in grid) + "\n"

tests = [
    "1 2\nES\n",
    "2 2\nS#\n#E\n",
    "3 3\nS..\n.#.\n..E\n",
    "3 3\nS#E\n.#.\n...\n",
    maze(10, 10, 0.2),
    maze(50, 80, 0.3),
    maze(500, 500, 0.25, ((0, 0), (499, 499))),
    maze(500, 500, 0.45, ((0, 0), (499, 499))),
    maze(500, 500, 0.0, ((0, 0), (499, 499))),
    serpentine(499),
    maze(500, 1, 0.0, ((0, 0), (499, 0))),
]
print(json.dumps(tests))
