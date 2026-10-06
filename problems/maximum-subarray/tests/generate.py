"""Hidden tests. Prints a JSON array of inputs; expected outputs come from the
reference solution. Fixed seed, so the tests never change by accident."""
import json
import random

rng = random.Random(20261006)

n = 100000
tests = [
    {"nums": [-1]},
    {"nums": [-3, -1, -2]},
    {"nums": [0, -1, 0]},
    {"nums": [2, -1, 2]},
    {"nums": [-2, -3, 4, -1, -2, 1, 5, -3]},
    {"nums": [rng.randint(-10000, 10000) for _ in range(1000)]},
    {"nums": [rng.randint(-10000, 10000) for _ in range(n)]},
    {"nums": [rng.randint(-10000, -1) for _ in range(n)]},
    {"nums": [10000] * n},
    {"nums": [rng.randint(-10000, 9000) for _ in range(n)]},
]
print(json.dumps(tests))
