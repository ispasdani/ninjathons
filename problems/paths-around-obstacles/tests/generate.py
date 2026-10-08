"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261029)


def grid(rows, cols, density, keep_ends=True):
    cells = [["#" if rng.random() < density else "." for _ in range(cols)] for _ in range(rows)]
    if keep_ends:
        cells[0][0] = "."
        cells[-1][-1] = "."
    return {"grid": ["".join(row) for row in cells]}


def with_edge_blocks(rows, cols):
    # Obstacles on the first row and column: everything beyond them along
    # that edge is unreachable from the edge itself.
    g = grid(rows, cols, 0.02)
    cells = [list(row) for row in g["grid"]]
    cells[0][cols // 3] = "#"
    cells[rows // 3][0] = "#"
    return {"grid": ["".join(row) for row in cells]}


tests = [
    {"grid": ["."]},
    {"grid": ["#"]},
    {"grid": ["#."]},
    {"grid": [".#"]},
    {"grid": ["....."]},
    {"grid": [".", ".", "#", "."]},
    {"grid": [".#", "#."]},
    grid(5, 5, 0.2),
    grid(18, 18, 0.1),
    with_edge_blocks(50, 60),
    # No obstacles: the count wraps around the modulus many times.
    {"grid": ["." * 1000] * 1000},
    grid(1000, 1000, 0.05),
    grid(1000, 1000, 0.3),
    with_edge_blocks(1000, 1000),
]
print(json.dumps(tests))
