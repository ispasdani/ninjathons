"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261008)

def grid(r, c, lo=1, hi=9):
    return [[rng.randint(lo, hi) for _ in range(c)] for _ in range(r)]
def snake(r, c):
    # Walls of 9s with one gap each, alternating sides, so the path winds up and down.
    g = [[1] * c for _ in range(r)]
    for col in range(1, c - 1, 2):
        for row in range(r):
            g[row][col] = 9
        g[0 if (col // 2) % 2 else r - 1][col] = 1
    return g
tests = [{"grid": g} for g in [[[1]], [[9, 1]], [[1], [9]], [[1, 1], [1, 1]], [[1, 9, 9], [1, 9, 9], [1, 1, 1]]]]
for r, c in [(3, 7), (7, 3), (10, 10), (1, 50), (50, 1)]:
    tests.append({"grid": grid(r, c)})
tests.append({"grid": snake(9, 9)})
tests.append({"grid": snake(300, 300)})
tests.append({"grid": grid(300, 300)})
print(json.dumps(tests))
