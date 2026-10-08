"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261008)

def grid(r, c):
    return [[rng.randint(-1000, 1000) for _ in range(c)] for _ in range(r)]
tests = [{"matrix": m} for m in [[[1]], [[1, 2]], [[1], [2]], [[1, 2], [3, 4]], [[1, 2, 3]], [[1, 2], [3, 4], [5, 6]]]]
for r, c in [(2, 5), (5, 2), (3, 3), (4, 4), (1, 7), (7, 1), (6, 3)]:
    tests.append({"matrix": grid(r, c)})
tests.append({"matrix": grid(200, 200)})
tests.append({"matrix": grid(200, 37)})
print(json.dumps(tests))
